import AsyncStorage from '@react-native-async-storage/async-storage';

// Guarda a sessão do admin enquanto ele navega o app "como empresa"
// (impersonação). Enquanto essas chaves existirem, a sessão ativa em
// tokenStorage pertence ao usuário-alvo, não ao admin.
const ADMIN_TOKEN_KEY = '@sweet_pricing_admin_backup_token';
const ADMIN_USER_KEY = '@sweet_pricing_admin_backup_user';

export const impersonationStorage = {
  saveAdminSession: async (token: string, user: object) => {
    await AsyncStorage.setItem(ADMIN_TOKEN_KEY, token);
    await AsyncStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  },

  getAdminSession: async (): Promise<{ token: string; user: any } | null> => {
    const token = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
    const rawUser = await AsyncStorage.getItem(ADMIN_USER_KEY);
    if (!token || !rawUser) return null;
    try {
      return { token, user: JSON.parse(rawUser) };
    } catch {
      return null;
    }
  },

  isActive: async (): Promise<boolean> =>
    Boolean(await AsyncStorage.getItem(ADMIN_TOKEN_KEY)),

  clear: async () => {
    await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
    await AsyncStorage.removeItem(ADMIN_USER_KEY);
  },
};
