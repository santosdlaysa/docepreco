import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@sweet_pricing_token';
const USER_KEY = '@sweet_pricing_user';

export const tokenStorage = {
  saveToken: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  getToken: () => AsyncStorage.getItem(TOKEN_KEY),
  removeToken: () => AsyncStorage.removeItem(TOKEN_KEY),

  saveUser: (user: object) => AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  getUser: async () => {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  removeUser: () => AsyncStorage.removeItem(USER_KEY),

  clear: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  },
};
