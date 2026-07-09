import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@docepreco_custom_products';
const MAX_ENTRIES = 50;

const getAll = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const save = async (names: string[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(names));
};

export const customProductStorage = {
  getAll,

  /** Adiciona um nome ao topo da lista, sem duplicatas, limitando ao máximo. */
  add: async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = await getAll();
    const filtered = existing.filter(n => n.toLowerCase() !== trimmed.toLowerCase());
    await save([trimmed, ...filtered].slice(0, MAX_ENTRIES));
  },

  remove: async (name: string): Promise<void> => {
    const existing = await getAll();
    await save(existing.filter(n => n.toLowerCase() !== name.toLowerCase()));
  },
};
