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

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telegram_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  category VARCHAR(50) NOT NULL DEFAULT 'alerts',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS global_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(10) NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'L', 'un')),
  package_amount DECIMAL(10,3) NOT NULL DEFAULT 1000,
  category VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS featured_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  recipe_yield INTEGER NOT NULL DEFAULT 1,
  profit_margin DECIMAL(5,2) NOT NULL DEFAULT 70,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS featured_recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES featured_recipes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  quantity_used DECIMAL(10,3) NOT NULL,
  unit VARCHAR(10) NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'unit')),
  purchase_quantity DECIMAL(10,3) NOT NULL DEFAULT 1000,
  purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipe_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(10) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  max_uses INTEGER NOT NULL DEFAULT 0,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL DEFAULT '',
  user_email VARCHAR(255) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'replied')),
  reply TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL DEFAULT '',
  user_email VARCHAR(255) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'done')),
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS changelog_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  features TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS renewal_notifications_sent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  premium_until TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_renewal_notif_user ON renewal_notifications_sent (user_id, notified_at);

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  icon VARCHAR(50),
  icon_color VARCHAR(20),
  icon_bg VARCHAR(20),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_user ON support_messages (user_id, created_at);

CREATE TABLE IF NOT EXISTS premium_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'webhook',
  platform VARCHAR(20),
  product_id VARCHAR(100),
  expiration_at TIMESTAMP,
  store VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_events_user ON premium_events (user_id, created_at DESC);
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

