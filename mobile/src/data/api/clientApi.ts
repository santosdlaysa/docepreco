import { apiClient } from './client';
import { Client } from '../../domain/entities/Client';
import { isDemoMode } from '../demo/demoMode';
import { clientStorage } from '../storage/clientStorage';

type CreateClientData = Omit<Client, 'id' | 'createdAt'>;

/**
 * Clientes agora são persistidos no backend (antes ficavam só no AsyncStorage
 * local). Mantemos a mesma interface do antigo `clientStorage` para ser um
 * drop-in. No modo demo (revisão das lojas) usamos o storage local, para o
 * fluxo funcionar offline sem tocar em dados reais.
 */
export const clientApi = {
  getAll: async (): Promise<Client[]> => {
    if (isDemoMode()) return clientStorage.getAll();
    const res = await apiClient.get('/clients');
    return res.data.data;
  },

  getById: async (id: string): Promise<Client | null> => {
    if (isDemoMode()) return clientStorage.getById(id);
    const all = await clientApi.getAll();
    return all.find(c => c.id === id) ?? null;
  },

  create: async (data: CreateClientData): Promise<Client> => {
    if (isDemoMode()) return clientStorage.create(data);
    const res = await apiClient.post('/clients', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<CreateClientData>): Promise<Client | null> => {
    if (isDemoMode()) return clientStorage.update(id, data);
    const res = await apiClient.put(`/clients/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    if (isDemoMode()) return clientStorage.delete(id);
    await apiClient.delete(`/clients/${id}`);
  },
};
