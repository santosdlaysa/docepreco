import { simulatePrice } from '../../domain/services/priceSimulation';
import { explainRecipe } from '../../infrastructure/services/recipeAssistant';
import { Request, Response } from 'express';
import { CreateRecipeUseCase } from '../../application/use-cases/recipe/CreateRecipeUseCase';
import { GetRecipesUseCase } from '../../application/use-cases/recipe/GetRecipesUseCase';
import { GetRecipeByIdUseCase } from '../../application/use-cases/recipe/GetRecipeByIdUseCase';
import { UpdateRecipeUseCase } from '../../application/use-cases/recipe/UpdateRecipeUseCase';
import { DeleteRecipeUseCase } from '../../application/use-cases/recipe/DeleteRecipeUseCase';
import { CalculateRecipeUseCase } from '../../application/use-cases/calculation/CalculateRecipeUseCase';
import { PostgresRecipeRepository } from '../../infrastructure/repositories/PostgresRecipeRepository';
import { PostgresIngredientRepository } from '../../infrastructure/repositories/PostgresIngredientRepository';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { AuthRequest } from '../middleware/authMiddleware';
import { canCreateMore, FREE_LIMITS, PREMIUM_ERROR_CODES, getUserRecipeLimit } from '../../domain/services/premium';
import { processReferralActivation } from '../../infrastructure/services/referralService';

import { recordConversion } from '../../infrastructure/services/conversionService';
import { getInactiveRecipeIds } from '../../domain/services/recipeAccess';
import { PostgresRewardedAdRepository } from '../../infrastructure/repositories/PostgresRewardedAdRepository';

const recipeRepo = new PostgresRecipeRepository();
const ingredientRepo = new PostgresIngredientRepository();
const userRepo = new PostgresUserRepository();
const rewardedAdRepo = new PostgresRewardedAdRepository();

export class RecipeController {
  private async allowRecipes(userId: string, ids: string[], res: Response): Promise<boolean> {
    const inactiveIds = await getInactiveRecipeIds(userId);
    if (!ids.some(id => inactiveIds.has(id))) return true;
    res.status(403).json({
      success: false,
      code: 'RECIPE_INACTIVE',
      error: 'Receita inativa no plano gratuito. Assine o Premium para liberar o acesso.',
    });
    return false;
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const useCase = new GetRecipesUseCase(recipeRepo);
      const recipes = await useCase.execute(req.userId!);
      const inactiveIds = await getInactiveRecipeIds(req.userId!);
      res.json({ success: true, data: recipes.map(recipe => inactiveIds.has(recipe.id)
        ? { ...recipe, isActive: false, ingredients: [], additionalCosts: [], subRecipes: [] }
        : { ...recipe, isActive: true }) });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!await this.allowRecipes(req.userId!, [req.params.id], res)) return;
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
    let rewardedCreditId: string | null = null;
    let rewardedCreditAttached = false;
    try {
      // Premium gate: enforce free tier limit
      const user = await userRepo.findById(req.userId!);
      if (!user) {
        res.status(401).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }
      const count = await userRepo.countRecipes(req.userId!);
      const freeRecipeLimit = await getUserRecipeLimit(req.userId!);
      if (!canCreateMore(user, 'recipes', count, freeRecipeLimit)) {
        rewardedCreditId = await rewardedAdRepo.claimRecipeCredit(req.userId!);
        if (!rewardedCreditId) {
          void recordConversion(req.userId!, 'blocked', 'recipe_limit', 'premium');
          res.status(403).json({ success: false, error: `Você atingiu o limite de ${freeRecipeLimit} receitas do plano gratuito. Assine o Premium para criar mais.`, code: PREMIUM_ERROR_CODES.recipes, limit: freeRecipeLimit, current: count });
          return;
        }
      }

      const subIds = (req.body.subRecipes ?? []).map((sub: { subRecipeId: string }) => sub.subRecipeId);
      if (subIds.length && !await this.allowRecipes(req.userId!, subIds, res)) return;
      const useCase = new CreateRecipeUseCase(recipeRepo);
      const recipe = await useCase.execute(req.body, req.userId!);
      if (rewardedCreditId) {
        await rewardedAdRepo.attachCreditToRecipe(rewardedCreditId, req.userId!, recipe.id);
        rewardedCreditAttached = true;
      }
      // Programa de indicação: a 1ª receita (count era 0 antes de criar) valida
      // a indicação do usuário, se houver. Fire-and-forget.
      if (count === 0) {
        processReferralActivation(req.userId!).catch(() => {});
      }
      res.status(201).json({ success: true, data: recipe });
    } catch (error) {
      // Se o salvamento falhar antes de associar a receita, o crédito volta a ficar disponível.
      if (rewardedCreditId && !rewardedCreditAttached) {
        rewardedAdRepo.returnRecipeCredit(rewardedCreditId, req.userId!).catch(() => {});
      }
      if (error instanceof Error) {
        const status = error.message.includes('already exists') ? 409 : 400;
        res.status(status).json({ success: false, error: error.message });
      } else {
        res.locals.errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const subIds = (req.body.subRecipes ?? []).map((sub: { subRecipeId: string }) => sub.subRecipeId);
      if (!await this.allowRecipes(req.userId!, [req.params.id, ...subIds], res)) return;
      const useCase = new UpdateRecipeUseCase(recipeRepo);
      const recipe = await useCase.execute(req.params.id, req.body, req.userId!);
      res.json({ success: true, data: recipe });
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes('already exists') ? 409 : 400;
        res.status(status).json({ success: false, error: error.message });
      } else {
        res.locals.errorMessage = error instanceof Error ? error.message : String(error);
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
        res.locals.errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async assist(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) { res.status(401).json({ success: false, error: 'Autenticação necessária.' }); return; }
      const { discount = 0, quantity = 1, currency = 'BRL' } = req.body ?? {};
      if (typeof discount !== 'number' || typeof quantity !== 'number' ||
          !['BRL', 'USD', 'EUR', 'GBP', 'NZD', 'ARS', 'CLP', 'COP', 'MXN'].includes(currency)) {
        res.status(400).json({ success: false, error: 'Parâmetros de simulação inválidos.' }); return;
      }
      if (!await this.allowRecipes(req.userId, [req.params.id], res)) return;
      const recipe = await recipeRepo.findById(req.params.id, req.userId);
      if (!recipe) { res.status(404).json({ success: false, error: 'Receita não encontrada.' }); return; }
      const calculation = await new CalculateRecipeUseCase(recipeRepo, ingredientRepo).execute(recipe.id, req.userId);
      let simulation;
      try { simulation = simulatePrice(calculation, discount, quantity); }
      catch (error) { res.status(400).json({ success: false, error: (error as Error).message }); return; }
      if (!process.env.OPENAI_API_KEY?.trim()) {
        res.status(503).json({ success: false, error: 'Assistente de IA ainda não configurada. A precificação continua disponível.' }); return;
      }
      const text = await explainRecipe({ name: recipe.name.slice(0, 200), currency, calculation, simulation,
        additionalCosts: recipe.additionalCosts.slice(0, 30).map(c => ({ name: c.name.slice(0, 100), value: c.value, costType: c.costType })) });
      res.json({ success: true, data: { simulation, text } });
    } catch {
      res.status(502).json({ success: false, error: 'Não foi possível gerar a análise agora. Tente novamente em instantes.' });
    }
  }

  async calculate(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!await this.allowRecipes(req.userId!, [req.params.id], res)) return;
      const useCase = new CalculateRecipeUseCase(recipeRepo, ingredientRepo);
      const result = await useCase.execute(req.params.id, req.userId!);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.locals.errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }
}
