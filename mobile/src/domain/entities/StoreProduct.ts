import { PaymentMethodType } from './Order';

export type DiscountType = 'percent' | 'fixed';

export interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  publicPrice: number;
  available: boolean;
  recipeId?: string;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Item adicional oferecido na loja online (ex.: cobertura extra, embalagem para presente). */
export interface StoreAddon {
  id: string;
  name: string;
  price: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreBusinessHours {
  dayOfWeek: number; // 0 = domingo ... 6 = sábado
  closed: boolean;
  openTime: string;  // "HH:mm"
  closeTime: string; // "HH:mm"
}

export interface StoreSettings {
  active: boolean;
  storeName: string;
  slug: string;
  storeLink: string;
  description?: string;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue?: number;
  deliveryFee?: number;
  coverImageUrl?: string;
  paymentMethods: PaymentMethodType[];
  address?: string;
  city?: string;
  category?: string;
  useBusinessHours: boolean;
  businessHours: StoreBusinessHours[];
  /** Calculado pelo backend no momento da consulta (ativa + dentro do horário, se aplicável). */
  isOpenNow?: boolean;
}
