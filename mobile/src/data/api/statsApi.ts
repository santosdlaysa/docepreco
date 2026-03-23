import { apiClient } from './client';

export interface AppStats {
  recipesCount: number;
  ingredientsCount: number;
  monthlySalesCount: number;
  monthlyRevenue: number;
  recentSales: {
    id: string;
    recipeName: string;
    quantitySold: number;
    totalRevenue: number;
    saleDate: string;
  }[];
}

export const statsApi = {
  getStats: async (): Promise<AppStats> => {
    const response = await apiClient.get('/stats');
    return response.data.data;
  },
};
