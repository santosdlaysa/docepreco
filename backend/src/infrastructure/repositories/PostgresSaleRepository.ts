import { pool } from '../database/connection';
import { Sale, CreateSaleDTO } from '../../domain/entities/Sale';
import { ISaleRepository } from '../../domain/repositories/ISaleRepository';

export class PostgresSaleRepository implements ISaleRepository {
  async findAll(userId: string, startDate?: string): Promise<Sale[]> {
    const params: string[] = [userId];
    let whereClause = 'WHERE s.user_id = $1';
    if (startDate) {
      params.push(startDate);
      whereClause += ` AND s.sale_date >= $2`;
    }
    const result = await pool.query(`
      SELECT s.*, r.name AS recipe_name
      FROM sales s
      JOIN recipes r ON r.id = s.recipe_id
      ${whereClause}
      ORDER BY s.sale_date DESC, s.created_at DESC
    `, params);
    return result.rows.map(this.mapRow);
  }

  async findById(id: string, userId: string): Promise<Sale | null> {
    const result = await pool.query(`
      SELECT s.*, r.name AS recipe_name
      FROM sales s
      JOIN recipes r ON r.id = s.recipe_id
      WHERE s.id = $1 AND s.user_id = $2
    `, [id, userId]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(data: CreateSaleDTO, userId: string): Promise<Sale> {
    const totalRevenue = data.quantitySold * data.salePrice;
    // Vincula a venda ao caixa aberto do usuário (se houver)
    const openSession = await pool.query(
      `SELECT id FROM cash_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1`,
      [userId]
    );
    const sessionId = openSession.rows[0]?.id ?? null;
    const result = await pool.query(`
      INSERT INTO sales (user_id, recipe_id, quantity_sold, sale_price, total_revenue, sale_date, notes, payment_method, session_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [userId, data.recipeId, data.quantitySold, data.salePrice, totalRevenue, data.saleDate, data.notes || null, data.paymentMethod || null, sessionId]);
    return this.findById(result.rows[0].id, userId) as Promise<Sale>;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM sales WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): Sale {
    return {
      id: row.id as string,
      recipeId: row.recipe_id as string,
      recipeName: row.recipe_name as string,
      quantitySold: Number(row.quantity_sold),
      salePrice: parseFloat(row.sale_price as string),
      totalRevenue: parseFloat(row.total_revenue as string),
      saleDate: (row.sale_date as Date).toISOString().split('T')[0],
      notes: row.notes as string | undefined,
      paymentMethod: (row.payment_method as Sale['paymentMethod']) ?? null,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
