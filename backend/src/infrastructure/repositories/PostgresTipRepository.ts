import { pool } from '../database/connection';

export interface Tip {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: string;
}

export class PostgresTipRepository {
  async findAll(): Promise<Tip[]> {
    const result = await pool.query(
      'SELECT * FROM motivational_tips ORDER BY created_at DESC'
    );
    return result.rows.map(this.mapRow);
  }

  async findActive(): Promise<Tip[]> {
    const result = await pool.query(
      'SELECT * FROM motivational_tips WHERE is_active = TRUE ORDER BY created_at DESC'
    );
    return result.rows.map(this.mapRow);
  }

  async create(message: string): Promise<Tip> {
    const result = await pool.query(
      'INSERT INTO motivational_tips (message) VALUES ($1) RETURNING *',
      [message]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: { message?: string; isActive?: boolean }): Promise<Tip | null> {
    const result = await pool.query(
      `UPDATE motivational_tips SET
        message = COALESCE($2, message),
        is_active = COALESCE($3, is_active)
       WHERE id = $1
       RETURNING *`,
      [id, data.message ?? null, data.isActive ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM motivational_tips WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): Tip {
    return {
      id: row.id as string,
      message: row.message as string,
      isActive: row.is_active as boolean,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
