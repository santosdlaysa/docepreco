import { User } from '../entities/User';

export const FREE_LIMITS = {
  recipes: 6,
} as const;

export type LimitedFeature = keyof typeof FREE_LIMITS;

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
 * Returns true if the user can create another item of the given feature.
 */
export function canCreateMore(
  user: Pick<User, 'isPremium' | 'premiumUntil'>,
  feature: LimitedFeature,
  currentCount: number
): boolean {
  if (isActivePremium(user)) return true;
  return currentCount < FREE_LIMITS[feature];
}

export const PREMIUM_ERROR_CODES = {
  recipes: 'RECIPE_LIMIT',
} as const;
