import type { PoolClient } from 'pg';

export async function migrateCheckins(client: Pick<PoolClient, 'query'>): Promise<void> {
  // Um check-in por pessoa por dia (dia no fuso de Brasília).
  await client.query(`
    CREATE TABLE IF NOT EXISTS activity_checkins (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, day)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_activity_checkins_day ON activity_checkins (day)');

  // Cada prêmio fecha um ciclo: a contagem recomeça a partir do dia do prêmio.
  await client.query(`
    CREATE TABLE IF NOT EXISTS checkin_rewards (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day DATE NOT NULL,
      reward_days INTEGER NOT NULL,
      tier VARCHAR(10) NOT NULL,
      premium_until TIMESTAMP NOT NULL,
      premium_event_id UUID NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_checkin_rewards_user ON checkin_rewards (user_id, day DESC)');
}
