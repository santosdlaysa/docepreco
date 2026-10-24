import type { PoolClient } from 'pg';

export async function migrateDeletedUsers(client: Pick<PoolClient, 'query'>): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS deleted_users (
      user_id UUID PRIMARY KEY,
      company_name VARCHAR(255),
      deleted_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('ALTER TABLE deleted_users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_deleted_users_date ON deleted_users (deleted_at DESC)');
}
