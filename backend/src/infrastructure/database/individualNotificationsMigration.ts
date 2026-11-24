import type { PoolClient } from 'pg';

export async function migrateIndividualNotifications(client: PoolClient): Promise<void> {
  await client.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_user_ids UUID[] NULL');
  await client.query('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_target_check');
  await client.query(`ALTER TABLE notifications ADD CONSTRAINT notifications_target_check
    CHECK (target IN ('all', 'premium', 'free', 'master', 'expired', 'individual'))`);
  await client.query('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_individual_recipients_check');
  await client.query(`ALTER TABLE notifications ADD CONSTRAINT notifications_individual_recipients_check CHECK (
    (target = 'individual' AND recipient_user_ids IS NOT NULL
      AND cardinality(recipient_user_ids) BETWEEN 1 AND 100
      AND array_position(recipient_user_ids, NULL) IS NULL)
    OR (target <> 'individual' AND recipient_user_ids IS NULL)
  )`);
}
