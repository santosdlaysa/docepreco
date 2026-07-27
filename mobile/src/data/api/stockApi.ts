import { apiClient } from './client';
import { isDemoMode } from '../demo/demoMode';
import {
  StockState,
  StockMovement,
  getStockState as localGetStockState,
  getMovements as localGetMovements,
  setQty as localSetQty,
  addEntry as localAddEntry,
  applySaleDeduction as localApplySaleDeduction,
  computeUsageForSale,
} from '../stock/stockStorage';
import { Ingredient } from '../../domain/entities/Ingredient';
import { Recipe } from '../../domain/entities/Recipe';

/**
 * Estoque agora é persistido no backend (antes ficava só no AsyncStorage local).
 * Este módulo mantém a MESMA interface do antigo `stockStorage` para ser um
 * drop-in — convertendo o formato da API para o formato local que a tela usa.
 * As funções puras de cálculo (convertUnit, computeUsageForSale, getEntry,
 * unitCost) continuam vindo de `stockStorage`.
 * No modo demo (revisão das lojas) usamos o storage local.
 */

// Reexporta os tipos e utilitários puros para os consumidores.
export type { StockState, StockMovement, StockEntry, MovementType } from '../stock/stockStorage';
export { getEntry, unitCost, convertUnit, computeUsageForSale } from '../stock/stockStorage';

interface ApiStockItem {
  ingredientId: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  updatedAt: string;
}
interface ApiStockMovement {
  id: string;
  ingredientId: string;
  type: 'set' | 'in' | 'out';
  quantity: number;
  balance: number;
  reason: string | null;
  createdAt: string;
}

const fetchStock = async (): Promise<{ items: ApiStockItem[]; movements: ApiStockMovement[] }> => {
  const res = await apiClient.get('/stock');
  return res.data.data;
};

export const getStockState = async (): Promise<StockState> => {
  if (isDemoMode()) return localGetStockState();
  const { items } = await fetchStock();
  const state: StockState = {};
  for (const it of items) {
    state[it.ingredientId] = {
      qty: it.quantity,
      min: it.minQuantity,
      unit: it.unit as StockState[string]['unit'],
      updatedAt: it.updatedAt,
    };
  }
  return state;
};

const mapMovement = (m: ApiStockMovement): StockMovement => ({
  id: m.id,
  ingredientId: m.ingredientId,
  // 'out' vira 'sale' para reaproveitar o ícone de carrinho da tela.
  type: m.type === 'out' ? 'sale' : m.type,
  delta: m.type === 'in' ? m.quantity : m.type === 'out' ? -m.quantity : m.balance,
  balance: m.balance,
  note: m.reason ?? undefined,
  date: m.createdAt,
});

export const getMovements = async (): Promise<StockMovement[]> => {
  if (isDemoMode()) return localGetMovements();
  const { movements } = await fetchStock();
  return movements.map(mapMovement);
};

export const setQty = async (ingredient: Ingredient, qty: number, min: number): Promise<void> => {
  if (isDemoMode()) { await localSetQty(ingredient, qty, min); return; }
  await apiClient.put(`/stock/${ingredient.id}`, {
    quantity: qty,
    minQuantity: min,
    unit: ingredient.unit,
  });
};

export const addEntry = async (ingredient: Ingredient, qty: number, note?: string): Promise<void> => {
  if (isDemoMode()) { await localAddEntry(ingredient, qty, note); return; }
  await apiClient.post(`/stock/${ingredient.id}/entry`, {
    quantity: qty,
    unit: ingredient.unit,
    reason: note,
  });
};

/**
 * Baixa automática de estoque de uma venda. O cálculo de consumo (com
 * sub-receitas e conversão de unidade) continua no cliente; o backend só
 * aplica as baixas atomicamente e informa o que ficou em estoque baixo.
 */
export const applySaleDeduction = async (
  recipe: Recipe,
  allRecipes: Recipe[],
  ingredients: Ingredient[],
  quantitySold: number,
): Promise<{ id: string; name: string; balance: number; min: number }[]> => {
  if (isDemoMode()) return localApplySaleDeduction(recipe, allRecipes, ingredients, quantitySold);

  const usage = computeUsageForSale(recipe, allRecipes, ingredients, quantitySold);
  const items = Object.entries(usage)
    .filter(([, q]) => q > 0)
    .map(([ingredientId, quantity]) => ({ ingredientId, quantity, reason: `Venda · ${recipe.name}` }));
  if (items.length === 0) return [];

  try {
    const res = await apiClient.post('/stock/deduct', { items });
    const low = (res.data.data?.lowStock ?? []) as { ingredientId: string; balance: number; minQuantity: number }[];
    const nameById = new Map(ingredients.map(i => [i.id, i.name]));
    return low.map(l => ({
      id: l.ingredientId,
      name: nameById.get(l.ingredientId) ?? '',
      balance: l.balance,
      min: l.minQuantity,
    }));
  } catch {
    return [];
  }
};
