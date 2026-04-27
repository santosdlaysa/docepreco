import { pool } from '../database/connection';

export interface TelegramAlert {
  id: string;
  key: string;
  label: string;
  description: string;
  isEnabled: boolean;
  category: string;
  messageTemplate: string | null;
  createdAt: string;
}

export class PostgresTelegramAlertRepository {
  async findAll(): Promise<TelegramAlert[]> {
    const result = await pool.query('SELECT * FROM telegram_alerts ORDER BY category, key');
    return result.rows.map(this.mapRow);
  }

  async isEnabled(key: string): Promise<boolean> {
    const result = await pool.query('SELECT is_enabled FROM telegram_alerts WHERE key = $1', [key]);
    if (result.rows.length === 0) return true; // default enabled if not found
    return result.rows[0].is_enabled as boolean;
  }

  async create(data: { key: string; label: string; description: string; isEnabled: boolean; category: string; messageTemplate?: string }): Promise<TelegramAlert> {
    const result = await pool.query(
      `INSERT INTO telegram_alerts (key, label, description, is_enabled, category, message_template) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.key, data.label, data.description, data.isEnabled, data.category ?? 'alerts', data.messageTemplate ?? null]
    );
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM telegram_alerts WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getTemplate(key: string): Promise<string | null> {
    const result = await pool.query('SELECT message_template FROM telegram_alerts WHERE key = $1', [key]);
    if (result.rows.length === 0) return null;
    return (result.rows[0].message_template as string) ?? null;
  }

  async update(id: string, data: Partial<{ label: string; description: string; isEnabled: boolean; messageTemplate: string }>): Promise<TelegramAlert | null> {
    const result = await pool.query(
      `UPDATE telegram_alerts SET
        label = COALESCE($2, label),
        description = COALESCE($3, description),
        is_enabled = COALESCE($4, is_enabled),
        message_template = COALESCE($5, message_template)
       WHERE id = $1 RETURNING *`,
      [id, data.label ?? null, data.description ?? null, data.isEnabled ?? null, data.messageTemplate ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): TelegramAlert {
    return {
      id: row.id as string,
      key: row.key as string,
      label: row.label as string,
      description: (row.description as string) ?? '',
      isEnabled: row.is_enabled as boolean,
      category: (row.category as string) ?? 'alerts',
      messageTemplate: (row.message_template as string) ?? null,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
