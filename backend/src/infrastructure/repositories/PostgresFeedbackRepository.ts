import { pool } from '../database/connection';

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  rating: number;
  status: 'pending' | 'read' | 'replied';
  reply: string | null;
  createdAt: string;
}

export class PostgresFeedbackRepository {
  async findAll(): Promise<Feedback[]> {
    const result = await pool.query('SELECT * FROM feedbacks ORDER BY created_at DESC');
    return result.rows.map(this.mapRow);
  }

  async create(data: { userId: string; userName: string; userEmail: string; message: string; rating: number }): Promise<Feedback> {
    const result = await pool.query(
      `INSERT INTO feedbacks (user_id, user_name, user_email, message, rating) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.userId, data.userName, data.userEmail, data.message, data.rating]
    );
    return this.mapRow(result.rows[0]);
  }

  async updateStatus(id: string, status: Feedback['status']): Promise<Feedback | null> {
    const result = await pool.query(
      `UPDATE feedbacks SET status = $2 WHERE id = $1 RETURNING *`,
      [id, status]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async reply(id: string, reply: string): Promise<Feedback | null> {
    const result = await pool.query(
      `UPDATE feedbacks SET reply = $2, status = 'replied' WHERE id = $1 RETURNING *`,
      [id, reply]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): Feedback {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      userName: (row.user_name as string) ?? '',
      userEmail: (row.user_email as string) ?? '',
      message: row.message as string,
      rating: row.rating as number,
      status: row.status as Feedback['status'],
      reply: (row.reply as string) ?? null,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