export async function runMigrations() {
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

    await addColumnIfMissing(client, 'users', 'last_seen_at', 'TIMESTAMP NULL');
    await addColumnIfMissing(client, 'users', 'instagram_handle', 'VARCHAR(30) NULL');
    await addColumnIfMissing(client, 'users', 'phone', 'VARCHAR(20) NULL');
    await addColumnIfMissing(client, 'request_logs', 'error_message', 'TEXT');
    await addColumnIfMissing(client, 'request_logs', 'body_email', 'VARCHAR(255)');

    // Purchase unit fields (e.g. "lata" = 550g)
    await addColumnIfMissing(client, 'ingredients', 'purchase_unit_label', 'VARCHAR(50)');
    await addColumnIfMissing(client, 'ingredients', 'purchase_unit_weight', 'DECIMAL(10,3)');

    // Recreate featured_recipes with correct schema if it has the old columns
    const hasOldSchema = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'featured_recipes' AND column_name = 'description'`
    );
    if (hasOldSchema.rows.length > 0) {
      console.log('Recreating featured_recipes with correct schema...');
      await client.query('DROP TABLE IF EXISTS featured_recipe_ingredients');
      await client.query('DROP TABLE IF EXISTS featured_recipes');
      await client.query(`
        CREATE TABLE featured_recipes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          recipe_yield INTEGER NOT NULL DEFAULT 1,
          profit_margin DECIMAL(5,2) NOT NULL DEFAULT 70,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE TABLE featured_recipe_ingredients (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          recipe_id UUID NOT NULL REFERENCES featured_recipes(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          quantity_used DECIMAL(10,3) NOT NULL,
          unit VARCHAR(10) NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'unit')),
          purchase_quantity DECIMAL(10,3) NOT NULL DEFAULT 1000,
          purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0
        )
      `);
    }
    // Also ensure recipe_yield exists for fresh installs where CREATE TABLE already has it
    await addColumnIfMissing(client, 'featured_recipes', 'recipe_yield', 'INTEGER NOT NULL DEFAULT 1');
    await addColumnIfMissing(client, 'featured_recipes', 'profit_margin', 'DECIMAL(5,2) NOT NULL DEFAULT 70');

    // Schedule config for notification templates
    await addColumnIfMissing(client, 'notification_templates', 'schedule_type', "VARCHAR(20) NOT NULL DEFAULT 'daily'");
    await addColumnIfMissing(client, 'notification_templates', 'schedule_hour', 'INTEGER');
    await addColumnIfMissing(client, 'notification_templates', 'schedule_minute', 'INTEGER DEFAULT 0');
    await addColumnIfMissing(client, 'notification_templates', 'schedule_weekday', 'INTEGER');
    await addColumnIfMissing(client, 'notification_templates', 'schedule_interval_hours', 'INTEGER');

    // Seed schedule config for existing templates (only if schedule_hour is null)
    await client.query(`UPDATE notification_templates SET schedule_type = 'interval', schedule_interval_hours = 48 WHERE slug = 'inactivity_2d' AND schedule_hour IS NULL`);
    await client.query(`UPDATE notification_templates SET schedule_type = 'interval', schedule_interval_hours = 120 WHERE slug = 'inactivity_5d' AND schedule_hour IS NULL`);
    await client.query(`UPDATE notification_templates SET schedule_type = 'daily', schedule_hour = 19, schedule_minute = 0 WHERE slug = 'daily_sales' AND schedule_hour IS NULL`);
    await client.query(`UPDATE notification_templates SET schedule_type = 'weekly', schedule_hour = 9, schedule_minute = 0, schedule_weekday = 2 WHERE slug = 'weekly_reminder' AND schedule_hour IS NULL`);
    await addColumnIfMissing(client, 'telegram_alerts', 'message_template', "TEXT");
    await addColumnIfMissing(client, 'telegram_alerts', 'schedule_cron', "VARCHAR(30)");
    await addColumnIfMissing(client, 'telegram_alerts', 'schedule_description', "VARCHAR(100)");

    // Seed schedule for existing report alerts
    await client.query(`UPDATE telegram_alerts SET schedule_cron = '0 8 * * *', schedule_description = 'Todo dia às 8h' WHERE key = 'daily_report' AND schedule_cron IS NULL`);
    await client.query(`UPDATE telegram_alerts SET schedule_cron = '0 9 * * 1', schedule_description = 'Segunda às 9h' WHERE key = 'weekly_report' AND schedule_cron IS NULL`);
    await client.query(`UPDATE telegram_alerts SET schedule_cron = '0 12,15,18,21 * * *', schedule_description = '12h, 15h, 18h e 21h' WHERE key = 'goal_progress' AND schedule_cron IS NULL`);

    // Seed message templates for existing telegram alerts (only if message_template is null)
    const templateUpdates: [string, string][] = [
      ['new_user', '🆕 Novo cadastro!\n\n🏪 {{companyName}}\n📧 {{email}}\n🕐 {{time}}'],
      ['new_sale', '🧁 Nova venda!\n\n🏪 {{companyName}}\n🍰 {{recipeName}} × {{quantity}}\n💰 {{revenue}}\n🕐 {{time}}'],
      ['premium_event', '{{eventLabel}}\n\n🏪 {{companyName}}\n🕐 {{time}}'],
      ['user_milestone', '🎉 Marco atingido!\n\n👥 {{total}} usuários cadastrados!\n🕐 {{time}}'],
      ['error_alert', '🚨 Erro no servidor\n\n{{method}} {{path}}\nStatus: {{statusCode}}\nDuração: {{duration}}ms\n🕐 {{time}}'],
      ['slow_api', '🐢 Rota lenta\n\n{{method}} {{path}}\nDuração: {{duration}}ms\n🕐 {{time}}'],
      ['daily_report', '📊 Relatório diário\n\n👥 Total de usuários: {{total}}\n⭐ Premium: {{premium}}\n🆕 Novos hoje: {{today}}\n🕐 {{time}}'],
      ['weekly_report', '📊 Relatório semanal\n\n🆕 Novos usuários: {{newUsers}}\n🍰 Receitas criadas: {{newRecipes}}\n🧁 Vendas registradas: {{totalSales}}\n💰 Receita total: {{revenue}}\n🕐 {{time}}'],
      ['goal_progress', '📈 Meta de cadastros\n\n{{progressBar}} {{percent}}%\n👥 {{today}}/{{goal}} hoje\n{{status}}\n🕐 {{time}}'],
    ];
    for (const [key, tpl] of templateUpdates) {
      await client.query(
        `UPDATE telegram_alerts SET message_template = $2 WHERE key = $1 AND message_template IS NULL`,
        [key, tpl]
      );
    }

    await addColumnIfMissing(client, 'onboarding_steps', 'icon', "VARCHAR(50)");
    await addColumnIfMissing(client, 'onboarding_steps', 'icon_color', "VARCHAR(20)");
    await addColumnIfMissing(client, 'onboarding_steps', 'icon_bg', "VARCHAR(20)");

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

    // Seed telegram alerts (only if table is empty)
    const telegramCount = await client.query('SELECT COUNT(*) FROM telegram_alerts');
    if (parseInt(telegramCount.rows[0].count) === 0) {
      console.log('Seeding telegram alerts...');
      const alerts = [
        { key: 'new_user', label: 'Novo cadastro', description: 'Notifica quando um novo usuário se registra', category: 'alerts' },
        { key: 'new_sale', label: 'Nova venda', description: 'Notifica quando um usuário registra uma venda', category: 'alerts' },
        { key: 'premium_event', label: 'Evento premium', description: 'Assinatura, renovação, cancelamento, expiração', category: 'alerts' },
        { key: 'user_milestone', label: 'Marco de usuários', description: 'Quando atinge 50, 100, 200, 500, 1000, 2000, 5000, 10000', category: 'alerts' },
        { key: 'error_alert', label: 'Erro no servidor', description: 'Quando uma rota retorna status 500+', category: 'alerts' },
        { key: 'slow_api', label: 'Rota lenta', description: 'Quando uma rota demora mais de 2 segundos', category: 'alerts' },
        { key: 'support_message', label: 'Mensagem no suporte', description: 'Notifica quando um usuário envia mensagem no chat de suporte', category: 'alerts' },
        { key: 'daily_report', label: 'Relatório diário', description: 'Enviado todo dia às 8h com total de usuários', category: 'reports' },
        { key: 'weekly_report', label: 'Relatório semanal', description: 'Enviado toda segunda às 9h com resumo da semana', category: 'reports' },
        { key: 'goal_progress', label: 'Progresso da meta', description: 'Enviado às 12h, 15h, 18h e 21h com progresso de cadastros', category: 'reports' },
      ];
      const templates: Record<string, string> = {
        new_user: '🆕 Novo cadastro!\n\n🏪 {{companyName}}\n📧 {{email}}\n🕐 {{time}}',
        new_sale: '🧁 Nova venda!\n\n🏪 {{companyName}}\n🍰 {{recipeName}} × {{quantity}}\n💰 {{revenue}}\n🕐 {{time}}',
        premium_event: '{{eventLabel}}\n\n🏪 {{companyName}}\n🕐 {{time}}',
        user_milestone: '🎉 Marco atingido!\n\n👥 {{total}} usuários cadastrados!\n🕐 {{time}}',
        error_alert: '🚨 Erro no servidor\n\n{{method}} {{path}}\nStatus: {{statusCode}}\nDuração: {{duration}}ms\n🕐 {{time}}',
        slow_api: '🐢 Rota lenta\n\n{{method}} {{path}}\nDuração: {{duration}}ms\n🕐 {{time}}',
        daily_report: '📊 Relatório diário\n\n👥 Total de usuários: {{total}}\n⭐ Premium: {{premium}}\n🆕 Novos hoje: {{today}}\n🕐 {{time}}',
        weekly_report: '📊 Relatório semanal\n\n🆕 Novos usuários: {{newUsers}}\n🍰 Receitas criadas: {{newRecipes}}\n🧁 Vendas registradas: {{totalSales}}\n💰 Receita total: {{revenue}}\n🕐 {{time}}',
        goal_progress: '📈 Meta de cadastros\n\n{{progressBar}} {{percent}}%\n👥 {{today}}/{{goal}} hoje\n{{status}}\n🕐 {{time}}',
        support_message: '💬 Nova mensagem no suporte!\n\n🏪 {{companyName}}\n📧 {{email}}\n\n📝 {{message}}\n🕐 {{time}}',
      };
      for (const a of alerts) {
        await client.query(
          `INSERT INTO telegram_alerts (key, label, description, is_enabled, category, message_template) VALUES ($1, $2, $3, TRUE, $4, $5)`,
          [a.key, a.label, a.description, a.category, templates[a.key] ?? null]
        );
      }
    }

    // Seed featured recipes from SUGGESTED_RECIPES (only if table is empty)
    const featuredCount = await client.query('SELECT COUNT(*) FROM featured_recipes');
    if (parseInt(featuredCount.rows[0].count) === 0) {
      console.log('Seeding featured recipes...');
      const recipes = [
        { name: 'Brigadeiro Gourmet', yield: 30, profitMargin: 100, ingredients: [
          { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
          { name: 'Chocolate em po', quantityUsed: 100, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
          { name: 'Manteiga', quantityUsed: 15, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
          { name: 'Creme de leite', quantityUsed: 200, unit: 'g', purchaseQuantity: 200, purchasePrice: 4.29 },
          { name: 'Granulado', quantityUsed: 100, unit: 'g', purchaseQuantity: 500, purchasePrice: 6.99 },
        ]},
        { name: 'Bolo de Cenoura com Cobertura', yield: 15, profitMargin: 70, ingredients: [
          { name: 'Cenoura', quantityUsed: 300, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
          { name: 'Oleo de soja', quantityUsed: 200, unit: 'ml', purchaseQuantity: 900, purchasePrice: 8.99 },
          { name: 'Ovos', quantityUsed: 3, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
          { name: 'Acucar', quantityUsed: 300, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
          { name: 'Farinha de trigo', quantityUsed: 300, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
          { name: 'Fermento em po', quantityUsed: 10, unit: 'g', purchaseQuantity: 100, purchasePrice: 5.49 },
          { name: 'Chocolate em po', quantityUsed: 80, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
          { name: 'Leite', quantityUsed: 100, unit: 'ml', purchaseQuantity: 1000, purchasePrice: 6.49 },
        ]},
        { name: 'Bolo de Pote', yield: 10, profitMargin: 100, ingredients: [
          { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
          { name: 'Creme de leite', quantityUsed: 200, unit: 'g', purchaseQuantity: 200, purchasePrice: 4.29 },
          { name: 'Chocolate em po', quantityUsed: 50, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
          { name: 'Farinha de trigo', quantityUsed: 200, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
          { name: 'Ovos', quantityUsed: 2, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
          { name: 'Acucar', quantityUsed: 150, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
          { name: 'Leite', quantityUsed: 200, unit: 'ml', purchaseQuantity: 1000, purchasePrice: 6.49 },
        ]},
        { name: 'Beijinho', yield: 30, profitMargin: 100, ingredients: [
          { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
          { name: 'Coco ralado', quantityUsed: 100, unit: 'g', purchaseQuantity: 100, purchasePrice: 5.49 },
          { name: 'Manteiga', quantityUsed: 15, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
        ]},
        { name: 'Brownie', yield: 12, profitMargin: 100, ingredients: [
          { name: 'Chocolate meio amargo', quantityUsed: 200, unit: 'g', purchaseQuantity: 400, purchasePrice: 16.99 },
          { name: 'Manteiga', quantityUsed: 100, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
          { name: 'Acucar', quantityUsed: 200, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
          { name: 'Ovos', quantityUsed: 3, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
          { name: 'Farinha de trigo', quantityUsed: 80, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
          { name: 'Chocolate em po', quantityUsed: 30, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
        ]},
        { name: 'Palha Italiana', yield: 20, profitMargin: 100, ingredients: [
          { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
          { name: 'Chocolate em po', quantityUsed: 80, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
          { name: 'Manteiga', quantityUsed: 30, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
          { name: 'Biscoito maisena', quantityUsed: 200, unit: 'g', purchaseQuantity: 400, purchasePrice: 5.99 },
        ]},
        { name: 'Trufa de Chocolate', yield: 20, profitMargin: 100, ingredients: [
          { name: 'Chocolate meio amargo', quantityUsed: 300, unit: 'g', purchaseQuantity: 400, purchasePrice: 16.99 },
          { name: 'Creme de leite', quantityUsed: 200, unit: 'g', purchaseQuantity: 200, purchasePrice: 4.29 },
          { name: 'Chocolate em po', quantityUsed: 100, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
        ]},
        { name: 'Bolo Red Velvet', yield: 15, profitMargin: 100, ingredients: [
          { name: 'Farinha de trigo', quantityUsed: 280, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
          { name: 'Acucar', quantityUsed: 250, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
          { name: 'Ovos', quantityUsed: 2, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
          { name: 'Chocolate em po', quantityUsed: 20, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
          { name: 'Oleo de soja', quantityUsed: 240, unit: 'ml', purchaseQuantity: 900, purchasePrice: 8.99 },
          { name: 'Corante vermelho', quantityUsed: 30, unit: 'ml', purchaseQuantity: 60, purchasePrice: 7.99 },
          { name: 'Cream cheese', quantityUsed: 300, unit: 'g', purchaseQuantity: 300, purchasePrice: 12.99 },
          { name: 'Manteiga', quantityUsed: 60, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
          { name: 'Leite', quantityUsed: 240, unit: 'ml', purchaseQuantity: 1000, purchasePrice: 6.49 },
        ]},
        { name: 'Mousse de Maracuja', yield: 8, profitMargin: 70, ingredients: [
          { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
          { name: 'Creme de leite', quantityUsed: 200, unit: 'g', purchaseQuantity: 200, purchasePrice: 4.29 },
          { name: 'Suco de maracuja concentrado', quantityUsed: 200, unit: 'ml', purchaseQuantity: 500, purchasePrice: 9.99 },
          { name: 'Gelatina sem sabor', quantityUsed: 12, unit: 'g', purchaseQuantity: 12, purchasePrice: 2.99 },
        ]},
        { name: 'Cookie Americano', yield: 15, profitMargin: 100, ingredients: [
          { name: 'Farinha de trigo', quantityUsed: 280, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
          { name: 'Manteiga', quantityUsed: 115, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
          { name: 'Acucar', quantityUsed: 100, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
          { name: 'Acucar mascavo', quantityUsed: 100, unit: 'g', purchaseQuantity: 500, purchasePrice: 7.99 },
          { name: 'Ovos', quantityUsed: 1, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
          { name: 'Gotas de chocolate', quantityUsed: 200, unit: 'g', purchaseQuantity: 300, purchasePrice: 11.99 },
          { name: 'Fermento em po', quantityUsed: 5, unit: 'g', purchaseQuantity: 100, purchasePrice: 5.49 },
        ]},
        { name: 'Coxinha Gourmet', yield: 20, profitMargin: 70, ingredients: [
          { name: 'Peito de frango', quantityUsed: 500, unit: 'g', purchaseQuantity: 1000, purchasePrice: 19.99 },
          { name: 'Cream cheese', quantityUsed: 150, unit: 'g', purchaseQuantity: 300, purchasePrice: 12.99 },
          { name: 'Farinha de trigo', quantityUsed: 500, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
          { name: 'Caldo de galinha', quantityUsed: 20, unit: 'g', purchaseQuantity: 45, purchasePrice: 3.49 },
          { name: 'Leite', quantityUsed: 500, unit: 'ml', purchaseQuantity: 1000, purchasePrice: 6.49 },
          { name: 'Ovos', quantityUsed: 2, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
          { name: 'Farinha de rosca', quantityUsed: 200, unit: 'g', purchaseQuantity: 500, purchasePrice: 5.99 },
        ]},
        { name: 'Pudim de Leite', yield: 10, profitMargin: 70, ingredients: [
          { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
          { name: 'Leite', quantityUsed: 400, unit: 'ml', purchaseQuantity: 1000, purchasePrice: 6.49 },
          { name: 'Ovos', quantityUsed: 3, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
          { name: 'Acucar', quantityUsed: 200, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
        ]},
      ];
      for (let i = 0; i < recipes.length; i++) {
        const r = recipes[i];
        const res = await client.query(
          `INSERT INTO featured_recipes (name, recipe_yield, profit_margin, is_active, sort_order) VALUES ($1, $2, $3, TRUE, $4) RETURNING id`,
          [r.name, r.yield, r.profitMargin, i]
        );
        const recipeId = res.rows[0].id;
        for (const ing of r.ingredients) {
          await client.query(
            `INSERT INTO featured_recipe_ingredients (recipe_id, name, quantity_used, unit, purchase_quantity, purchase_price) VALUES ($1, $2, $3, $4, $5, $6)`,
            [recipeId, ing.name, ing.quantityUsed, ing.unit, ing.purchaseQuantity, ing.purchasePrice]
          );
        }
      }
    }

    // Seed onboarding steps (only if table is empty)
    const onboardingCount = await client.query('SELECT COUNT(*) FROM onboarding_steps');
    if (parseInt(onboardingCount.rows[0].count) === 0) {
      console.log('Seeding onboarding steps...');
      const steps = [
        { title: 'Você sabe se está lucrando?', description: 'Muitas confeiteiras vendem muito, mas no final do mês o dinheiro some. O problema está no preço — calculado no "achismo", sem considerar todos os custos.', icon: 'sad-outline', iconColor: '#E91E8C', iconBg: '#F8BBD9' },
        { title: 'Calcule o custo real de cada receita', description: 'Cadastre seus ingredientes com preço e quantidade. O DocePreço calcula automaticamente quanto custa cada grama, cada unidade e cada receita completa.', icon: 'calculator-outline', iconColor: '#8B4513', iconBg: '#F5E6D0' },
        { title: 'Defina sua margem de lucro', description: 'Escolha quanto quer lucrar — 30%, 50%, 100% ou mais. O app mostra o preço de venda ideal para você nunca mais trabalhar no prejuízo.', icon: 'trending-up-outline', iconColor: '#4CAF50', iconBg: '#E8F5E9' },
        { title: 'Acompanhe suas vendas', description: 'Registre o que vendeu, em qual quantidade e por qual preço. Veja seu faturamento por dia, semana ou mês e entenda quando seu negócio cresce.', icon: 'cash-outline', iconColor: '#FF9800', iconBg: '#FFF3E0' },
      ];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await client.query(
          `INSERT INTO onboarding_steps (title, description, icon, icon_color, icon_bg, sort_order, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
          [s.title, s.description, s.icon, s.iconColor, s.iconBg, i]
        );
      }
    }

    // Seed feature flags from existing premium features (only if table is empty)
    const flagCount = await client.query('SELECT COUNT(*) FROM feature_flags');
    if (parseInt(flagCount.rows[0].count) === 0) {
      console.log('Seeding feature flags...');
      const flags = [
        { key: 'pdfCustomBranding', description: 'PDF personalizado — logo, cores e sem marca DocePreço nos orçamentos' },
        { key: 'advancedReports', description: 'Relatórios completos — gráficos de faturamento, receitas mais vendidas e margem real' },
        { key: 'clientsManagement', description: 'Gestão de clientes — cadastro, histórico e aniversários' },
        { key: 'ordersManagement', description: 'Agenda de encomendas — pedidos, status de produção e lembretes de entrega' },
        { key: 'laborCostCalc', description: 'Cálculo profissional — mão de obra e custos fixos no preço real da receita' },
        { key: 'smartShoppingList', description: 'Lista de compras inteligente — calcula o que precisa comprar pras encomendas' },
        { key: 'ingredientPriceHistory', description: 'Histórico de preços — evolução do custo dos ingredientes ao longo do tempo' },
        { key: 'seasonalPricing', description: 'Precificação por temporada — ajuste automático no Natal, Páscoa e datas especiais' },
        { key: 'suggestedRecipes', description: 'Receitas sugeridas — receitas prontas como base para usuários premium' },
      ];
      for (const f of flags) {
        await client.query(
          'INSERT INTO feature_flags (key, description, is_enabled) VALUES ($1, $2, TRUE)',
          [f.key, f.description]
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
  }
}

// Run standalone when called directly (npm run migrate)
if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch(() => pool.end().then(() => process.exit(1)));
}
