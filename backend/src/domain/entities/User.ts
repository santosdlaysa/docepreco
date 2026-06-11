export type PremiumPlatform = 'ios' | 'android' | 'manual' | 'card';

export type PlanTier = 'free' | 'premium' | 'master';

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
}

export interface RegisterDTO {
  companyName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}
