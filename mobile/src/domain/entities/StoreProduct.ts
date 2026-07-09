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
}
