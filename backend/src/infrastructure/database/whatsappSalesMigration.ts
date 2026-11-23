import { PoolClient } from 'pg';

export async function migrateWhatsAppSales(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_sale_links (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      phone VARCHAR(20) UNIQUE NOT NULL,
      linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS whatsapp_link_codes (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT UNIQUE NOT NULL,
      phone VARCHAR(20) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS whatsapp_sale_drafts (
      phone VARCHAR(20) PRIMARY KEY REFERENCES whatsapp_sale_links(phone) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      confirmation_code VARCHAR(12),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS whatsapp_sale_inbox (
      id BIGSERIAL PRIMARY KEY,
      message_id TEXT UNIQUE NOT NULL,
      phone VARCHAR(20) NOT NULL,
      body TEXT NOT NULL,
      message_at TIMESTAMPTZ NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      reply TEXT,
      sent_at TIMESTAMPTZ,
      attempts INTEGER NOT NULL DEFAULT 0,
      send_attempts INTEGER NOT NULL DEFAULT 0,
      retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS whatsapp_sale_inbox_pending ON whatsapp_sale_inbox(id) WHERE processed_at IS NULL;
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS sales_whatsapp_message_unique ON sales(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
  `);
}
