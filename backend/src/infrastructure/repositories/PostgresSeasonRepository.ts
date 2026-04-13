import { pool } from '../database/connection';

export interface Season {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  createdAt: string;
}

export class PostgresSeasonRepository {
  async findAll(userId: string): Promise<Season[]> {
    const result = await pool.query(
      'SELECT * FROM seasons WHERE user_id = $1 ORDER BY start_date ASC',
      [userId]
    );
    return result.rows.map(this.mapRow);
  }

  async findActive(userId: string): Promise<Season | null> {
    const result = await pool.query(
      `SELECT * FROM seasons
       WHERE user_id = $1 AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
       ORDER BY start_date DESC
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(userId: string, data: { name: string; startDate: string; endDate: string; multiplier: number }): Promise<Season> {
    const result = await pool.query(
      'INSERT INTO seasons (user_id, name, start_date, end_date, multiplier) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, data.name, data.startDate, data.endDate, data.multiplier]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, userId: string, data: { name?: string; startDate?: string; endDate?: string; multiplier?: number }): Promise<Season | null> {
    const result = await pool.query(
      `UPDATE seasons SET
        name = COALESCE($3, name),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        multiplier = COALESCE($6, multiplier)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, data.name ?? null, data.startDate ?? null, data.endDate ?? null, data.multiplier ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM seasons WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): Season {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      startDate: (row.start_date as Date).toISOString().split('T')[0],
      endDate: (row.end_date as Date).toISOString().split('T')[0],
      multiplier: parseFloat(row.multiplier as string),
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
