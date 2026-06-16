import { pool } from '../database/connection';

export interface PriceHistoryEntry {
  id: string;
  userId: string;
  ingredientId: string;
  price: number;
  purchaseQuantity: number;
  unit: string;
  purchaseUnitWeight?: number | null;
  recordedAt: string;
}

export class PostgresPriceHistoryRepository {
  async findByIngredient(userId: string, ingredientId: string): Promise<PriceHistoryEntry[]> {
    const result = await pool.query(
      `SELECT * FROM ingredient_price_history
       WHERE user_id = $1 AND ingredient_id = $2
       ORDER BY recorded_at DESC
       LIMIT 24`,
      [userId, ingredientId]
    );
    return result.rows.map(this.mapRow);
  }

  async add(userId: string, ingredientId: string, data: { price: number; purchaseQuantity: number; unit: string; purchaseUnitWeight?: number; recordedAt?: string }): Promise<PriceHistoryEntry> {
    const result = await pool.query(
      `INSERT INTO ingredient_price_history (user_id, ingredient_id, price, purchase_quantity, unit, purchase_unit_weight, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, ingredientId, data.price, data.purchaseQuantity, data.unit, data.purchaseUnitWeight ?? null, data.recordedAt ?? new Date().toISOString()]
    );
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): PriceHistoryEntry {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      ingredientId: row.ingredient_id as string,
      price: parseFloat(row.price as string),
      purchaseQuantity: parseFloat(row.purchase_quantity as string),
      unit: row.unit as string,
      purchaseUnitWeight: row.purchase_unit_weight ? parseFloat(row.purchase_unit_weight as string) : null,
      recordedAt: (row.recorded_at as Date).toISOString(),
    };
  }
}
