import { pool } from '../database/connection';

export interface FeaturedRecipeIngredient {
  name: string;
  quantityUsed: number;
  unit: string;
  purchaseQuantity: number;
  purchasePrice: number;
}

export interface FeaturedRecipe {
  id: string;
  name: string;
  yield: number;
  profitMargin: number;
  isActive: boolean;
  sortOrder: number;
  ingredients: FeaturedRecipeIngredient[];
  createdAt: string;
}

export class PostgresFeaturedRecipeRepository {
  async findAll(): Promise<FeaturedRecipe[]> {
    const recipes = await pool.query('SELECT * FROM featured_recipes ORDER BY sort_order, created_at DESC');
    const result: FeaturedRecipe[] = [];
    for (const row of recipes.rows) {
      const ingredients = await this.getIngredients(row.id as string);
      result.push(this.mapRow(row, ingredients));
    }
    return result;
  }

  async findActive(): Promise<FeaturedRecipe[]> {
    const recipes = await pool.query('SELECT * FROM featured_recipes WHERE is_active = TRUE ORDER BY sort_order');
    const result: FeaturedRecipe[] = [];
    for (const row of recipes.rows) {
      const ingredients = await this.getIngredients(row.id as string);
      result.push(this.mapRow(row, ingredients));
    }
    return result;
  }

  async create(data: {
    name: string;
    yield: number;
    profitMargin: number;
    isActive: boolean;
    sortOrder: number;
    ingredients: FeaturedRecipeIngredient[];
  }): Promise<FeaturedRecipe> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO featured_recipes (name, yield, profit_margin, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.name, data.yield, data.profitMargin, data.isActive, data.sortOrder]
      );
      const recipeId = res.rows[0].id;
      const ingredients = await this.saveIngredients(client, recipeId, data.ingredients);
      await client.query('COMMIT');
      return this.mapRow(res.rows[0], ingredients);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async update(id: string, data: Partial<{
    name: string;
    yield: number;
    profitMargin: number;
    isActive: boolean;
    sortOrder: number;
    ingredients: FeaturedRecipeIngredient[];
  }>): Promise<FeaturedRecipe | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `UPDATE featured_recipes SET
          name = COALESCE($2, name),
          yield = COALESCE($3, yield),
          profit_margin = COALESCE($4, profit_margin),
          is_active = COALESCE($5, is_active),
          sort_order = COALESCE($6, sort_order)
         WHERE id = $1 RETURNING *`,
        [id, data.name ?? null, data.yield ?? null, data.profitMargin ?? null, data.isActive ?? null, data.sortOrder ?? null]
      );
      if (res.rows.length === 0) { await client.query('ROLLBACK'); return null; }

      let ingredients: FeaturedRecipeIngredient[];
      if (data.ingredients) {
        ingredients = await this.saveIngredients(client, id, data.ingredients);
      } else {
        ingredients = await this.getIngredients(id);
      }
      await client.query('COMMIT');
      return this.mapRow(res.rows[0], ingredients);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM featured_recipes WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private async getIngredients(recipeId: string): Promise<FeaturedRecipeIngredient[]> {
    const res = await pool.query(
      'SELECT * FROM featured_recipe_ingredients WHERE recipe_id = $1 ORDER BY name',
      [recipeId]
    );
    return res.rows.map(r => ({
      name: r.name as string,
      quantityUsed: parseFloat(r.quantity_used as string),
      unit: r.unit as string,
      purchaseQuantity: parseFloat(r.purchase_quantity as string),
      purchasePrice: parseFloat(r.purchase_price as string),
    }));
  }

  private async saveIngredients(client: any, recipeId: string, ingredients: FeaturedRecipeIngredient[]): Promise<FeaturedRecipeIngredient[]> {
    await client.query('DELETE FROM featured_recipe_ingredients WHERE recipe_id = $1', [recipeId]);
    for (const ing of ingredients) {
      await client.query(
        `INSERT INTO featured_recipe_ingredients (recipe_id, name, quantity_used, unit, purchase_quantity, purchase_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [recipeId, ing.name, ing.quantityUsed, ing.unit, ing.purchaseQuantity, ing.purchasePrice]
      );
    }
    return ingredients;
  }

  private mapRow(row: Record<string, unknown>, ingredients: FeaturedRecipeIngredient[]): FeaturedRecipe {
    return {
      id: row.id as string,
      name: row.name as string,
      yield: row.yield as number,
      profitMargin: parseFloat(row.profit_margin as string),
      isActive: row.is_active as boolean,
      sortOrder: row.sort_order as number,
      ingredients,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
