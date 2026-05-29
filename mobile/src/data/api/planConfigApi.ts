import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://docepreco.onrender.com/api';

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
      const { data } = await axios.get<{ success: boolean; data: PlanConfig }>(
        `${BASE_URL}/admin/settings/plans`,
        { timeout: 10000 },
      );
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
