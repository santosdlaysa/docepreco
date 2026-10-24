import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresRewardedAdRepository, REWARDED_RECIPE_DAILY_LIMIT } from '../../infrastructure/repositories/PostgresRewardedAdRepository';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { canCreateMore, getFreeRecipeLimit } from '../../domain/services/premium';

const repo = new PostgresRewardedAdRepository();
const users = new PostgresUserRepository();
const KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
let cachedKeys: { expiresAt: number; keys: Map<string, string> } | null = null;

async function getAdMobKey(keyId: string): Promise<string | null> {
  if (!cachedKeys || cachedKeys.expiresAt < Date.now()) {
    const response = await fetch(KEYS_URL);
    if (!response.ok) throw new Error('Não foi possível buscar as chaves do AdMob');
    const data = await response.json() as { keys?: Array<{ keyId: number; pem: string }> };
    cachedKeys = { expiresAt: Date.now() + 24 * 60 * 60 * 1000, keys: new Map((data.keys ?? []).map(k => [String(k.keyId), k.pem])) };
  }
  return cachedKeys.keys.get(keyId) ?? null;
}

export class RewardedAdController {
  async startRecipeReward(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const user = await users.findById(userId);
      const limit = await getFreeRecipeLimit();
      const count = await users.countRecipes(userId);
      if (!user || canCreateMore(user, 'recipes', count, limit)) {
        res.status(400).json({ success: false, error: 'O anúncio só é necessário após atingir o limite gratuito.' }); return;
      }
      if (await repo.getTodayRewardCount(userId) >= REWARDED_RECIPE_DAILY_LIMIT) {
        res.status(429).json({ success: false, error: 'Você já usou as 3 liberações por anúncio de hoje.' }); return;
      }
      const session = await repo.createRecipeSession(userId);
      res.status(201).json({ success: true, data: { ...session, reward: '1 receita extra', dailyLimit: REWARDED_RECIPE_DAILY_LIMIT } });
    } catch { res.status(500).json({ success: false, error: 'Erro ao preparar o anúncio recompensado.' }); }
  }

  async getRecipeRewardStatus(req: AuthRequest, res: Response): Promise<void> {
    try { res.json({ success: true, data: { status: await repo.getSessionStatus(req.userId!, req.params.sessionId) } }); }
    catch { res.status(500).json({ success: false, error: 'Erro ao consultar a recompensa.' }); }
  }

  // URL pública cadastrada no painel AdMob. A assinatura ECDSA impede chamadas forjadas.
  async verifySsv(req: Request, res: Response): Promise<void> {
    try {
      const rawQuery = req.originalUrl.split('?')[1] ?? '';
      const signatureAt = rawQuery.indexOf('&signature=');
      const signatureMatch = rawQuery.match(/(?:^|&)signature=([^&]+)&key_id=([^&]+)$/);
      if (signatureAt < 0 || !signatureMatch) { res.status(400).send('invalid callback'); return; }
      const key = await getAdMobKey(decodeURIComponent(signatureMatch[2]));
      if (!key) { res.status(400).send('unknown key'); return; }
      const valid = crypto.verify('sha256', Buffer.from(rawQuery.slice(0, signatureAt)), key, Buffer.from(decodeURIComponent(signatureMatch[1]), 'base64url'));
      if (!valid) { res.status(400).send('invalid signature'); return; }
      const params = new URLSearchParams(rawQuery);
      const sessionId = params.get('custom_data');
      const transactionId = params.get('transaction_id');
      // O botão de teste do painel AdMob pode validar apenas a conectividade,
      // sem uma sessão criada pelo app. A assinatura já foi validada acima;
      // respondemos sucesso, mas nunca concedemos crédito sem os dois dados.
      if (!sessionId || !transactionId) { res.status(200).send('ok'); return; }
      await repo.grantVerifiedRecipeCredit(sessionId, transactionId);
      res.status(200).send('ok');
    } catch (error) { console.error('[RewardedAd] SSV error:', error); res.status(500).send('retry'); }
  }
}
