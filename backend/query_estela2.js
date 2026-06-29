const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://sweetpricing_user:rPsNDrsKURU0YpcYPq53Intou0cLReXM@dpg-d70ndvh5pdvs739bo3rg-a.oregon-postgres.render.com/sweetpricing',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  // Find additional costs table
  const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
  console.log('TABLES:', tables.rows.map(r => r.table_name).join(', '));

  // Find additional costs for bolo de cenoura
  const recipeId = '7bb00dcf-55ce-46df-ac8b-c898fd0cc24b';
  try {
    const ac = await pool.query(`SELECT * FROM recipe_additional_costs WHERE recipe_id = $1`, [recipeId]);
    console.log('ADDITIONAL COSTS (recipe_additional_costs):', JSON.stringify(ac.rows, null, 2));
  } catch(e) { console.log('recipe_additional_costs error:', e.message); }

  try {
    const ac2 = await pool.query(`SELECT * FROM additional_cost WHERE recipe_id = $1`, [recipeId]);
    console.log('ADDITIONAL COSTS (additional_cost):', JSON.stringify(ac2.rows, null, 2));
  } catch(e) { console.log('additional_cost error:', e.message); }
}

run().then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); });
