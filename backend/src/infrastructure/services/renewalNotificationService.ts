import { pool } from '../database/connection';
import { PostgresPushTokenRepository } from '../repositories/PostgresPushTokenRepository';
import { PostgresNotificationRepository } from '../repositories/PostgresNotificationRepository';
import { sendPushNotifications } from './pushService';

const DAYS_BEFORE_EXPIRY = 3;

/**
 * Busca usuários com premium_platform = 'manual' cuja mensalidade
 * expira nos próximos N dias e que ainda não receberam notificação
 * de renovação para esse período. Envia push notification individual.
 */
export async function checkManualRenewals(): Promise<void> {
  const result = await pool.query(
    `SELECT u.id, u.company_name, u.premium_until
     FROM users u
     WHERE u.is_premium = TRUE
       AND u.premium_platform = 'manual'
       AND u.premium_until IS NOT NULL
       AND u.premium_until <= NOW() + INTERVAL '${DAYS_BEFORE_EXPIRY} days'
       AND u.premium_until > NOW()
       AND NOT EXISTS (
         SELECT 1 FROM renewal_notifications_sent rns
         WHERE rns.user_id = u.id
           AND rns.premium_until = u.premium_until
       )`
  );

  if (result.rows.length === 0) {
    console.log('[Renewal] Nenhum usuário manual para notificar');
    return;
  }

  const tokenRepo = new PostgresPushTokenRepository();
  const notifRepo = new PostgresNotificationRepository();

  for (const user of result.rows) {
    const premiumUntil = new Date(user.premium_until);
    const diffMs = premiumUntil.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const title = 'Sua assinatura está expirando!';
    const body = diffDays <= 1
      ? `${user.company_name}, sua assinatura expira hoje! Renove para continuar usando todos os recursos premium.`
      : `${user.company_name}, sua assinatura expira em ${diffDays} dias. Renove para não perder os recursos premium!`;

    const tokens = await tokenRepo.findByUserId(user.id);
    if (tokens.length === 0) continue;

    const tokenStrings = tokens.map(t => t.token);
    const dataPayload = { type: 'renewal_reminder', premiumUntil: premiumUntil.toISOString() };
    const count = await sendPushNotifications(tokenStrings, title, body, dataPayload);

    // Registra na tabela notifications para aparecer no painel admin
    await notifRepo.create({
      title,
      body,
      dataJson: JSON.stringify(dataPayload),
      target: 'premium',
      status: 'sent',
    }).then(async (notif) => {
      await notifRepo.markSent(notif.id, count);
    });

    // Registra que a notificação foi enviada para evitar duplicatas
    await pool.query(
      `INSERT INTO renewal_notifications_sent (user_id, premium_until) VALUES ($1, $2)`,
      [user.id, premiumUntil]
    );

    console.log(`[Renewal] Notificação enviada para ${user.company_name} (${count} dispositivos) — expira em ${diffDays} dia(s)`);
  }
}
