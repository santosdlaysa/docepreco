// Isolated local PostgreSQL only. External APIs are simulated; no real WhatsApp messages are sent.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const schema = 'whatsapp_smoke_' + crypto.randomBytes(6).toString('hex');
process.env.DATABASE_URL = 'postgresql://postgres@localhost:55219/postgres?options=' + encodeURIComponent('-csearch_path=' + schema + ',public');
process.env.WHATSAPP_SALES_ENABLED = 'true';
process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'smoke-business';
process.env.META_WHATSAPP_ACCESS_TOKEN = 'smoke-token';
process.env.META_APP_SECRET = 'smoke-secret';
process.env.OPENAI_API_KEY = 'smoke-key';
const { pool } = require('../dist/infrastructure/database/connection');
const { migrateWhatsAppSales } = require('../dist/infrastructure/database/whatsappSalesMigration');
const { processWhatsAppSalesOnce, deliverWhatsAppSaleReplyOnce } = require('../dist/infrastructure/services/whatsappSales');
const webhook = require('../dist/presentation/routes/metaWebhookRoutes').default;
const linkRoutes = require('../dist/presentation/routes/whatsappSalesRoutes').default;
const express = require('../node_modules/express');
const request = require('../node_modules/supertest');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const phone = '5592999999999';
const app = express();
app.use('/webhooks/whatsapp', express.raw({ type: 'application/json' }));
app.use(webhook);
app.use(express.json());
app.use('/link', (req, _res, next) => { req.userId = owner; next(); }, linkRoutes);
let sequence = 0;
let replies = [];
global.fetch = async (url, options) => {
  const data = JSON.parse(options.body);
  if (url === 'https://api.openai.com/v1/responses') {
    const message = JSON.parse(data.input);
    const quantity = message.message.includes('12') ? 12 : 10;
    const parsed = { product: 'Brownie', quantity, unitPrice: 8, totalPrice: null, saleDate: message.today, paymentMethod: 'pix', clientName: 'Maria', question: null };
    return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(parsed) }] }] }) };
  }
  assert.equal(new URL(url).hostname, 'graph.facebook.com');
  replies.push(data.text.body);
  return { ok: true, json: async () => ({ messages: [{ id: 'reply-' + replies.length }] }) };
};
async function inbound(body, id = 'wamid.smoke.' + (++sequence)) {
  const payload = { entry: [{ changes: [{ value: { metadata: { phone_number_id: 'smoke-business' }, messages: [{ id, from: phone, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body } }] } }] }] };
  const raw = JSON.stringify(payload);
  const signature = 'sha256=' + crypto.createHmac('sha256', process.env.META_APP_SECRET).update(raw).digest('hex');
  const res = await request(app).post('/webhooks/whatsapp').set('Content-Type', 'application/json').set('x-hub-signature-256', signature).send(raw);
  assert.equal(res.status, 200);
  return id;
}
async function drain() { for (let i = 0; i < 8; i++) { await processWhatsAppSalesOnce(); await deliverWhatsAppSaleReplyOnce(); } }
async function scalar(sql) { return (await pool.query(sql)).rows[0]; }
(async () => {
  await pool.query('CREATE SCHEMA ' + schema);
  const db = await pool.connect();
  try {
    // This cluster was created solely for this test, on a dedicated local port.
    await db.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE users(id UUID PRIMARY KEY, is_premium BOOLEAN DEFAULT FALSE, premium_until TIMESTAMPTZ, preferences JSONB DEFAULT '{}');
      CREATE TABLE recipes(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID REFERENCES users, name TEXT);
      CREATE TABLE cash_sessions(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID REFERENCES users, status TEXT, opened_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE app_settings(key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE sales(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID REFERENCES users, recipe_id UUID REFERENCES recipes,
        product_name TEXT,quantity_sold INTEGER,sale_price NUMERIC(10,2),total_revenue NUMERIC(10,2),discount NUMERIC(10,2),sale_date DATE,
        client_name TEXT,notes TEXT,payment_method TEXT,session_id UUID REFERENCES cash_sessions,order_id UUID,created_at TIMESTAMPTZ DEFAULT NOW());
    `);
    await migrateWhatsAppSales(db); await migrateWhatsAppSales(db);
    await db.query('INSERT INTO users(id) VALUES($1),($2)', [owner, other]);
    await db.query("INSERT INTO recipes(user_id,name) VALUES($1,'Brownie'),($2,'Brownie')", [owner, other]);
    await db.query("INSERT INTO cash_sessions(user_id,status) VALUES($1,'open')", [owner]);
    await db.query("INSERT INTO app_settings VALUES('plan_free_sale_limit','1')");
  } finally { db.release(); }
  const link = await request(app).post('/link/link-code').send({ phone });
  assert.equal(link.status, 200);
  await inbound('vincular ' + link.body.data.code); await drain();
  assert.equal((await request(app).get('/link')).body.data.phone, phone);
  await inbound('Vendi 10 brownies a R$ 8 cada, pago no Pix para Maria'); await drain();
  assert.equal((await scalar('SELECT COUNT(*)::int AS count FROM sales')).count, 0);
  const first = await scalar('SELECT confirmation_code FROM whatsapp_sale_drafts');
  await inbound('A quantidade correta é 12'); await drain();
  const corrected = await scalar('SELECT confirmation_code FROM whatsapp_sale_drafts');
  assert.notEqual(first.confirmation_code, corrected.confirmation_code);
  await inbound('confirmar ' + first.confirmation_code); await drain();
  assert.equal((await scalar('SELECT COUNT(*)::int AS count FROM sales')).count, 0);
  await inbound('confirmar ' + corrected.confirmation_code, 'wamid.confirm.once');
  await inbound('confirmar ' + corrected.confirmation_code, 'wamid.confirm.once'); // repeated delivery
  await inbound('confirmar ' + corrected.confirmation_code, 'wamid.confirm.twice'); // repeated user confirmation
  await Promise.all([processWhatsAppSalesOnce(), processWhatsAppSalesOnce()]); await drain();
  const sale = await scalar('SELECT * FROM sales');
  assert.equal((await scalar('SELECT COUNT(*)::int AS count FROM sales')).count, 1);
  assert.equal(sale.user_id, owner); assert.equal(sale.quantity_sold, 12); assert.equal(Number(sale.total_revenue), 96);
  assert.ok(sale.session_id); assert.equal(sale.whatsapp_message_id, 'wamid.confirm.once');
  assert.equal((await scalar('SELECT COUNT(*)::int AS count FROM whatsapp_sale_drafts')).count, 0);
  // A second sale must obey the exact same plan limit as the app.
  await inbound('Vendi 10 brownies a R$ 8 cada, pago no Pix'); await drain();
  const second = await scalar('SELECT confirmation_code FROM whatsapp_sale_drafts');
  await inbound('confirmar ' + second.confirmation_code); await drain();
  assert.ok(replies.at(-1).includes('limite de 1 vendas'));
  assert.equal((await scalar('SELECT COUNT(*)::int AS count FROM sales')).count, 1);
  // Unlink revokes drafts and prevents future messages writing to the account.
  assert.equal((await request(app).delete('/link')).status, 200);
  assert.equal((await scalar('SELECT COUNT(*)::int AS count FROM whatsapp_sale_drafts')).count, 0);
  await inbound('Vendi 10 brownies a R$ 8 cada, pago no Pix'); await drain();
  assert.ok(replies.at(-1).includes('Vincule'));
  assert.equal((await scalar('SELECT COUNT(*)::int AS count FROM sales')).count, 1);
  console.log(JSON.stringify({ ok: true, checks: ['idempotent migration', 'signed webhook', 'account linking', 'draft before confirm', 'correction', 'stale confirmation rejected', 'duplicate webhook', 'concurrent processing', 'single sale', 'owner isolation', 'cash session', 'plan quota', 'unlink revokes access'], externalMessagesSent: 0 }));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await pool.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE'); await pool.end(); });
