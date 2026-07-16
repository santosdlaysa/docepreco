import { User, PlanTier } from '../entities/User';
import { pool } from '../../infrastructure/database/connection';

const TIER_RANK: Record<PlanTier, number> = { free: 0, premium: 1, master: 2 };

export const FREE_LIMITS = {
  recipes: 3,
} as const;

export type LimitedFeature = keyof typeof FREE_LIMITS;

/**
 * Returns the free recipe limit from app_settings (plan_free_recipe_limit).
 * Falls back to the hardcoded FREE_LIMITS.recipes if not configured.
 */
export async function getFreeRecipeLimit(): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'plan_free_recipe_limit'`
    );
    if (result.rows.length > 0) {
      const parsed = parseInt(result.rows[0].value);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // fall through to default
  }
  return FREE_LIMITS.recipes;
}

/**
 * Returns true if the user has an active premium subscription right now.
 * Respects premium_until expiration even if is_premium is still true in the DB
 * (defense in depth for late webhooks).
 */
export function isActivePremium(user: Pick<User, 'isPremium' | 'premiumUntil'>): boolean {
  if (!user.isPremium) return false;
  if (user.premiumUntil === null) return true; // lifetime / manual
  return new Date(user.premiumUntil).getTime() > Date.now();
}

/**
 * The user's currently-active tier, respecting expiration. A paid tier whose
 * premium_until has passed counts as 'free' (defense in depth for late webhooks).
 */
export function getActiveTier(user: Pick<User, 'planTier' | 'premiumUntil'>): PlanTier {
  if (user.planTier === 'free') return 'free';
  if (user.premiumUntil !== null && new Date(user.premiumUntil).getTime() <= Date.now()) {
    return 'free';
  }
  return user.planTier;
}

/** True if the user's active tier is at least `tier` (master ⊇ premium ⊇ free). */
export function hasTier(user: Pick<User, 'planTier' | 'premiumUntil'>, tier: PlanTier): boolean {
  return TIER_RANK[getActiveTier(user)] >= TIER_RANK[tier];
}

/**
 * Fragmento SQL: usuário (alias `u` da tabela users) com plano pago vigente.
 * Espelha getActiveTier — tier pago com premium_until vencido conta como free.
 * Usado para esconder lojas de assinantes expirados das listagens públicas.
 */
export const PAID_PLAN_ACTIVE_SQL =
  `(u.plan_tier IN ('premium', 'master') AND (u.premium_until IS NULL OR u.premium_until > NOW()))`;

/**
 * Returns true if the user can create another item of the given feature.
 * Accepts an optional dynamic limit override (from app_settings).
 */
export function canCreateMore(
  user: Pick<User, 'isPremium' | 'premiumUntil'>,
  feature: LimitedFeature,
  currentCount: number,
  limitOverride?: number
): boolean {
  if (isActivePremium(user)) return true;
  const limit = limitOverride ?? FREE_LIMITS[feature];
  return currentCount < limit;
}

export const PREMIUM_ERROR_CODES = {
  recipes: 'RECIPE_LIMIT',
} as const;
