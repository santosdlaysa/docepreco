import { Ingredient, CreateIngredientDTO } from '../entities/Ingredient';

export interface IIngredientRepository {
  findAll(userId: string): Promise<Ingredient[]>;
  findById(id: string, userId: string): Promise<Ingredient | null>;
  findByIds(ids: string[]): Promise<Ingredient[]>;
  findByName(name: string, userId: string, excludeId?: string): Promise<Ingredient | null>;
  create(data: CreateIngredientDTO, userId: string): Promise<Ingredient>;
  update(id: string, data: Partial<CreateIngredientDTO>, userId: string): Promise<Ingredient | null>;
  delete(id: string, userId: string): Promise<boolean>;
}
