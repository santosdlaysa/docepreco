import { pool } from '../database/connection';
import { Ingredient, CreateIngredientDTO } from '../../domain/entities/Ingredient';
import { IIngredientRepository } from '../../domain/repositories/IIngredientRepository';

export class PostgresIngredientRepository implements IIngredientRepository {
  async findAll(userId: string): Promise<Ingredient[]> {
    const result = await pool.query(
      'SELECT * FROM ingredients WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    return result.rows.map(this.mapRow);
  }

  async findById(id: string, userId: string): Promise<Ingredient | null> {
    const result = await pool.query(
      'SELECT * FROM ingredients WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findByIds(ids: string[]): Promise<Ingredient[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `SELECT * FROM ingredients WHERE id IN (${placeholders})`,
      ids
    );
    return result.rows.map(this.mapRow);
  }

  async findByName(name: string, userId: string, excludeId?: string): Promise<Ingredient | null> {
    const query = excludeId
      ? 'SELECT * FROM ingredients WHERE LOWER(name) = LOWER($1) AND user_id = $2 AND id != $3 LIMIT 1'
      : 'SELECT * FROM ingredients WHERE LOWER(name) = LOWER($1) AND user_id = $2 LIMIT 1';
    const params = excludeId ? [name, userId, excludeId] : [name, userId];
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(data: CreateIngredientDTO, userId: string): Promise<Ingredient> {
    const result = await pool.query(
      `INSERT INTO ingredients (user_id, name, purchase_quantity, purchase_price, unit)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, data.name, data.purchaseQuantity, data.purchasePrice, data.unit]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<CreateIngredientDTO>, userId: string): Promise<Ingredient | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.purchaseQuantity !== undefined) { fields.push(`purchase_quantity = $${idx++}`); values.push(data.purchaseQuantity); }
    if (data.purchasePrice !== undefined) { fields.push(`purchase_price = $${idx++}`); values.push(data.purchasePrice); }
    if (data.unit !== undefined) { fields.push(`unit = $${idx++}`); values.push(data.unit); }

    if (fields.length === 0) return this.findById(id, userId);

    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(userId);

    const result = await pool.query(
      `UPDATE ingredients SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM ingredients WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): Ingredient {
    return {
      id: row.id as string,
      name: row.name as string,
      purchaseQuantity: parseFloat(row.purchase_quantity as string),
      purchasePrice: parseFloat(row.purchase_price as string),
      unit: row.unit as Ingredient['unit'],
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
