import { pool } from '../database/connection';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export class PostgresFaqRepository {
  async findAll(): Promise<FaqItem[]> {
    const result = await pool.query('SELECT * FROM faq_items ORDER BY sort_order, created_at DESC');
    return result.rows.map(this.mapRow);
  }

  async findActive(): Promise<FaqItem[]> {
    const result = await pool.query('SELECT * FROM faq_items WHERE is_active = TRUE ORDER BY sort_order');
    return result.rows.map(this.mapRow);
  }

  async create(data: { question: string; answer: string; category: string; sortOrder: number; isActive: boolean }): Promise<FaqItem> {
    const result = await pool.query(
      `INSERT INTO faq_items (question, answer, category, sort_order, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.question, data.answer, data.category ?? '', data.sortOrder, data.isActive]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<{ question: string; answer: string; category: string; sortOrder: number; isActive: boolean }>): Promise<FaqItem | null> {
    const result = await pool.query(
      `UPDATE faq_items SET
        question = COALESCE($2, question),
        answer = COALESCE($3, answer),
        category = COALESCE($4, category),
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active)
       WHERE id = $1 RETURNING *`,
      [id, data.question ?? null, data.answer ?? null, data.category ?? null, data.sortOrder ?? null, data.isActive ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM faq_items WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): FaqItem {
    return {
      id: row.id as string,
      question: row.question as string,
      answer: row.answer as string,
      category: (row.category as string) ?? '',
      sortOrder: row.sort_order as number,
      isActive: row.is_active as boolean,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
