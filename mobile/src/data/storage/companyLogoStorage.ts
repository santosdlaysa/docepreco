import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@sweet_pricing_company_logo';

export const companyLogoStorage = {
  save: (base64: string) => AsyncStorage.setItem(KEY, base64),
  get: () => AsyncStorage.getItem(KEY),
  remove: () => AsyncStorage.removeItem(KEY),
};
