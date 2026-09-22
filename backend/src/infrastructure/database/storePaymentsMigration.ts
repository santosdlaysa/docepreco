import { PoolClient } from 'pg';

export async function migrateStorePayments(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS store_payment_config (
      id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents BETWEEN 0 AND 100000)
    );
    INSERT INTO store_payment_config (id) VALUES (TRUE) ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS store_payment_accounts (
      user_id UUID PRIMARY KEY REFERENCES users(id),
      collector_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      terms_version TEXT NOT NULL DEFAULT '2026-09-v1'
    );
    CREATE TABLE IF NOT EXISTS store_payment_oauth_states (
      state_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      verifier TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee_cents INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER;
    CREATE TABLE IF NOT EXISTS store_order_payments (
      order_id UUID PRIMARY KEY REFERENCES orders(id),
      user_id UUID NOT NULL REFERENCES users(id),
      collector_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      fee_cents INTEGER NOT NULL,
      preference_id TEXT,
      checkout_url TEXT,
      payment_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      processing_fee_cents INTEGER NOT NULL DEFAULT 0,
      refunded_cents INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE store_order_payments ADD COLUMN IF NOT EXISTS request_key UUID UNIQUE;
    ALTER TABLE store_order_payments ADD COLUMN IF NOT EXISTS stock_released BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}
