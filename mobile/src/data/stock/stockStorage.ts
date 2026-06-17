import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient, Unit } from '../../domain/entities/Ingredient';
import { Recipe } from '../../domain/entities/Recipe';
import { getIngredientUnitPrice } from '../../domain/services/ingredientPricing';

/**
 * Controle de estoque (Master).
 *
 * O backend ainda não persiste estoque de ingredientes, então mantemos o saldo
 * localmente (AsyncStorage). O saldo de cada ingrediente é guardado na unidade
 * base do próprio ingrediente. A baixa automática é
 * disparada ao registrar uma venda — consome os ingredientes da receita
 * vendida, resolvendo sub-receitas recursivamente.
 */

const STOCK_KEY = '@docepreco_stock_v1';
const MOVES_KEY = '@docepreco_stock_moves_v1';
const MOVES_CAP = 200;

export interface StockEntry {
  qty: number;        // saldo atual, na unidade do ingrediente
  min: number;        // estoque mínimo para alerta (0 = sem alerta)
  unit: Unit;
  updatedAt: string;
}

export type StockState = Record<string, StockEntry>;

export type MovementType = 'set' | 'in' | 'sale' | 'adjust';

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredientName?: string;
  type: MovementType;
  delta: number;      // variação aplicada (+ entrada, - saída)
  balance: number;    // saldo após o movimento
  note?: string;
  date: string;       // ISO
}

const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** Converte uma quantidade entre unidades compatíveis (massa ou volume). */
export const convertUnit = (qty: number, from: string, to: string): number => {
  if (from === to) return qty;
  if (from === 'g' && to === 'kg') return qty / 1000;
  if (from === 'kg' && to === 'g') return qty * 1000;
  if (from === 'ml' && to === 'l') return qty / 1000;
  if (from === 'l' && to === 'ml') return qty * 1000;
  if (from === 'oz' && to === 'lb') return qty / 16;
  if (from === 'lb' && to === 'oz') return qty * 16;
  if (from === 'tsp' && to === 'tbsp') return qty / 3;
  if (from === 'tbsp' && to === 'tsp') return qty * 3;
  if (from === 'tbsp' && to === 'fl_oz') return qty / 2;
  if (from === 'fl_oz' && to === 'tbsp') return qty * 2;
  if (from === 'fl_oz' && to === 'cup') return qty / 8;
  if (from === 'cup' && to === 'fl_oz') return qty * 8;
  if (from === 'tsp' && to === 'fl_oz') return qty / 6;
  if (from === 'fl_oz' && to === 'tsp') return qty * 6;
  if (from === 'tsp' && to === 'cup') return qty / 48;
  if (from === 'cup' && to === 'tsp') return qty * 48;
  if (from === 'tbsp' && to === 'cup') return qty / 16;
  if (from === 'cup' && to === 'tbsp') return qty * 16;
  return qty; // unidades incompatíveis ou 'unit' → mantém o valor
};

export const getStockState = async (): Promise<StockState> => {
  const json = await AsyncStorage.getItem(STOCK_KEY);
  return json ? JSON.parse(json) : {};
};

const saveStockState = async (state: StockState): Promise<void> => {
  await AsyncStorage.setItem(STOCK_KEY, JSON.stringify(state));
};

export const getMovements = async (): Promise<StockMovement[]> => {
  const json = await AsyncStorage.getItem(MOVES_KEY);
  return json ? JSON.parse(json) : [];
};

const pushMovements = async (moves: StockMovement[]): Promise<void> => {
  if (moves.length === 0) return;
  const existing = await getMovements();
  const next = [...moves, ...existing].slice(0, MOVES_CAP);
  await AsyncStorage.setItem(MOVES_KEY, JSON.stringify(next));
};

export const getEntry = (state: StockState, ingredient: Ingredient): StockEntry =>
  state[ingredient.id] ?? { qty: 0, min: 0, unit: ingredient.unit, updatedAt: '' };

/** Define o saldo absoluto de um ingrediente (ex.: inventário manual). */
export const setQty = async (
  ingredient: Ingredient,
  qty: number,
  min: number,
): Promise<StockState> => {
  const state = await getStockState();
  const prev = state[ingredient.id]?.qty ?? 0;
  state[ingredient.id] = {
    qty,
    min,
    unit: ingredient.unit,
    updatedAt: new Date().toISOString(),
  };
  await saveStockState(state);
  await pushMovements([{
    id: genId(),
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    type: 'set',
    delta: qty - prev,
    balance: qty,
    note: 'Saldo ajustado',
    date: new Date().toISOString(),
  }]);
  return state;
};

