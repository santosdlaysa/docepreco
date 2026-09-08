import { apiClient } from './client';
import { Unit } from '../../domain/entities/Ingredient';

export type PurchasePaymentStatus = 'paid' | 'pending';
export interface PurchaseInvoiceItem {
  id: string;
  ingredientId: string;
  description: string;
  quantity: number;
  unit: Unit;
  total: number;
  updateIngredientPrice: boolean;
}
export interface PurchaseInvoice {
  id: string;
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
  items: PurchaseInvoiceItem[];
  createdAt: string;
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
  items: Array<{
    ingredientId: string;
    quantity: number;
    unit: Unit;
    total: number;
    updateIngredientPrice: boolean;
  }>;
}

export const purchaseApi = {
  getAll: async (month?: string): Promise<PurchaseInvoice[]> => {
    const response = await apiClient.get('/purchases', { params: month ? { month } : {} });
    return response.data.data;
  },
  create: async (data: CreatePurchaseInvoiceDTO): Promise<PurchaseInvoice> => {
    const response = await apiClient.post('/purchases', data);
    return response.data.data;
  },
};
