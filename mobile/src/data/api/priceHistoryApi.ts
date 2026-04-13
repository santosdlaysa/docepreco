import { apiClient } from './client';

export interface PriceEntry {
  id: string;
  ingredientId: string;
  price: number;
  purchaseQuantity: number;
  unit: string;
  recordedAt: string;
}

export const priceHistoryApi = {
  getForIngredient: async (ingredientId: string): Promise<PriceEntry[]> => {
    const response = await apiClient.get(`/ingredients/${ingredientId}/price-history`);
    return response.data.data;
  },

  add: async (ingredientId: string, entry: { price: number; purchaseQuantity: number; unit: string; recordedAt?: string }): Promise<PriceEntry> => {
    const response = await apiClient.post(`/ingredients/${ingredientId}/price-history`, entry);
    return response.data.data;
  },
};
