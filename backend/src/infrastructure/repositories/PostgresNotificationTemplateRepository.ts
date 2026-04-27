import { pool } from '../database/connection';

export interface NotificationTemplate {
  id: string;
  slug: string;
  title: string;
  body: string;
  isActive: boolean;
  scheduleType: 'daily' | 'weekly' | 'interval';
  scheduleHour: number | null;
  scheduleMinute: number | null;
  scheduleWeekday: number | null;
  scheduleIntervalHours: number | null;
  createdAt: string;
  updatedAt: string;
}

export class PostgresNotificationTemplateRepository {
  async findAll(): Promise<NotificationTemplate[]> {
    const result = await pool.query(
      'SELECT * FROM notification_templates ORDER BY slug ASC'
    );
    return result.rows.map(this.mapRow);
  }

  async findActive(): Promise<NotificationTemplate[]> {
    const result = await pool.query(
      'SELECT * FROM notification_templates WHERE is_active = TRUE ORDER BY slug ASC'
    );
    return result.rows.map(this.mapRow);
  }

  async findBySlug(slug: string): Promise<NotificationTemplate | null> {
    const result = await pool.query(
      'SELECT * FROM notification_templates WHERE slug = $1',
      [slug]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async update(
    id: string,
    data: {
      title?: string;
      body?: string;
      isActive?: boolean;
      scheduleType?: string;
      scheduleHour?: number | null;
      scheduleMinute?: number | null;
      scheduleWeekday?: number | null;
      scheduleIntervalHours?: number | null;
    }
  ): Promise<NotificationTemplate | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
    if (data.body !== undefined) { fields.push(`body = $${idx++}`); values.push(data.body); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }
    if (data.scheduleType !== undefined) { fields.push(`schedule_type = $${idx++}`); values.push(data.scheduleType); }
    if (data.scheduleHour !== undefined) { fields.push(`schedule_hour = $${idx++}`); values.push(data.scheduleHour); }
    if (data.scheduleMinute !== undefined) { fields.push(`schedule_minute = $${idx++}`); values.push(data.scheduleMinute); }
    if (data.scheduleWeekday !== undefined) { fields.push(`schedule_weekday = $${idx++}`); values.push(data.scheduleWeekday); }
    if (data.scheduleIntervalHours !== undefined) { fields.push(`schedule_interval_hours = $${idx++}`); values.push(data.scheduleIntervalHours); }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE notification_templates SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): NotificationTemplate {
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      body: row.body as string,
      isActive: row.is_active as boolean,
      scheduleType: (row.schedule_type as string ?? 'daily') as NotificationTemplate['scheduleType'],
      scheduleHour: row.schedule_hour as number | null,
      scheduleMinute: (row.schedule_minute as number) ?? 0,
      scheduleWeekday: row.schedule_weekday as number | null,
      scheduleIntervalHours: row.schedule_interval_hours as number | null,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
    };
  }
}
