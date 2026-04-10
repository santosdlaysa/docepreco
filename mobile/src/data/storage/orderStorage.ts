import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order } from '../../domain/entities/Order';

const STORAGE_KEY = '@docepreco_orders';

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const getAll = async (): Promise<Order[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const save = async (orders: Order[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

export const orderStorage = {
  getAll,

  getById: async (id: string): Promise<Order | null> => {
    const orders = await getAll();
    return orders.find(o => o.id === id) ?? null;
  },

  create: async (data: Omit<Order, 'id' | 'createdAt'>): Promise<Order> => {
    const orders = await getAll();
    const order: Order = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    orders.unshift(order);
    await save(orders);
    return order;
  },

  update: async (id: string, data: Partial<Omit<Order, 'id' | 'createdAt'>>): Promise<Order | null> => {
    const orders = await getAll();
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    orders[idx] = { ...orders[idx], ...data };
    await save(orders);
    return orders[idx];
  },

  delete: async (id: string): Promise<void> => {
    const orders = await getAll();
    await save(orders.filter(o => o.id !== id));
  },
};
