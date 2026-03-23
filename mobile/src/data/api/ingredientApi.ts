import { apiClient } from './client';
import { Ingredient, CreateIngredientDTO } from '../../domain/entities/Ingredient';

export const ingredientApi = {
  getAll: async (): Promise<Ingredient[]> => {
    const response = await apiClient.get('/ingredients');
    return response.data.data;
  },

  getById: async (id: string): Promise<Ingredient> => {
    const response = await apiClient.get(`/ingredients/${id}`);
    return response.data.data;
  },

  create: async (data: CreateIngredientDTO): Promise<Ingredient> => {
    const response = await apiClient.post('/ingredients', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateIngredientDTO>): Promise<Ingredient> => {
    const response = await apiClient.put(`/ingredients/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/ingredients/${id}`);
  },
};
