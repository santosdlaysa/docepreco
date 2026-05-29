import { apiClient } from './client';

interface PlanConfig {
  freeRecipeLimit: number;
  premiumPrice: number;
  premiumFeatures: string[];
  freeFeatures: string[];
}

let cachedLimit: number | null = null;

export const planConfigApi = {
  async getFreeRecipeLimit(): Promise<number> {
    if (cachedLimit !== null) return cachedLimit;
    try {
      const { data } = await apiClient.get<{ success: boolean; data: PlanConfig }>('/admin/settings/plans');
      cachedLimit = data.data.freeRecipeLimit;
      return cachedLimit;
    } catch {
      return 3; // fallback
    }
  },

  clearCache() {
    cachedLimit = null;
  },
};
