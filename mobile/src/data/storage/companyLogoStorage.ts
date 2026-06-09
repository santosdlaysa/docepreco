import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const KEY = '@sweet_pricing_company_logo';
const LOGO_FILENAME = 'company_logo.jpg';

function getLogoPath(): string {
  return `${FileSystem.documentDirectory}${LOGO_FILENAME}`;
}

export const companyLogoStorage = {
  save: async (dataUri: string): Promise<void> => {
    const path = getLogoPath();
    // Extract pure base64 from data URI
    const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
    await FileSystem.writeAsStringAsync(path, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await AsyncStorage.setItem(KEY, path);
  },

  get: async (): Promise<string | null> => {
    try {
      const path = await AsyncStorage.getItem(KEY);
      if (!path) return null;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) {
        await AsyncStorage.removeItem(KEY);
        return null;
      }
      return path;
    } catch {
      return null;
    }
  },

  remove: async (): Promise<void> => {
    const path = await AsyncStorage.getItem(KEY);
    if (path) {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    }
    await AsyncStorage.removeItem(KEY);
  },
};
