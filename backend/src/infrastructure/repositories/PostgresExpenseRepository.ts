import { pool } from '../database/connection';
import { Expense, CreateExpenseDTO } from '../../domain/entities/Expense';

function mapRow(row: any): Expense {
  return {
    id: row.id,
    userId: row.user_id,
    description: row.description,
    amount: parseFloat(row.amount),
    category: row.category,
    costType: row.cost_type,
    isRecurring: row.is_recurring,
    recurrenceDay: row.recurrence_day,
    expenseDate: row.expense_date instanceof Date
      ? row.expense_date.toISOString().split('T')[0]
      : String(row.expense_date).slice(0, 10),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresExpenseRepository {
  async findAll(userId: string, month?: string): Promise<Expense[]> {
    let query = `SELECT * FROM expenses WHERE user_id = $1`;
    const params: any[] = [userId];
    if (month) {
      query += ` AND TO_CHAR(expense_date, 'YYYY-MM') = $2`;
      params.push(month);
    }
    query += ` ORDER BY expense_date DESC, created_at DESC`;
    const res = await pool.query(query, params);
    return res.rows.map(mapRow);
  }

  async findById(id: string, userId: string): Promise<Expense | null> {
    const res = await pool.query(
      `SELECT * FROM expenses WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return res.rows[0] ? mapRow(res.rows[0]) : null;
  }

  async create(data: CreateExpenseDTO, userId: string): Promise<Expense> {
    const res = await pool.query(
      `INSERT INTO expenses (user_id, description, amount, category, cost_type, is_recurring, recurrence_day, expense_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, data.description, data.amount, data.category, data.costType,
       data.isRecurring, data.recurrenceDay ?? null, data.expenseDate, data.notes ?? null]
    );
    return mapRow(res.rows[0]);
  }

  async update(id: string, userId: string, data: Partial<CreateExpenseDTO>): Promise<Expense | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (data.description !== undefined) { fields.push(`description = $${i++}`); params.push(data.description); }
    if (data.amount !== undefined)      { fields.push(`amount = $${i++}`);      params.push(data.amount); }
    if (data.category !== undefined)    { fields.push(`category = $${i++}`);    params.push(data.category); }
    if (data.costType !== undefined)    { fields.push(`cost_type = $${i++}`);   params.push(data.costType); }
    if (data.isRecurring !== undefined) { fields.push(`is_recurring = $${i++}`); params.push(data.isRecurring); }
    if (data.recurrenceDay !== undefined) { fields.push(`recurrence_day = $${i++}`); params.push(data.recurrenceDay); }
    if (data.expenseDate !== undefined) { fields.push(`expense_date = $${i++}`); params.push(data.expenseDate); }
    if (data.notes !== undefined)       { fields.push(`notes = $${i++}`);       params.push(data.notes); }

    if (fields.length === 0) return this.findById(id, userId);

    fields.push(`updated_at = NOW()`);
    params.push(id, userId);

    const res = await pool.query(
      `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${i++} AND user_id = $${i} RETURNING *`,
      params
    );
    return res.rows[0] ? mapRow(res.rows[0]) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM expenses WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async getSummary(userId: string, month: string): Promise<{ totalExpenses: number; byCategory: { category: string; total: number }[] }> {
    const [totalRes, catRes] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = $1 AND TO_CHAR(expense_date, 'YYYY-MM') = $2`,
        [userId, month]
      ),
      pool.query(
        `SELECT category, SUM(amount) AS total FROM expenses WHERE user_id = $1 AND TO_CHAR(expense_date, 'YYYY-MM') = $2 GROUP BY category ORDER BY total DESC`,
        [userId, month]
      ),
    ]);
    return {
      totalExpenses: parseFloat(totalRes.rows[0].total),
      byCategory: catRes.rows.map(r => ({ category: r.category, total: parseFloat(r.total) })),
    };
  }
}
