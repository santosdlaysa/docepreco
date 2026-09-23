import { PoolClient } from 'pg';

export async function migrateConversions(client: Pick<PoolClient, 'query'>): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversion_events (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID UNIQUE,
        event_name VARCHAR(30) NOT NULL CHECK (event_name IN ('blocked','offer_viewed','offer_clicked','checkout_started')),
        source VARCHAR(40) NOT NULL,
        target_tier VARCHAR(10) NOT NULL CHECK (target_tier IN ('premium','master')),
        was_free BOOLEAN NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_conversion_created ON conversion_events (created_at, source)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_conversion_user ON conversion_events (user_id, created_at)');
}
