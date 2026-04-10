import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '../../domain/entities/Client';

const STORAGE_KEY = '@docepreco_clients';

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const getAll = async (): Promise<Client[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const save = async (clients: Client[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
};

export const clientStorage = {
  getAll,

  getById: async (id: string): Promise<Client | null> => {
    const clients = await getAll();
    return clients.find(c => c.id === id) ?? null;
  },

  create: async (data: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
    const clients = await getAll();
    const client: Client = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    clients.unshift(client);
    await save(clients);
    return client;
  },

  update: async (id: string, data: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client | null> => {
    const clients = await getAll();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return null;
    clients[idx] = { ...clients[idx], ...data };
    await save(clients);
    return clients[idx];
  },

  delete: async (id: string): Promise<void> => {
    const clients = await getAll();
    await save(clients.filter(c => c.id !== id));
  },
};
