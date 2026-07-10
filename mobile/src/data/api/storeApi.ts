import { apiClient } from './client';
import { StoreAddon, StoreProduct, StoreSettings } from '../../domain/entities/StoreProduct';

type ProductInput = Omit<StoreProduct, 'id' | 'createdAt' | 'updatedAt'>;
type AddonInput = Pick<StoreAddon, 'name' | 'price'> & Partial<Pick<StoreAddon, 'available'>>;
type SettingsInput = Partial<Pick<StoreSettings, 'active' | 'storeName' | 'description' | 'acceptsDelivery' | 'acceptsPickup' | 'minOrderValue' | 'deliveryFee' | 'coverImageUrl' | 'paymentMethods' | 'address' | 'city' | 'category' | 'useBusinessHours' | 'businessHours'>>;

export const storeApi = {
  getProducts: async (): Promise<StoreProduct[]> => {
    const res = await apiClient.get('/store/products');
    return res.data.data;
  },

  createProduct: async (data: ProductInput): Promise<StoreProduct> => {
    const res = await apiClient.post('/store/products', data);
    return res.data.data;
  },

  updateProduct: async (id: string, data: Partial<ProductInput>): Promise<StoreProduct> => {
    const res = await apiClient.put(`/store/products/${id}`, data);
    return res.data.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(`/store/products/${id}`);
  },

  getSettings: async (): Promise<StoreSettings> => {
    const res = await apiClient.get('/store/settings');
    return res.data.data;
  },

  updateSettings: async (data: SettingsInput): Promise<StoreSettings> => {
    const res = await apiClient.put('/store/settings', data);
    return res.data.data;
  },

  getAddons: async (): Promise<StoreAddon[]> => {
    const res = await apiClient.get('/store/addons');
    return res.data.data;
  },

  createAddon: async (data: AddonInput): Promise<StoreAddon> => {
    const res = await apiClient.post('/store/addons', data);
    return res.data.data;
  },

  updateAddon: async (id: string, data: Partial<AddonInput>): Promise<StoreAddon> => {
    const res = await apiClient.put(`/store/addons/${id}`, data);
    return res.data.data;
  },

  deleteAddon: async (id: string): Promise<void> => {
    await apiClient.delete(`/store/addons/${id}`);
  },
};
