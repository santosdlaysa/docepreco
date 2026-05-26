import { pool } from '../database/connection';
import { Recipe, CreateRecipeDTO, RecipeIngredient, AdditionalCost, SubRecipe } from '../../domain/entities/Recipe';
import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';

export class PostgresRecipeRepository implements IRecipeRepository {
  async findAll(userId: string): Promise<Recipe[]> {
    const result = await pool.query(
      'SELECT * FROM recipes WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    const recipes: Recipe[] = [];
    for (const row of result.rows) {
      const recipe = await this.loadRelations(row);
      recipes.push(recipe);
    }
    return recipes;
  }

  async findById(id: string, userId: string): Promise<Recipe | null> {
    const result = await pool.query(
      'SELECT * FROM recipes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) return null;
    return this.loadRelations(result.rows[0]);
  }

  async findByName(name: string, userId: string, excludeId?: string): Promise<Recipe | null> {
    const query = excludeId
      ? 'SELECT * FROM recipes WHERE LOWER(name) = LOWER($1) AND user_id = $2 AND id != $3 LIMIT 1'
      : 'SELECT * FROM recipes WHERE LOWER(name) = LOWER($1) AND user_id = $2 LIMIT 1';
    const params = excludeId ? [name, userId, excludeId] : [name, userId];
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return null;
    return this.loadRelations(result.rows[0]);
  }

  async create(data: CreateRecipeDTO, userId: string): Promise<Recipe> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const recipeResult = await client.query(
        `INSERT INTO recipes (user_id, name, yield, profit_margin) VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, data.name, data.yield, data.profitMargin]
      );
      const recipe = recipeResult.rows[0];

      for (const ing of data.ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_used, unit) VALUES ($1, $2, $3, $4)`,
          [recipe.id, ing.ingredientId, ing.quantityUsed, ing.unit]
        );
      }

      for (const cost of data.additionalCosts) {
        await client.query(
          `INSERT INTO recipe_additional_costs (recipe_id, name, value) VALUES ($1, $2, $3)`,
          [recipe.id, cost.name, cost.value]
        );
      }

      if (data.subRecipes) {
        for (const sub of data.subRecipes) {
          await client.query(
            `INSERT INTO recipe_sub_recipes (recipe_id, sub_recipe_id, quantity_used) VALUES ($1, $2, $3)`,
            [recipe.id, sub.subRecipeId, sub.quantityUsed]
          );
        }
      }

      await client.query('COMMIT');
      return this.findById(recipe.id, userId) as Promise<Recipe>;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(id: string, data: Partial<CreateRecipeDTO>, userId: string): Promise<Recipe | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
      if (data.yield !== undefined) { fields.push(`yield = $${idx++}`); values.push(data.yield); }
      if (data.profitMargin !== undefined) { fields.push(`profit_margin = $${idx++}`); values.push(data.profitMargin); }

      if (fields.length > 0) {
        fields.push(`updated_at = NOW()`);
        values.push(id);
        values.push(userId);
        await client.query(
          `UPDATE recipes SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1}`,
          values
        );
      }

      if (data.ingredients !== undefined) {
        await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
        for (const ing of data.ingredients) {
          await client.query(
            `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_used, unit) VALUES ($1, $2, $3, $4)`,
            [id, ing.ingredientId, ing.quantityUsed, ing.unit]
          );
        }
      }

      if (data.additionalCosts !== undefined) {
        await client.query('DELETE FROM recipe_additional_costs WHERE recipe_id = $1', [id]);
        for (const cost of data.additionalCosts) {
          await client.query(
            `INSERT INTO recipe_additional_costs (recipe_id, name, value) VALUES ($1, $2, $3)`,
            [id, cost.name, cost.value]
          );
        }
      }

      if (data.subRecipes !== undefined) {
        await client.query('DELETE FROM recipe_sub_recipes WHERE recipe_id = $1', [id]);
        for (const sub of data.subRecipes) {
          await client.query(
            `INSERT INTO recipe_sub_recipes (recipe_id, sub_recipe_id, quantity_used) VALUES ($1, $2, $3)`,
            [id, sub.subRecipeId, sub.quantityUsed]
          );
        }
      }

      await client.query('COMMIT');
      return this.findById(id, userId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM recipes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private async loadRelations(row: Record<string, unknown>): Promise<Recipe> {
    const ingredientsResult = await pool.query(
      `SELECT ri.*, i.name AS ingredient_name
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = $1`,
      [row.id]
    );
    const costsResult = await pool.query(
      'SELECT * FROM recipe_additional_costs WHERE recipe_id = $1',
      [row.id]
    );
    const subRecipesResult = await pool.query(
      `SELECT sr.*, r.name AS sub_recipe_name
       FROM recipe_sub_recipes sr
       JOIN recipes r ON r.id = sr.sub_recipe_id
       WHERE sr.recipe_id = $1`,
      [row.id]
    );

    const ingredients: RecipeIngredient[] = ingredientsResult.rows.map(r => ({
      ingredientId: r.ingredient_id,
      ingredientName: r.ingredient_name,
      quantityUsed: parseFloat(r.quantity_used),
      unit: r.unit,
    }));

    const additionalCosts: AdditionalCost[] = costsResult.rows.map(r => ({
      name: r.name,
      value: parseFloat(r.value),
    }));

    const subRecipes: SubRecipe[] = subRecipesResult.rows.map(r => ({
      subRecipeId: r.sub_recipe_id,
      subRecipeName: r.sub_recipe_name,
      quantityUsed: parseFloat(r.quantity_used),
    }));

    return {
      id: row.id as string,
      name: row.name as string,
      yield: row.yield as number,
      profitMargin: parseFloat(row.profit_margin as string),
      ingredients,
      additionalCosts,
      subRecipes,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
