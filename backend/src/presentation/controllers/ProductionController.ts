import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { normalizeDateToISO } from '../../domain/utils/date';
import { buildProductionPlan } from '../../domain/services/productionPlanner';
import { PostgresOrderRepository } from '../../infrastructure/repositories/PostgresOrderRepository';
import { PostgresRecipeRepository } from '../../infrastructure/repositories/PostgresRecipeRepository';
import { PostgresIngredientRepository } from '../../infrastructure/repositories/PostgresIngredientRepository';
import { PostgresStockRepository } from '../../infrastructure/repositories/PostgresStockRepository';

export async function getProductionPlan(req: AuthRequest, res: Response): Promise<void> {
  const { start, end } = req.query;
  if (typeof start !== 'string' || typeof end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || normalizeDateToISO(start) !== start || normalizeDateToISO(end) !== end || start > end) {
    res.status(400).json({ success: false, message: 'Informe um período válido, com início anterior ou igual ao fim.' });
    return;
  }
  try {
    const userId = req.userId!;
    const [orders, recipes, ingredients, stock] = await Promise.all([
      new PostgresOrderRepository().findAll(userId),
      new PostgresRecipeRepository().findAll(userId),
      new PostgresIngredientRepository().findAll(userId),
      new PostgresStockRepository().getState(userId),
    ]);
    res.json({ success: true, data: buildProductionPlan(start, end, orders, recipes, ingredients, stock.items) });
  } catch (error) {
    res.locals.errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: 'Não foi possível gerar o plano de produção. Tente novamente.' });
  }
}
