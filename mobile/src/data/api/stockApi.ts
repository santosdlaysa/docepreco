import AsyncStorage from '@react-native-async-storage/async-storage';
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
 * Migração única (por aparelho) do estoque que ficava salvo LOCALMENTE
 * (AsyncStorage, versões antigas do app) para o SERVIDOR. Como o estoque só
 * passou a persistir no backend em 27/07/2026, aparelhos com build antigo têm
 * saldos guardados só localmente — esta função os "pega e grava" no servidor.
 *
 * Regras para não perder nem duplicar nada:
 *  - roda no máximo uma vez por aparelho (flag em AsyncStorage);
 *  - NÃO sobrescreve itens que já existem no servidor (se um segundo aparelho
 *    migrar depois, ele só preenche os ingredientes que ainda faltam);
 *  - um item problemático (ex.: ingrediente removido) é pulado, não trava o resto.
 * Retorna quantos itens foram enviados.
 */
const MIGRATION_FLAG = '@docepreco_stock_migrated_v1';

export const migrateLocalStockToServer = async (ingredients: Ingredient[]): Promise<number> => {
  if (isDemoMode()) return 0;
  try {
    if (await AsyncStorage.getItem(MIGRATION_FLAG)) return 0;
    const local = await localGetStockState();
    const ids = Object.keys(local);
    if (ids.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG, '1');
      return 0;
    }
    const server = await getStockState();
    const ingById = new Map(ingredients.map(i => [i.id, i]));
    let migrated = 0;
    for (const id of ids) {
      if (server[id]) continue; // já existe no servidor → preserva o que está lá
      const ing = ingById.get(id);
      const entry = local[id];
      if (!ing || !entry) continue;
      try {
        await setQty(ing, entry.qty, entry.min ?? 0);
        migrated++;
      } catch { /* ingrediente inválido no servidor → pula */ }
    }
    await AsyncStorage.setItem(MIGRATION_FLAG, '1');
    return migrated;
  } catch {
    // Falha de rede ao ler o servidor: não marca a flag para tentar de novo depois.
    return 0;
  }
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

/**
 * Estorna a baixa de estoque de uma venda (usado ao EDITAR uma venda: estorna o
 * consumo antigo e depois reaplica o novo via applySaleDeduction). Devolve ao
 * estoque exatamente o que a venda havia consumido — mesma base de cálculo do
 * deduct, então é simétrico. Best-effort: falhas não quebram a edição.
 */
export const reverseSaleDeduction = async (
  recipe: Recipe,
  allRecipes: Recipe[],
  ingredients: Ingredient[],
  quantitySold: number,
): Promise<void> => {
  const usage = computeUsageForSale(recipe, allRecipes, ingredients, quantitySold);
  const ingById = new Map(ingredients.map(i => [i.id, i]));
  for (const [ingredientId, qty] of Object.entries(usage)) {
    if (qty <= 0) continue;
    const ing = ingById.get(ingredientId);
    if (!ing) continue;
    try {
      await addEntry(ing, qty, `Estorno edição · ${recipe.name}`);
    } catch { /* best-effort */ }
  }
};
