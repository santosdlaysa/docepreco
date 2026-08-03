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
      SELECT s.*, COALESCE(r.name, s.product_name) AS recipe_name
      FROM sales s
      LEFT JOIN recipes r ON r.id = s.recipe_id
      ${whereClause}
      ORDER BY s.sale_date DESC, s.created_at DESC
    `, params);
    return result.rows.map(this.mapRow);
  }

  async findById(id: string, userId: string): Promise<Sale | null> {
    const result = await pool.query(`
      SELECT s.*, COALESCE(r.name, s.product_name) AS recipe_name
      FROM sales s
      LEFT JOIN recipes r ON r.id = s.recipe_id
      WHERE s.id = $1 AND s.user_id = $2
    `, [id, userId]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(data: CreateSaleDTO, userId: string): Promise<Sale> {
    // Venda com receita: valida a receita para devolver um erro claro em vez
    // do erro cru de foreign key. Venda sem receita (produto da loja online
    // não vinculado) exige o nome do produto para exibição.
    if (data.recipeId) {
      const recipe = await pool.query(
        'SELECT 1 FROM recipes WHERE id = $1 AND user_id = $2',
        [data.recipeId, userId]
      );
      if (recipe.rows.length === 0) {
        throw new Error('Receita não encontrada.');
      }
    } else if (!data.productName?.trim()) {
      throw new Error('Informe a receita ou o nome do produto da venda.');
    }
    const discount = Math.max(0, Math.min(data.discount || 0, data.quantitySold * data.salePrice));
    const totalRevenue = data.quantitySold * data.salePrice - discount;
    // Vincula a venda ao caixa aberto do usuário (se houver)
    const openSession = await pool.query(
      `SELECT id FROM cash_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1`,
      [userId]
    );
    const sessionId = openSession.rows[0]?.id ?? null;
    const result = await pool.query(`
      INSERT INTO sales (user_id, recipe_id, product_name, quantity_sold, sale_price, total_revenue, discount, sale_date, client_name, notes, payment_method, session_id, order_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [userId, data.recipeId || null, data.productName?.trim() || null, data.quantitySold, data.salePrice, totalRevenue, discount, data.saleDate, data.clientName?.trim() || null, data.notes || null, data.paymentMethod || null, sessionId, data.orderId || null]);
    return this.findById(result.rows[0].id, userId) as Promise<Sale>;
  }

  /**
   * Edição de uma venda existente. Recalcula o faturamento a partir de
   * quantidade × preço − desconto e valida a receita (quando informada), igual
   * ao create. Preserva session_id e order_id (não são editáveis pela tela).
   * Retorna null se a venda não existir ou não pertencer ao usuário.
   */
  async update(id: string, data: CreateSaleDTO, userId: string): Promise<Sale | null> {
    if (data.recipeId) {
      const recipe = await pool.query(
        'SELECT 1 FROM recipes WHERE id = $1 AND user_id = $2',
        [data.recipeId, userId]
      );
      if (recipe.rows.length === 0) {
        throw new Error('Receita não encontrada.');
      }
    } else if (!data.productName?.trim()) {
      throw new Error('Informe a receita ou o nome do produto da venda.');
    }
    const discount = Math.max(0, Math.min(data.discount || 0, data.quantitySold * data.salePrice));
    const totalRevenue = data.quantitySold * data.salePrice - discount;
    const result = await pool.query(`
      UPDATE sales SET
        recipe_id = $1, product_name = $2, quantity_sold = $3, sale_price = $4,
        total_revenue = $5, discount = $6, sale_date = $7, client_name = $8,
        notes = $9, payment_method = $10
      WHERE id = $11 AND user_id = $12
    `, [data.recipeId || null, data.productName?.trim() || null, data.quantitySold, data.salePrice, totalRevenue, discount, data.saleDate, data.clientName?.trim() || null, data.notes || null, data.paymentMethod || null, id, userId]);
    if ((result.rowCount ?? 0) === 0) return null;
    return this.findById(id, userId);
  }

  async existsForOrder(orderId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM sales WHERE order_id = $1 AND user_id = $2 LIMIT 1',
      [orderId, userId]
    );
    return result.rows.length > 0;
  }

  async deleteByOrderId(orderId: string, userId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM sales WHERE order_id = $1 AND user_id = $2',
      [orderId, userId]
    );
    return result.rowCount ?? 0;
  }

  /**
   * Versões antigas do app registravam manualmente a venda da encomenda logo
   * após marcá-la como entregue. Como o backend agora cria essa venda sozinho,
   * este método detecta o registro automático recente equivalente para não
   * duplicar a venda enviada pelo cliente antigo.
   */
  async findRecentOrderLinkedDuplicate(recipeId: string, notes: string, userId: string): Promise<Sale | null> {
    const result = await pool.query(`
      SELECT s.*, COALESCE(r.name, s.product_name) AS recipe_name
      FROM sales s
      LEFT JOIN recipes r ON r.id = s.recipe_id
      WHERE s.user_id = $1 AND s.recipe_id = $2 AND s.notes = $3
        AND s.order_id IS NOT NULL
        AND s.created_at > NOW() - INTERVAL '10 minutes'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId, recipeId, notes]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
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
      recipeId: (row.recipe_id as string) ?? null,
      recipeName: (row.recipe_name as string) ?? 'Produto da loja',
      quantitySold: Number(row.quantity_sold),
      salePrice: parseFloat(row.sale_price as string),
      totalRevenue: parseFloat(row.total_revenue as string),
      discount: parseFloat((row.discount as string) ?? '0'),
      saleDate: (row.sale_date as Date).toISOString().split('T')[0],
      clientName: (row.client_name as string) ?? null,
      notes: row.notes as string | undefined,
      paymentMethod: (row.payment_method as Sale['paymentMethod']) ?? null,
      orderId: (row.order_id as string) ?? null,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
