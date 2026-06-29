const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://sweetpricing_user:rPsNDrsKURU0YpcYPq53Intou0cLReXM@dpg-d70ndvh5pdvs739bo3rg-a.oregon-postgres.render.com/sweetpricing',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  // 1. Find user
  const userRes = await pool.query(`SELECT id, email FROM users WHERE email = 'estela2430.crb@gmail.com'`);
  if (userRes.rows.length === 0) { console.log('User not found'); return; }
  const user = userRes.rows[0];
  console.log('USER:', JSON.stringify(user));

  // 2. Find her recipes
  const recipeRes = await pool.query(`SELECT id, name, yield, profit_margin FROM recipes WHERE user_id = $1`, [user.id]);
  console.log('RECIPES:', JSON.stringify(recipeRes.rows, null, 2));

  // 3. For each recipe, find ingredients with their details
  for (const recipe of recipeRes.rows) {
    const riRes = await pool.query(`
      SELECT ri.ingredient_id, ri.quantity_used, ri.unit as recipe_unit,
             i.name, i.purchase_price, i.purchase_quantity, i.unit as ingredient_unit, i.purchase_unit_weight
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = $1
    `, [recipe.id]);
    console.log(`\nINGREDIENTS for "${recipe.name}":`, JSON.stringify(riRes.rows, null, 2));

    // 4. Find additional costs
    const acRes = await pool.query(`SELECT name, value FROM additional_costs WHERE recipe_id = $1`, [recipe.id]);
    console.log(`ADDITIONAL COSTS for "${recipe.name}":`, JSON.stringify(acRes.rows, null, 2));
  }
}

run().then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); });
