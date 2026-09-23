import { Client } from 'pg';
import { randomUUID } from 'crypto';
import { migrateConversions } from '../database/conversionMigration';

// Explicit opt-in URL; never uses DATABASE_URL or the application's database.
const testUrl = process.env.CONVERSION_TEST_DATABASE_URL;
const client = new Client({ connectionString: testUrl });
jest.mock('../database/connection', () => ({ pool: { query: (...args: any[]) => client.query(...args as [string, any[]]) } }));
import { opportunitiesSql, conversionFunnelSql, recordConversion } from './conversionService';

(testUrl ? describe : describe.skip)('Conversion analytics (PostgreSQL)', () => {
  const schema = `conversion_test_${Date.now()}`;
  beforeAll(async () => {
    await client.connect();
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}`);
    await client.query(`CREATE TABLE users (id UUID PRIMARY KEY, company_name TEXT, email TEXT,
      is_active BOOLEAN DEFAULT TRUE, is_premium BOOLEAN DEFAULT FALSE, premium_until TIMESTAMP,
      last_seen_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE recipes (user_id UUID);
      CREATE TABLE premium_events (user_id UUID, amount_cents INT, source TEXT DEFAULT 'pix', event_type TEXT, created_at TIMESTAMP);`);
    await migrateConversions(client);
    await migrateConversions(client); // Idempotent deployment.
  });
  afterAll(async () => {
    await client.query(`DROP SCHEMA ${schema} CASCADE`);
    await client.end();
  });
  beforeEach(async () => { await client.query('TRUNCATE conversion_events, recipes, premium_events, users CASCADE'); });
  async function user() {
    const id = randomUUID();
    await client.query(`INSERT INTO users(id, company_name, email) VALUES ($1, 'Teste', 'test@example.com')`, [id]);
    return id;
  }
  async function event(id: string, source: string, days: number, name = 'offer_viewed') {
    await client.query(`INSERT INTO conversion_events(user_id, source, event_name, target_tier, was_free, created_at)
      VALUES ($1,$2,$3,'premium',TRUE,NOW() - $4 * INTERVAL '1 day')`, [id, source, name, days]);
  }
  async function payment(id: string, days: number, amount = 1999, type = 'INITIAL_PURCHASE') {
    await client.query(`INSERT INTO premium_events(user_id,amount_cents,event_type,created_at)
      VALUES ($1,$2,$3,NOW() - $4 * INTERVAL '1 day')`, [id, amount, type, days]);
  }
  it('deduplicates retried events and determines Free status on the server', async () => {
    const id = await user(), eventId = randomUUID();
    await recordConversion(id, 'offer_viewed', 'recipe_limit', 'premium', eventId);
    await recordConversion(id, 'offer_viewed', 'recipe_limit', 'premium', eventId);
    expect((await client.query('SELECT * FROM conversion_events')).rows).toHaveLength(1);
    await client.query('UPDATE users SET is_premium = TRUE WHERE id = $1', [id]);
    await recordConversion(id, 'checkout_started', 'manual', 'premium', randomUUID());
    expect((await client.query("SELECT was_free FROM conversion_events WHERE event_name = 'checkout_started'")).rows[0].was_free).toBe(false);
  });
  it('counts unique opportunities, dynamic limits, expiration, and excludes inactive accounts', async () => {
    const id = await user(), expired = await user(), paid = await user(), inactive = await user();
    for (const uid of [id, expired, paid, inactive]) {
      await client.query('INSERT INTO recipes SELECT $1::uuid FROM generate_series(1,4)', [uid]);
      await event(uid, 'recipe_limit', 1, 'blocked');
      await event(uid, 'recipe_limit', 1, 'blocked');
    }
    await client.query("UPDATE users SET is_premium = TRUE, premium_until = NOW() - INTERVAL '1 day' WHERE id=$1", [expired]);
    await client.query('UPDATE users SET is_premium = TRUE WHERE id=$1', [paid]);
    await client.query("UPDATE users SET last_seen_at = NOW() - INTERVAL '40 days' WHERE id=$1", [inactive]);
    const data = (await client.query(opportunitiesSql, [4])).rows[0].data;
    expect(data.atLimit).toBe(2);
    expect(data.blocked).toBe(2);
    expect(data.distribution).toEqual([{ count: 4, users: 2 }]);
    expect((await client.query(opportunitiesSql, [5])).rows[0].data.nearLimit).toBe(2);
  });
  it('attributes the first payment to one source and excludes immature cohorts, late payments, trials and previous payers', async () => {
    const converted = await user();
    await event(converted, 'recipe_limit', 12);
    await event(converted, 'recipe_limit', 11);
    await event(converted, 'store', 10);
    await payment(converted, 9);
    await payment(converted, 8, 1999, 'RENEWAL');
    const immature = await user(); await event(immature, 'recipe_limit', 2); await payment(immature, 1);
    const late = await user(); await event(late, 'recipe_limit', 20); await payment(late, 10);
    const trial = await user(); await event(trial, 'recipe_limit', 15); await payment(trial, 14, 0);
    const previous = await user(); await payment(previous, 40); await event(previous, 'recipe_limit', 10); await payment(previous, 9);
    const manual = await user(); await event(manual, 'recipe_limit', 12); await payment(manual, 11);
    await client.query("UPDATE premium_events SET source='app_sync' WHERE user_id=$1", [manual]);
    const rows = (await client.query(conversionFunnelSql)).rows;
    expect(rows.find(r => r.source === 'recipe_limit')).toMatchObject({ viewed: 6, eligible: 4, converted: 1 });
    expect(rows.find(r => r.source === 'store')).toMatchObject({ eligible: 0, converted: 0 });
  });
});
