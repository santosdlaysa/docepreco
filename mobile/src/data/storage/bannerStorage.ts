import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@docepreco_dismissed_banners';

export const bannerStorage = {
  getDismissedIds: async (): Promise<string[]> => {
    const json = await AsyncStorage.getItem(KEY);
    if (!json) return [];
    return JSON.parse(json);
  },

  dismiss: async (id: string): Promise<void> => {
    const ids = await bannerStorage.getDismissedIds();
    if (!ids.includes(id)) {
      ids.push(id);
      await AsyncStorage.setItem(KEY, JSON.stringify(ids));
    }
  },

  clearExpired: async (activeIds: string[]): Promise<void> => {
    const ids = await bannerStorage.getDismissedIds();
    const filtered = ids.filter(id => activeIds.includes(id));
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
  },
};
