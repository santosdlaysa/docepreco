import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCOUNT_CREATED_AT_KEY = '@docepreco_account_created_at';
const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Guarda localmente quando esta conta foi criada para personalizar a primeira experiência. */
export const accountEngagementStorage = {
  markAccountCreated: () => AsyncStorage.setItem(ACCOUNT_CREATED_AT_KEY, new Date().toISOString()),

  isRecentAccount: async (): Promise<boolean> => {
    const createdAt = await AsyncStorage.getItem(ACCOUNT_CREATED_AT_KEY);
    if (!createdAt) return false;

    const timestamp = new Date(createdAt).getTime();
    return Number.isFinite(timestamp) && Date.now() - timestamp >= 0 && Date.now() - timestamp <= NEW_ACCOUNT_WINDOW_MS;
  },
};
