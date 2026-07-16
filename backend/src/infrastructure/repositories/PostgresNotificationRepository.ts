import { pool } from '../database/connection';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  dataJson: string | null;
  target: 'all' | 'premium' | 'free' | 'master' | 'expired';
  scheduledAt: string | null;
  sentAt: string | null;
  status: 'pending' | 'scheduled' | 'sent' | 'failed';
  recipientsCount: number;
  createdAt: string;
}

export class PostgresNotificationRepository {
  async findAll(): Promise<AppNotification[]> {
    const result = await pool.query(
      'SELECT * FROM notifications ORDER BY created_at DESC'
    );
    return result.rows.map(this.mapRow);
  }

  async findPending(): Promise<AppNotification[]> {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE status IN ('pending', 'scheduled')
         AND (scheduled_at IS NULL OR scheduled_at <= NOW())
       ORDER BY created_at ASC`
    );
    return result.rows.map(this.mapRow);
  }

  async findById(id: string): Promise<AppNotification | null> {
    const result = await pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(data: {
    title: string;
    body: string;
    dataJson?: string;
    target?: string;
    scheduledAt?: string;
    status?: string;
  }): Promise<AppNotification> {
    const status = data.scheduledAt ? 'scheduled' : (data.status ?? 'pending');
    const result = await pool.query(
      `INSERT INTO notifications (title, body, data_json, target, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.title,
        data.body,
        data.dataJson ?? null,
        data.target ?? 'all',
        data.scheduledAt ?? null,
        status,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async markSent(id: string, recipientsCount: number): Promise<void> {
    await pool.query(
      `UPDATE notifications SET status = 'sent', sent_at = NOW(), recipients_count = $2 WHERE id = $1`,
      [id, recipientsCount]
    );
  }

  async markFailed(id: string): Promise<void> {
    await pool.query(
      `UPDATE notifications SET status = 'failed' WHERE id = $1`,
      [id]
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): AppNotification {
    return {
      id: row.id as string,
      title: row.title as string,
      body: row.body as string,
      dataJson: (row.data_json as string) ?? null,
      target: row.target as AppNotification['target'],
      scheduledAt: row.scheduled_at ? (row.scheduled_at as Date).toISOString() : null,
      sentAt: row.sent_at ? (row.sent_at as Date).toISOString() : null,
      status: row.status as AppNotification['status'],
      recipientsCount: row.recipients_count as number,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
