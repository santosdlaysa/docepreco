export type PurchasePaymentStatus = 'paid' | 'pending';

export interface PurchaseInvoiceItem {
  id: string;
  ingredientId: string;
  description: string;
  quantity: number;
  unit: string;
  total: number;
  updateIngredientPrice: boolean;
}

export interface PurchaseInvoice {
  id: string;
  userId: string;
  supplier: string;
  documentNumber: string | null;
  purchaseDate: string;
  paymentMethod: string | null;
  paymentStatus: PurchasePaymentStatus;
  subtotal: number;
  discount: number;
  freight: number;
  total: number;
  notes: string | null;
  attachmentUrl: string | null;
  items: PurchaseInvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseInvoiceDTO {
  supplier: string;
  documentNumber?: string | null;
  purchaseDate: string;
  paymentMethod?: string | null;
  paymentStatus: PurchasePaymentStatus;
  discount?: number;
  freight?: number;
  notes?: string | null;
  attachmentUrl?: string | null;
  items: Array<{
    ingredientId: string;
    description?: string;
    quantity: number;
    unit: string;
    total: number;
    updateIngredientPrice?: boolean;
  }>;
}
