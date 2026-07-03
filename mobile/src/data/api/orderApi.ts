import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';
import { Order } from '../../domain/entities/Order';

const LOCAL_KEY = '@docepreco_orders';
const MIGRATED_KEY = '@docepreco_orders_migrated';

/**
 * Migra (uma única vez) as encomendas que estavam salvas localmente no
 * aparelho para o servidor, para nada se perder. Os dados locais NÃO são
 * apagados — ficam como backup. Após a migração, tudo passa a vir da conta.
 */
async function ensureMigrated(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(MIGRATED_KEY);
    if (done) return;
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    const local: Order[] = raw ? JSON.parse(raw) : [];
    for (const o of local) {
      const { id, createdAt, ...data } = o as Order;
      await apiClient.post('/orders', data).catch(() => {});
    }
    await AsyncStorage.setItem(MIGRATED_KEY, new Date().toISOString());
  } catch {
    // se falhar, tenta de novo na próxima vez (flag não é gravada)
  }
}

export const orderApi = {
  getAll: async (): Promise<Order[]> => {
    await ensureMigrated();
    const res = await apiClient.get('/orders');
    return res.data.data;
  },

  getById: async (id: string): Promise<Order | null> => {
    try {
      const res = await apiClient.get(`/orders/${id}`);
      return res.data.data;
    } catch {
      return null;
    }
  },

  create: async (data: Omit<Order, 'id' | 'createdAt'>): Promise<Order> => {
    const res = await apiClient.post('/orders', data);
    return res.data.data;
  },

  // saleRegistered indica que o backend registrou a venda automaticamente
  // (integração encomendas → vendas, disparada ao marcar como entregue).
  update: async (id: string, data: Partial<Omit<Order, 'id' | 'createdAt'>>): Promise<(Order & { saleRegistered?: boolean }) | null> => {
    const res = await apiClient.put(`/orders/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/orders/${id}`);
  },
};
