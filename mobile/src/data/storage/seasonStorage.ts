import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@docepreco_seasons';

export interface Season {
  id: string;
  name: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  multiplier: number; // e.g. 1.2 = +20%
}

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const getAll = async (): Promise<Season[]> => {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
};

export const seasonStorage = {
  getAll,

  getActive: async (): Promise<Season | null> => {
    const seasons = await getAll();
    const today = new Date().toISOString().slice(0, 10);
    return seasons.find(s => s.startDate <= today && s.endDate >= today) ?? null;
  },

  create: async (data: Omit<Season, 'id'>): Promise<Season> => {
    const seasons = await getAll();
    const season: Season = { ...data, id: generateId() };
    seasons.push(season);
    await AsyncStorage.setItem(KEY, JSON.stringify(seasons));
    return season;
  },

  update: async (id: string, data: Omit<Season, 'id'>): Promise<void> => {
    const seasons = await getAll();
    const idx = seasons.findIndex(s => s.id === id);
    if (idx !== -1) {
      seasons[idx] = { id, ...data };
      await AsyncStorage.setItem(KEY, JSON.stringify(seasons));
    }
  },

  delete: async (id: string): Promise<void> => {
    const seasons = await getAll();
    await AsyncStorage.setItem(KEY, JSON.stringify(seasons.filter(s => s.id !== id)));
  },
};
