import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@docepreco_price_history';

export interface PriceEntry {
  price: number;
  purchaseQuantity: number;
  unit: string;
  date: string; // ISO
}

type PriceHistory = Record<string, PriceEntry[]>;

const getAll = async (): Promise<PriceHistory> => {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
};

export const priceHistoryStorage = {
  getForIngredient: async (id: string): Promise<PriceEntry[]> => {
    const all = await getAll();
    return all[id] ?? [];
  },
  addEntry: async (id: string, entry: PriceEntry): Promise<void> => {
    const all = await getAll();
    const entries = all[id] ?? [];
    entries.unshift(entry);
    if (entries.length > 24) entries.splice(24); // keep last 24 entries
    all[id] = entries;
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  },
  removeIngredient: async (id: string): Promise<void> => {
    const all = await getAll();
    delete all[id];
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  },
};
