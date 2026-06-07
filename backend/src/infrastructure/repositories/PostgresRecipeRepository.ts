import { pool } from '../database/connection';
import { Recipe, CreateRecipeDTO, RecipeIngredient, AdditionalCost, SubRecipe } from '../../domain/entities/Recipe';
import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';

export class PostgresRecipeRepository implements IRecipeRepository {
  async findAll(userId: string): Promise<Recipe[]> {
    const result = await pool.query(
      'SELECT * FROM recipes WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    if (result.rows.length === 0) return [];

    const recipeIds = result.rows.map(r => r.id);

    // Carrega todas as relações em lote (3 queries no total, em vez de 3 por receita)
    const [ingredientsResult, costsResult, subRecipesResult] = await Promise.all([
      pool.query(
        `SELECT ri.*, i.name AS ingredient_name
         FROM recipe_ingredients ri
         JOIN ingredients i ON i.id = ri.ingredient_id
         WHERE ri.recipe_id = ANY($1)`,
        [recipeIds]
      ),
      pool.query(
        'SELECT * FROM recipe_additional_costs WHERE recipe_id = ANY($1)',
        [recipeIds]
      ),
      pool.query(
        `SELECT sr.*, r.name AS sub_recipe_name
         FROM recipe_sub_recipes sr
         JOIN recipes r ON r.id = sr.sub_recipe_id
         WHERE sr.recipe_id = ANY($1)`,
        [recipeIds]
      ),
    ]);

    // Agrupa as relações por recipe_id
    const ingredientsByRecipe = new Map<string, RecipeIngredient[]>();
    for (const r of ingredientsResult.rows) {
      const list = ingredientsByRecipe.get(r.recipe_id) ?? [];
      list.push({
        ingredientId: r.ingredient_id,
        ingredientName: r.ingredient_name,
        quantityUsed: parseFloat(r.quantity_used),
        unit: r.unit,
      });
      ingredientsByRecipe.set(r.recipe_id, list);
    }

    const costsByRecipe = new Map<string, AdditionalCost[]>();
    for (const r of costsResult.rows) {
      const list = costsByRecipe.get(r.recipe_id) ?? [];
      list.push({ name: r.name, value: parseFloat(r.value) });
      costsByRecipe.set(r.recipe_id, list);
    }

    const subRecipesByRecipe = new Map<string, SubRecipe[]>();
    for (const r of subRecipesResult.rows) {
      const list = subRecipesByRecipe.get(r.recipe_id) ?? [];
      list.push({
        subRecipeId: r.sub_recipe_id,
        subRecipeName: r.sub_recipe_name,
        quantityUsed: parseFloat(r.quantity_used),
        unit: r.unit || 'un',
      });
      subRecipesByRecipe.set(r.recipe_id, list);
    }

    return result.rows.map(row => this.mapRow(
      row,
      ingredientsByRecipe.get(row.id) ?? [],
      costsByRecipe.get(row.id) ?? [],
      subRecipesByRecipe.get(row.id) ?? [],
    ));
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
        `INSERT INTO recipes (user_id, name, yield, profit_margin, photo_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, data.name, data.yield, data.profitMargin, data.photoUrl || null]
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
            `INSERT INTO recipe_sub_recipes (recipe_id, sub_recipe_id, quantity_used, unit) VALUES ($1, $2, $3, $4)`,
            [recipe.id, sub.subRecipeId, sub.quantityUsed, sub.unit || 'un']
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
      if (data.photoUrl !== undefined) { fields.push(`photo_url = $${idx++}`); values.push(data.photoUrl || null); }

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
            `INSERT INTO recipe_sub_recipes (recipe_id, sub_recipe_id, quantity_used, unit) VALUES ($1, $2, $3, $4)`,
            [id, sub.subRecipeId, sub.quantityUsed, sub.unit || 'un']
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
    const [ingredientsResult, costsResult, subRecipesResult] = await Promise.all([
      pool.query(
        `SELECT ri.*, i.name AS ingredient_name
         FROM recipe_ingredients ri
         JOIN ingredients i ON i.id = ri.ingredient_id
         WHERE ri.recipe_id = $1`,
        [row.id]
      ),
      pool.query(
        'SELECT * FROM recipe_additional_costs WHERE recipe_id = $1',
        [row.id]
      ),
      pool.query(
        `SELECT sr.*, r.name AS sub_recipe_name
         FROM recipe_sub_recipes sr
         JOIN recipes r ON r.id = sr.sub_recipe_id
         WHERE sr.recipe_id = $1`,
        [row.id]
      ),
    ]);

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
      unit: r.unit || 'un',
    }));

    return this.mapRow(row, ingredients, additionalCosts, subRecipes);
  }

  private mapRow(
    row: Record<string, unknown>,
    ingredients: RecipeIngredient[],
    additionalCosts: AdditionalCost[],
    subRecipes: SubRecipe[],
  ): Recipe {
    return {
      id: row.id as string,
      name: row.name as string,
      yield: row.yield as number,
      profitMargin: parseFloat(row.profit_margin as string),
      photoUrl: (row.photo_url as string) || undefined,
      ingredients,
      additionalCosts,
      subRecipes,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