/** Registra uma entrada (reposição) somando ao saldo atual. */
export const addEntry = async (
  ingredient: Ingredient,
  qty: number,
  note?: string,
): Promise<StockState> => {
  const state = await getStockState();
  const prev = state[ingredient.id]?.qty ?? 0;
  const min = state[ingredient.id]?.min ?? 0;
  const balance = prev + qty;
  state[ingredient.id] = {
    qty: balance,
    min,
    unit: ingredient.unit,
    updatedAt: new Date().toISOString(),
  };
  await saveStockState(state);
  await pushMovements([{
    id: genId(),
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    type: 'in',
    delta: qty,
    balance,
    note: note || 'Entrada de estoque',
    date: new Date().toISOString(),
  }]);
  return state;
};

/**
 * Consumo de ingredientes por lote (yield) de uma receita, resolvendo
 * sub-receitas recursivamente. Retorna a quantidade na unidade de cada
 * ingrediente. `scale` multiplica o consumo (1 = um lote completo).
 */
const accumulateUsage = (
  recipe: Recipe,
  recipeById: Record<string, Recipe>,
  unitById: Record<string, Unit>,
  scale: number,
  out: Record<string, number>,
  depth: number,
): void => {
  if (depth > 6) return; // proteção contra sub-receitas cíclicas
  for (const ing of recipe.ingredients ?? []) {
    const targetUnit = unitById[ing.ingredientId] ?? (ing.unit as Unit);
    const qty = convertUnit(ing.quantityUsed, ing.unit, targetUnit) * scale;
    out[ing.ingredientId] = (out[ing.ingredientId] ?? 0) + qty;
  }
  for (const sub of recipe.subRecipes ?? []) {
    const subRecipe = recipeById[sub.subRecipeId];
    if (!subRecipe || !subRecipe.yield) continue;
    // quantidade usada da sub-receita / o que ela rende = nº de lotes consumidos
    const subScale = scale * (sub.quantityUsed / subRecipe.yield);
    accumulateUsage(subRecipe, recipeById, unitById, subScale, out, depth + 1);
  }
};

/**
 * Consumo de ingredientes (na unidade de cada um) ao produzir/vender
 * `quantitySold` unidades de uma receita.
 */
export const computeUsageForSale = (
  recipe: Recipe,
  allRecipes: Recipe[],
  ingredients: Ingredient[],
  quantitySold: number,
): Record<string, number> => {
  if (!recipe.yield) return {};
  const recipeById: Record<string, Recipe> = {};
  for (const r of allRecipes) recipeById[r.id] = r;
  const unitById: Record<string, Unit> = {};
  for (const i of ingredients) unitById[i.id] = i.unit;

  const perBatch: Record<string, number> = {};
  accumulateUsage(recipe, recipeById, unitById, 1, perBatch, 0);

  const scale = quantitySold / recipe.yield;
  const usage: Record<string, number> = {};
  for (const [id, qty] of Object.entries(perBatch)) usage[id] = qty * scale;
  return usage;
};

/**
 * Aplica a baixa de estoque de uma venda. Só desconta ingredientes que já
 * possuem saldo registrado (não cria saldo negativo do nada para itens que o
 * usuário nunca controlou). Retorna a lista de ingredientes que ficaram em
 * estoque baixo/negativo após a baixa.
 */
export const applySaleDeduction = async (
  recipe: Recipe,
  allRecipes: Recipe[],
  ingredients: Ingredient[],
  quantitySold: number,
): Promise<{ id: string; name: string; balance: number; min: number }[]> => {
  const usage = computeUsageForSale(recipe, allRecipes, ingredients, quantitySold);
  const state = await getStockState();
  const ingById: Record<string, Ingredient> = {};
  for (const i of ingredients) ingById[i.id] = i;

  const moves: StockMovement[] = [];
  const lowStock: { id: string; name: string; balance: number; min: number }[] = [];
  const nowIso = new Date().toISOString();

  for (const [id, qty] of Object.entries(usage)) {
    const entry = state[id];
    const ing = ingById[id];
    // Só dá baixa em ingredientes que o usuário já controla no estoque.
    if (!entry || !ing || qty <= 0) continue;
    const balance = Math.round((entry.qty - qty) * 1000) / 1000;
    state[id] = { ...entry, qty: balance, updatedAt: nowIso };
    moves.push({
      id: genId(),
      ingredientId: id,
      ingredientName: ing.name,
      type: 'sale',
      delta: -qty,
      balance,
      note: `Venda · ${recipe.name}`,
      date: nowIso,
    });
    if (balance <= entry.min || balance <= 0) {
      lowStock.push({ id, name: ing.name, balance, min: entry.min });
    }
  }

  if (moves.length > 0) {
    await saveStockState(state);
    await pushMovements(moves);
  }
  return lowStock;
};

/** Custo por unidade base do ingrediente (na unidade do ingrediente). */
export const unitCost = (ing: Ingredient): number => getIngredientUnitPrice(ing);
