import { pool } from '../database/connection';

export interface FeaturedRecipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  category: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export class PostgresFeaturedRecipeRepository {
  async findAll(): Promise<FeaturedRecipe[]> {
    const result = await pool.query('SELECT * FROM featured_recipes ORDER BY sort_order, created_at DESC');
    return result.rows.map(this.mapRow);
  }

  async findActive(): Promise<FeaturedRecipe[]> {
    const result = await pool.query('SELECT * FROM featured_recipes WHERE is_active = TRUE ORDER BY sort_order');
    return result.rows.map(this.mapRow);
  }

  async create(data: { name: string; description: string; imageUrl?: string | null; category: string; isActive: boolean; sortOrder: number }): Promise<FeaturedRecipe> {
    const result = await pool.query(
      `INSERT INTO featured_recipes (name, description, image_url, category, is_active, sort_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.name, data.description, data.imageUrl ?? null, data.category ?? '', data.isActive, data.sortOrder]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<{ name: string; description: string; imageUrl: string | null; category: string; isActive: boolean; sortOrder: number }>): Promise<FeaturedRecipe | null> {
    const result = await pool.query(
      `UPDATE featured_recipes SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        image_url = COALESCE($4, image_url),
        category = COALESCE($5, category),
        is_active = COALESCE($6, is_active),
        sort_order = COALESCE($7, sort_order)
       WHERE id = $1 RETURNING *`,
      [id, data.name ?? null, data.description ?? null, data.imageUrl !== undefined ? data.imageUrl : null, data.category ?? null, data.isActive ?? null, data.sortOrder ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM featured_recipes WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): FeaturedRecipe {
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) ?? '',
      imageUrl: (row.image_url as string) ?? null,
      category: (row.category as string) ?? '',
      isActive: row.is_active as boolean,
      sortOrder: row.sort_order as number,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
