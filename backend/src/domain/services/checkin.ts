export type CheckinRewardTier = 'premium' | 'master';

export interface CheckinConfig {
  enabled: boolean;
  /** Dias de check-in para ganhar o prêmio. */
  daysRequired: number;
  /** Dias de plano liberados pelo prêmio. */
  rewardDays: number;
  rewardTier: CheckinRewardTier;
  /** true = os dias precisam ser seguidos; perder um dia zera a contagem. */
  consecutive: boolean;
  /** Prêmios por pessoa (0 = sem limite). */
  maxRewardsPerUser: number;
  title: string;
  message: string;
}

export const DEFAULT_CHECKIN_CONFIG: CheckinConfig = {
  enabled: false,
  daysRequired: 5,
  rewardDays: 7,
  rewardTier: 'premium',
  consecutive: true,
  maxRewardsPerUser: 1,
  title: 'Check-in diário',
  message: 'Faça check-in todos os dias e ganhe Premium grátis.',
};

const clampInt = (raw: unknown, min: number, max: number, fallback: number): number => {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const text = (raw: unknown, max: number, fallback: string): string =>
  typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, max) : fallback;

/** Faz merge de um config parcial (do banco ou do painel) com os defaults, validando cada campo. */
export function normalizeCheckinConfig(raw: Partial<CheckinConfig> | null | undefined): CheckinConfig {
  const d = DEFAULT_CHECKIN_CONFIG;
  const r = raw ?? {};
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : d.enabled,
    daysRequired: clampInt(r.daysRequired, 1, 60, d.daysRequired),
    rewardDays: clampInt(r.rewardDays, 1, 90, d.rewardDays),
    rewardTier: r.rewardTier === 'master' ? 'master' : r.rewardTier === 'premium' ? 'premium' : d.rewardTier,
    consecutive: typeof r.consecutive === 'boolean' ? r.consecutive : d.consecutive,
    maxRewardsPerUser: clampInt(r.maxRewardsPerUser, 0, 100, d.maxRewardsPerUser),
    title: text(r.title, 60, d.title),
    message: text(r.message, 200, d.message),
  };
}

/** Dia anterior de uma data YYYY-MM-DD. */
export function previousDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Quantos dias contam no ciclo atual.
 * `days` são os check-ins do ciclo (posteriores ao último prêmio), YYYY-MM-DD em ordem decrescente.
 * No modo seguido, a sequência continua viva se o último check-in foi hoje ou ontem.
 */
export function computeCheckinProgress(days: string[], today: string, consecutive: boolean): number {
  if (!consecutive) return days.length;
  if (days.length === 0) return 0;
  let expected = days[0] === today ? today : previousDay(today);
  let streak = 0;
  for (const day of days) {
    if (day !== expected) break;
    streak++;
    expected = previousDay(expected);
  }
  return streak;
}
