import { Recipe, CreateRecipeDTO } from '../entities/Recipe';

export interface IRecipeRepository {
  findAll(userId: string): Promise<Recipe[]>;
  findById(id: string, userId: string): Promise<Recipe | null>;
  findByName(name: string, userId: string, excludeId?: string): Promise<Recipe | null>;
  create(data: CreateRecipeDTO, userId: string): Promise<Recipe>;
  update(id: string, data: Partial<CreateRecipeDTO>, userId: string): Promise<Recipe | null>;
  delete(id: string, userId: string): Promise<boolean>;
}
