import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@docepreco_revenue_goal';

export interface RevenueGoal {
  amount: number;
  month: number; // 0–11
  year: number;
}

export const goalStorage = {
  get: async (): Promise<RevenueGoal | null> => {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set: async (goal: RevenueGoal): Promise<void> => {
    await AsyncStorage.setItem(KEY, JSON.stringify(goal));
  },
  clear: async (): Promise<void> => {
    await AsyncStorage.removeItem(KEY);
  },
};
