import { Request, Response } from 'express';
import { CreateRecipeUseCase } from '../../application/use-cases/recipe/CreateRecipeUseCase';
import { GetRecipesUseCase } from '../../application/use-cases/recipe/GetRecipesUseCase';
import { GetRecipeByIdUseCase } from '../../application/use-cases/recipe/GetRecipeByIdUseCase';
import { UpdateRecipeUseCase } from '../../application/use-cases/recipe/UpdateRecipeUseCase';
import { DeleteRecipeUseCase } from '../../application/use-cases/recipe/DeleteRecipeUseCase';
import { CalculateRecipeUseCase } from '../../application/use-cases/calculation/CalculateRecipeUseCase';
import { PostgresRecipeRepository } from '../../infrastructure/repositories/PostgresRecipeRepository';
import { PostgresIngredientRepository } from '../../infrastructure/repositories/PostgresIngredientRepository';
import { AuthRequest } from '../middleware/authMiddleware';

const recipeRepo = new PostgresRecipeRepository();
const ingredientRepo = new PostgresIngredientRepository();

export class RecipeController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const useCase = new GetRecipesUseCase(recipeRepo);
      const recipes = await useCase.execute(req.userId!);
      res.json({ success: true, data: recipes });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const useCase = new GetRecipeByIdUseCase(recipeRepo);
      const recipe = await useCase.execute(req.params.id, req.userId!);
      if (!recipe) {
        res.status(404).json({ success: false, error: 'Recipe not found' });
        return;
      }
      res.json({ success: true, data: recipe });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const useCase = new CreateRecipeUseCase(recipeRepo);
      const recipe = await useCase.execute(req.body, req.userId!);
      res.status(201).json({ success: true, data: recipe });
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('already exists') ? 409 : 400;
        res.status(status).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const useCase = new UpdateRecipeUseCase(recipeRepo);
      const recipe = await useCase.execute(req.params.id, req.body, req.userId!);
      res.json({ success: true, data: recipe });
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('already exists') ? 409 : 400;
        res.status(status).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const useCase = new DeleteRecipeUseCase(recipeRepo);
      await useCase.execute(req.params.id, req.userId!);
      res.json({ success: true, message: 'Recipe deleted successfully' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async calculate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const useCase = new CalculateRecipeUseCase(recipeRepo, ingredientRepo);
      const result = await useCase.execute(req.params.id, req.userId!);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }
}
