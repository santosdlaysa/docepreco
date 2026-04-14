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
  premium_platform VARCHAR(20) NULL,
  last_seen_at TIMESTAMP DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS revenue_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  multiplier DECIMAL(6,4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredient_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  purchase_quantity DECIMAL(10,3) NOT NULL,
  unit VARCHAR(10) NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_logs (
  id BIGSERIAL PRIMARY KEY,
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  ip VARCHAR(45),
  error_message TEXT,
  ts TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'warning', 'promo', 'update')),
  action_url TEXT,
  starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data_json TEXT,
  target VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'premium', 'free')),
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'failed')),
  recipients_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS motivational_tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
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
    // Expand push_tokens.token column for long FCM tokens
    await client.query(`ALTER TABLE push_tokens ALTER COLUMN token TYPE TEXT`);

    await addColumnIfMissing(client, 'users', 'is_premium', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await addColumnIfMissing(client, 'users', 'premium_until', 'TIMESTAMP NULL');
    await addColumnIfMissing(client, 'users', 'premium_platform', 'VARCHAR(20) NULL');

    await addColumnIfMissing(client, 'users', 'last_seen_at', 'TIMESTAMP DEFAULT NOW()');
    await addColumnIfMissing(client, 'request_logs', 'error_message', 'TEXT');

    // Seed motivational tips (only if table is empty)
    const tipCount = await client.query('SELECT COUNT(*) FROM motivational_tips');
    if (parseInt(tipCount.rows[0].count) === 0) {
      console.log('Seeding motivational tips...');
      const tips = [
        'Dica: revise seus preços a cada 15 dias para acompanhar a variação dos ingredientes!',
        'Você sabia? Embalar bem seus doces pode aumentar o valor percebido em até 30%!',
        'Lembre-se: seu tempo também é um ingrediente! Não esqueça de incluir a mão de obra.',
        'Dica: ofereça combos e kits para aumentar o ticket médio dos seus pedidos!',
        'Precificar corretamente é o primeiro passo para um negócio lucrativo. Você está no caminho certo!',
        'Dica: ingredientes comprados em atacado podem reduzir seus custos em até 40%!',
        'Você sabia? Clientes fiéis pagam mais por qualidade. Invista no seu diferencial!',
        'Dica: anote todas as vendas para entender quais doces dão mais lucro!',
      ];
      for (const msg of tips) {
        await client.query('INSERT INTO motivational_tips (message) VALUES ($1)', [msg]);
      }
    }

    // Seed notification templates (only if table is empty)
    const templateCount = await client.query('SELECT COUNT(*) FROM notification_templates');
    if (parseInt(templateCount.rows[0].count) === 0) {
      console.log('Seeding notification templates...');
      const templates = [
        { slug: 'inactivity_2d', title: 'Sentimos sua falta! 🧁', body: 'Suas receitas estão te esperando! Abra o DocePreço e confira seus cálculos.' },
        { slug: 'inactivity_5d', title: 'Faz tempo! 🍰', body: 'Faz tempo que você não aparece! Seus doces precisam de preços atualizados.' },
        { slug: 'daily_sales', title: 'Hora do registro! 📝', body: 'Já registrou as vendas de hoje? Mantenha seu controle em dia!' },
        { slug: 'weekly_reminder', title: 'Começo de semana! 📊', body: 'Confira se os preços dos ingredientes mudaram. Manter tudo atualizado é o segredo!' },
      ];
      for (const t of templates) {
        await client.query(
          'INSERT INTO notification_templates (slug, title, body) VALUES ($1, $2, $3)',
          [t.slug, t.title, t.body]
        );
      }
    }

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
