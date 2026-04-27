import { pool } from '../database/connection';

export interface GlobalIngredient {
  id: string;
  name: string;
  price: number;
  unit: string;
  packageAmount: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export class PostgresGlobalIngredientRepository {
  async findAll(): Promise<GlobalIngredient[]> {
    const result = await pool.query('SELECT * FROM global_ingredients ORDER BY category, name');
    return result.rows.map(this.mapRow);
  }

  async create(data: { name: string; price: number; unit: string; packageAmount: number; category: string }): Promise<GlobalIngredient> {
    const result = await pool.query(
      `INSERT INTO global_ingredients (name, price, unit, package_amount, category) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.name, data.price, data.unit, data.packageAmount, data.category ?? '']
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<{ name: string; price: number; unit: string; packageAmount: number; category: string }>): Promise<GlobalIngredient | null> {
    const result = await pool.query(
      `UPDATE global_ingredients SET
        name = COALESCE($2, name),
        price = COALESCE($3, price),
        unit = COALESCE($4, unit),
        package_amount = COALESCE($5, package_amount),
        category = COALESCE($6, category),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, data.name ?? null, data.price ?? null, data.unit ?? null, data.packageAmount ?? null, data.category ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM global_ingredients WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): GlobalIngredient {
    return {
      id: row.id as string,
      name: row.name as string,
      price: parseFloat(row.price as string),
      unit: row.unit as string,
      packageAmount: parseFloat(row.package_amount as string),
      category: (row.category as string) ?? '',
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
    };
  }
}
