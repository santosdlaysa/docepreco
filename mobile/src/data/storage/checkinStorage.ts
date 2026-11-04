import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@docepreco_checkin_modal_last_shown';

/** Controla a abertura automática do modal de check-in: no máximo uma vez por dia. */
export const checkinStorage = {
  wasShownToday: async (): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem(KEY);
      return stored === new Date().toDateString();
    } catch {
      return false;
    }
  },

  markShown: async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(KEY, new Date().toDateString());
    } catch {
      // best-effort — no pior caso o modal aparece de novo
    }
  },
};
