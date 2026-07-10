import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@docepreco_read_notifications';

/** Marca notificações (banners do app, pedidos recebidos, etc.) como lidas, por id prefixado (ex: "order:123"). */
export const notificationReadStorage = {
  getReadIds: async (): Promise<string[]> => {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  },

  markAllRead: async (ids: string[]): Promise<void> => {
    const existing = await notificationReadStorage.getReadIds();
    const merged = Array.from(new Set([...existing, ...ids]));
    await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  },

  /** Remove ids que não existem mais (banner expirado, etc.) para o storage não crescer para sempre. */
  clearExpired: async (validIds: string[]): Promise<void> => {
    const ids = await notificationReadStorage.getReadIds();
    const filtered = ids.filter(id => validIds.includes(id));
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
  },
};
