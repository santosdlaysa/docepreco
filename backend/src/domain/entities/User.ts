export type PremiumPlatform = 'ios' | 'android' | 'manual';

export interface User {
  id: string;
  companyName: string;
  email: string;
  instagramHandle: string | null;
  createdAt: string;
  isPremium: boolean;
  premiumUntil: string | null;
  premiumPlatform: PremiumPlatform | null;
}

export interface RegisterDTO {
  companyName: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}
