export type PremiumPlatform = 'ios' | 'android' | 'manual' | 'card';

export type PlanTier = 'free' | 'premium' | 'master';

/**
 * Versão atual do termo de consentimento LGPD. Ao mudar o texto de forma
 * relevante, incremente esta versão para exigir um novo aceite dos usuários.
 */
export const LGPD_VERSION = '1';

export interface User {
  id: string;
  companyName: string;
  email: string;
  phone: string | null;
  instagramHandle: string | null;
  createdAt: string;
  isPremium: boolean;
  planTier: PlanTier;
  premiumUntil: string | null;
  premiumPlatform: PremiumPlatform | null;
  isActive: boolean;
  trial_used_at?: string | null;
  signupPlatform: 'ios' | 'android' | null;
  /** Custo por hora padrão de mão de obra (para pré-preencher receitas). */
  defaultHourlyRate: number | null;
  /** Data/hora em que o usuário aceitou o termo LGPD (null = ainda não aceitou). */
  lgpdAcceptedAt: string | null;
  /** Versão do termo LGPD que o usuário aceitou. */
  lgpdVersion: string | null;
}

export interface RegisterDTO {
  companyName: string;
  email: string;
  password: string;
  phone?: string;
  platform?: 'ios' | 'android';
}

export interface LoginDTO {
  email: string;
  password: string;
}
