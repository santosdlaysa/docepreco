import { pool } from '../database/connection';

export interface RecipeCategory {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export class PostgresCategoryRepository {
  async findAll(): Promise<RecipeCategory[]> {
    const result = await pool.query('SELECT * FROM recipe_categories ORDER BY sort_order, name');
    return result.rows.map(this.mapRow);
  }

  async findActive(): Promise<RecipeCategory[]> {
    const result = await pool.query('SELECT * FROM recipe_categories WHERE is_active = TRUE ORDER BY sort_order');
    return result.rows.map(this.mapRow);
  }

  async create(data: { name: string; icon: string; sortOrder: number; isActive: boolean }): Promise<RecipeCategory> {
    const result = await pool.query(
      `INSERT INTO recipe_categories (name, icon, sort_order, is_active) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.icon ?? '', data.sortOrder, data.isActive]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<{ name: string; icon: string; sortOrder: number; isActive: boolean }>): Promise<RecipeCategory | null> {
    const result = await pool.query(
      `UPDATE recipe_categories SET
        name = COALESCE($2, name),
        icon = COALESCE($3, icon),
        sort_order = COALESCE($4, sort_order),
        is_active = COALESCE($5, is_active)
       WHERE id = $1 RETURNING *`,
      [id, data.name ?? null, data.icon ?? null, data.sortOrder ?? null, data.isActive ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM recipe_categories WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): RecipeCategory {
    return {
      id: row.id as string,
      name: row.name as string,
      icon: (row.icon as string) ?? '',
      sortOrder: row.sort_order as number,
      isActive: row.is_active as boolean,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
