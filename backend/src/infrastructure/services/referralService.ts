import { PostgresReferralRepository } from '../repositories/PostgresReferralRepository';
import { PostgresPushTokenRepository } from '../repositories/PostgresPushTokenRepository';
import { PostgresUserRepository } from '../repositories/PostgresUserRepository';
import { sendPushNotifications } from './pushService';
import { notifyPremiumEvent } from './telegramService';
import { REWARD_DAYS } from '../../domain/services/referral';

const referralRepo = new PostgresReferralRepository();
const pushTokenRepo = new PostgresPushTokenRepository();
const userRepo = new PostgresUserRepository();

/**
 * Notifica o indicador que ganhou a recompensa (push + telegram). Best-effort.
 */
async function notifyReward(referrerId: string, rewardsGranted: number): Promise<void> {
  const days = rewardsGranted * REWARD_DAYS;
  try {
    const tokens = await pushTokenRepo.findByUserId(referrerId);
    if (tokens.length > 0) {
      await sendPushNotifications(
        tokens.map((t) => t.token),
        'Você ganhou Premium! 🎉',
        `Suas indicações renderam ${days} dias de acesso completo. Obrigado por divulgar o DocePreço!`,
        { screen: 'Referral' }
      );
    }
  } catch {
    /* push é best-effort */
  }
  try {
    const user = await userRepo.findById(referrerId);
    notifyPremiumEvent(user?.companyName ?? 'Usuário', 'REFERRAL_REWARD', 'referral');
  } catch {
    /* telegram é best-effort */
  }
}

/**
 * Chamado (fire-and-forget) quando um indicado realiza a ação de ativação
 * (cria a 1ª receita). Marca a indicação como válida e, se o indicador
 * completou um lote de indicações, concede a recompensa e o notifica.
 */
export async function processReferralActivation(referredId: string): Promise<void> {
  try {
    const referrerId = await referralRepo.activateReferral(referredId);
    if (!referrerId) return;
    const { rewardsGranted } = await referralRepo.grantRewardIfEligible(referrerId);
    if (rewardsGranted > 0) await notifyReward(referrerId, rewardsGranted);
  } catch (err) {
    console.error('[Referral] Falha ao processar ativação:', err);
  }
}

/**
 * Concede recompensa após o admin forçar uma indicação como válida.
 */
export async function processManualValidation(referrerId: string): Promise<void> {
  try {
    const { rewardsGranted } = await referralRepo.grantRewardIfEligible(referrerId);
    if (rewardsGranted > 0) await notifyReward(referrerId, rewardsGranted);
  } catch (err) {
    console.error('[Referral] Falha ao processar validação manual:', err);
  }
}
