import AsyncStorage from '@react-native-async-storage/async-storage';
import { CarouselBanner } from '../api/bannerApi';

const KEY = '@docepreco_dismissed_banners';
const CAROUSEL_KEY = '@docepreco_carousel_cache';

/** Cache local dos banners patrocinados (com a imagem base64) para exibição
 *  instantânea/offline, evitando rebaixar a arte toda vez que a Home abre. */
export const carouselCache = {
  get: async (): Promise<CarouselBanner[]> => {
    try {
      const json = await AsyncStorage.getItem(CAROUSEL_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },
  set: async (banners: CarouselBanner[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(CAROUSEL_KEY, JSON.stringify(banners));
    } catch {
      // ignore — cache é best-effort
    }
  },
};

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
