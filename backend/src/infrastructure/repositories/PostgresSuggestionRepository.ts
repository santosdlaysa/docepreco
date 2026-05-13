import { pool } from '../database/connection';

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  status: 'pending' | 'read' | 'done';
  adminNote: string | null;
  createdAt: string;
}

export class PostgresSuggestionRepository {
  async findAll(): Promise<Suggestion[]> {
    const result = await pool.query('SELECT * FROM suggestions ORDER BY created_at DESC');
    return result.rows.map(this.mapRow);
  }

  async create(data: { userId: string; userName: string; userEmail: string; message: string }): Promise<Suggestion> {
    const result = await pool.query(
      `INSERT INTO suggestions (user_id, user_name, user_email, message) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.userId, data.userName, data.userEmail, data.message]
    );
    return this.mapRow(result.rows[0]);
  }

  async updateStatus(id: string, status: Suggestion['status']): Promise<Suggestion | null> {
    const result = await pool.query(
      `UPDATE suggestions SET status = $2 WHERE id = $1 RETURNING *`,
      [id, status]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async addNote(id: string, adminNote: string): Promise<Suggestion | null> {
    const result = await pool.query(
      `UPDATE suggestions SET admin_note = $2 WHERE id = $1 RETURNING *`,
      [id, adminNote]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async remove(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM suggestions WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): Suggestion {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      userName: (row.user_name as string) ?? '',
      userEmail: (row.user_email as string) ?? '',
      message: row.message as string,
      status: row.status as Suggestion['status'],
      adminNote: (row.admin_note as string) ?? null,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
