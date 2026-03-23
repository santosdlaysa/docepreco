import { apiClient } from './client';
import { Recipe, CreateRecipeDTO } from '../../domain/entities/Recipe';
import { CalculationResult } from '../../domain/entities/Calculation';

export const recipeApi = {
  getAll: async (): Promise<Recipe[]> => {
    const response = await apiClient.get('/recipes');
    return response.data.data;
  },

  getById: async (id: string): Promise<Recipe> => {
    const response = await apiClient.get(`/recipes/${id}`);
    return response.data.data;
  },

  create: async (data: CreateRecipeDTO): Promise<Recipe> => {
    const response = await apiClient.post('/recipes', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateRecipeDTO>): Promise<Recipe> => {
    const response = await apiClient.put(`/recipes/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/recipes/${id}`);
  },

  calculate: async (id: string): Promise<CalculationResult> => {
    const response = await apiClient.post(`/recipes/${id}/calculate`);
    return response.data.data;
  },
};
