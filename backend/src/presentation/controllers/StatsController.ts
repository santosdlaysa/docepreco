import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { AuthRequest } from '../middleware/authMiddleware';

export class StatsController {
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const [recipesResult, ingredientsResult, monthSalesResult] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM recipes WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*) FROM ingredients WHERE user_id = $1', [userId]),
        pool.query(`
          SELECT
            COUNT(*) as count,
            COALESCE(SUM(total_revenue), 0) as revenue
          FROM sales
          WHERE user_id = $1 AND DATE_TRUNC('month', sale_date) = DATE_TRUNC('month', CURRENT_DATE)
        `, [userId]),
      ]);

      const recentSales = await pool.query(`
        SELECT s.id, s.quantity_sold, s.sale_price, s.total_revenue, s.sale_date, r.name as recipe_name
        FROM sales s
        JOIN recipes r ON r.id = s.recipe_id
        WHERE s.user_id = $1
        ORDER BY s.sale_date DESC, s.created_at DESC
        LIMIT 5
      `, [userId]);

      res.json({
        success: true,
        data: {
          recipesCount: parseInt(recipesResult.rows[0].count),
          ingredientsCount: parseInt(ingredientsResult.rows[0].count),
          monthlySalesCount: parseInt(monthSalesResult.rows[0].count),
          monthlyRevenue: parseFloat(monthSalesResult.rows[0].revenue),
          recentSales: recentSales.rows.map(r => ({
            id: r.id,
            recipeName: r.recipe_name,
            quantitySold: parseInt(r.quantity_sold),
            salePrice: parseFloat(r.sale_price),
            totalRevenue: parseFloat(r.total_revenue),
            saleDate: (r.sale_date as Date).toISOString().split('T')[0],
          })),
        },
      });
    } catch (error) {
      console.error('[StatsController] Error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
