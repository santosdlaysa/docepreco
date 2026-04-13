import { apiClient } from './client';

export interface RevenueGoal {
  id: string;
  amount: number;
  month: number;
  year: number;
}

export const goalApi = {
  get: async (month: number, year: number): Promise<RevenueGoal | null> => {
    const response = await apiClient.get(`/goals/${month}/${year}`);
    return response.data.data;
  },

  set: async (amount: number, month: number, year: number): Promise<RevenueGoal> => {
    const response = await apiClient.put(`/goals/${month}/${year}`, { amount });
    return response.data.data;
  },
};
