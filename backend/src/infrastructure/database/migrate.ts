import { pool } from './connection';
import dotenv from 'dotenv';

dotenv.config();

const migrations = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  premium_until TIMESTAMP NULL,
  premium_platform VARCHAR(20) NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  purchase_quantity DECIMAL(10,3) NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(10) NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'unit')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  yield INTEGER NOT NULL,
  profit_margin DECIMAL(5,2) NOT NULL DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_used DECIMAL(10,3) NOT NULL,
  unit VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_additional_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  value DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  quantity_sold INTEGER NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  total_revenue DECIMAL(10,2) NOT NULL,
  sale_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Premium: gestão de clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  birthday DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Premium: agenda de encomendas
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'ready', 'delivered', 'cancelled')),
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Premium: PDF personalizado
CREATE TABLE IF NOT EXISTS pdf_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  logo_url TEXT,
  brand_color VARCHAR(7),
  hide_watermark BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);
`;

async function addColumnIfMissing(
  client: any,
  table: string,
  column: string,
  definition: string
) {
  const exists = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  if (exists.rows.length === 0) {
    console.log(`Adding ${column} to ${table}...`);
    await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function addUserIdColumn(client: any, table: string) {
  const exists = await client.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = $1 AND column_name = 'user_id'
  `, [table]);

  if (exists.rows.length === 0) {
    console.log(`Adding user_id to ${table}...`);
    // Add as nullable first
    await client.query(`ALTER TABLE ${table} ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE`);

    // Assign existing rows to the first user (or leave null if no users yet)
    await client.query(`
      UPDATE ${table} SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
      WHERE user_id IS NULL
    `);

    // Make it NOT NULL only if all rows have a value
    const nullCount = await client.query(`SELECT COUNT(*) FROM ${table} WHERE user_id IS NULL`);
    if (parseInt(nullCount.rows[0].count) === 0) {
      await client.query(`ALTER TABLE ${table} ALTER COLUMN user_id SET NOT NULL`);
    } else {
      console.log(`⚠️  ${table}: some rows have no user — column left nullable until a user is assigned`);
    }
  }
}

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migrations);

    // Add user_id to pre-existing tables that didn't have it
    await addUserIdColumn(client, 'ingredients');
    await addUserIdColumn(client, 'recipes');
    await addUserIdColumn(client, 'sales');

    // Premium subscription columns (ALTER TABLE for existing DBs)
    await addColumnIfMissing(client, 'users', 'is_premium', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await addColumnIfMissing(client, 'users', 'premium_until', 'TIMESTAMP NULL');
    await addColumnIfMissing(client, 'users', 'premium_platform', 'VARCHAR(20) NULL');

    // Premium: cálculo de mão de obra por receita
    await addColumnIfMissing(client, 'recipes', 'labor_minutes', 'INTEGER NOT NULL DEFAULT 0');
    await addColumnIfMissing(client, 'users', 'hourly_rate', 'DECIMAL(10,2) NULL');

    await client.query('COMMIT');
    console.log('Migrations applied successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
