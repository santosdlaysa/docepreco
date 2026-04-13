import { pool } from '../database/connection';

export interface RevenueGoal {
  id: string;
  userId: string;
  amount: number;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export class PostgresGoalRepository {
  async findByMonthYear(userId: string, month: number, year: number): Promise<RevenueGoal | null> {
    const result = await pool.query(
      'SELECT * FROM revenue_goals WHERE user_id = $1 AND month = $2 AND year = $3',
      [userId, month, year]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async upsert(userId: string, amount: number, month: number, year: number): Promise<RevenueGoal> {
    const result = await pool.query(
      `INSERT INTO revenue_goals (user_id, amount, month, year)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, month, year)
       DO UPDATE SET amount = EXCLUDED.amount, updated_at = NOW()
       RETURNING *`,
      [userId, amount, month, year]
    );
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): RevenueGoal {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      amount: parseFloat(row.amount as string),
      month: row.month as number,
      year: row.year as number,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
    };
  }
}
