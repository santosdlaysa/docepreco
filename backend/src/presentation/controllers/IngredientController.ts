import { Request, Response } from 'express';
import { CreateIngredientUseCase } from '../../application/use-cases/ingredient/CreateIngredientUseCase';
import { GetIngredientsUseCase } from '../../application/use-cases/ingredient/GetIngredientsUseCase';
import { UpdateIngredientUseCase } from '../../application/use-cases/ingredient/UpdateIngredientUseCase';
import { DeleteIngredientUseCase } from '../../application/use-cases/ingredient/DeleteIngredientUseCase';
import { PostgresIngredientRepository } from '../../infrastructure/repositories/PostgresIngredientRepository';
import { AuthRequest } from '../middleware/authMiddleware';

const ingredientRepo = new PostgresIngredientRepository();

export class IngredientController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const useCase = new GetIngredientsUseCase(ingredientRepo);
      const ingredients = await useCase.execute(req.userId!);
      res.json({ success: true, data: ingredients });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ingredient = await ingredientRepo.findById(req.params.id, req.userId!);
      if (!ingredient) {
        res.status(404).json({ success: false, error: 'Ingredient not found' });
        return;
      }
      res.json({ success: true, data: ingredient });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const useCase = new CreateIngredientUseCase(ingredientRepo);
      const ingredient = await useCase.execute(req.body, req.userId!);
      res.status(201).json({ success: true, data: ingredient });
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
      const useCase = new UpdateIngredientUseCase(ingredientRepo);
      const ingredient = await useCase.execute(req.params.id, req.body, req.userId!);
      res.json({ success: true, data: ingredient });
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
      const useCase = new DeleteIngredientUseCase(ingredientRepo);
      await useCase.execute(req.params.id, req.userId!);
      res.json({ success: true, message: 'Ingredient deleted successfully' });
    } catch (error) {
      if (error instanceof Error && (error.message.includes('23503') || (error as any).code === '23503')) {
        res.status(409).json({ success: false, error: 'Ingrediente em uso em uma ou mais receitas' });
      } else if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }
}
