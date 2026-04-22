import { Unit } from '../../domain/entities/Ingredient';

export interface SuggestedIngredient {
  name: string;
  quantityUsed: number;
  unit: Unit;
  /** Default purchase info — used when auto-creating the ingredient. */
  purchaseQuantity: number;
  purchasePrice: number;
}

export interface SuggestedRecipe {
  name: string;
  yield: number;
  profitMargin: number;
  ingredients: SuggestedIngredient[];
}

export const SUGGESTED_RECIPES: SuggestedRecipe[] = [
  {
    name: 'Brigadeiro Gourmet',
    yield: 30,
    profitMargin: 100,
    ingredients: [
      { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
      { name: 'Chocolate em po', quantityUsed: 100, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
      { name: 'Manteiga', quantityUsed: 15, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
      { name: 'Creme de leite', quantityUsed: 200, unit: 'g', purchaseQuantity: 200, purchasePrice: 4.29 },
      { name: 'Granulado', quantityUsed: 100, unit: 'g', purchaseQuantity: 500, purchasePrice: 6.99 },
    ],
  },
  {
    name: 'Bolo de Cenoura com Cobertura',
    yield: 15,
    profitMargin: 70,
    ingredients: [
      { name: 'Cenoura', quantityUsed: 300, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
      { name: 'Oleo de soja', quantityUsed: 200, unit: 'ml', purchaseQuantity: 900, purchasePrice: 8.99 },
      { name: 'Ovos', quantityUsed: 3, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
      { name: 'Acucar', quantityUsed: 300, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
      { name: 'Farinha de trigo', quantityUsed: 300, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
      { name: 'Fermento em po', quantityUsed: 10, unit: 'g', purchaseQuantity: 100, purchasePrice: 5.49 },
      { name: 'Chocolate em po', quantityUsed: 80, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
      { name: 'Leite', quantityUsed: 100, unit: 'ml', purchaseQuantity: 1000, purchasePrice: 6.49 },
    ],
  },
  {
    name: 'Bolo de Pote',
    yield: 10,
    profitMargin: 100,
    ingredients: [
      { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
      { name: 'Creme de leite', quantityUsed: 200, unit: 'g', purchaseQuantity: 200, purchasePrice: 4.29 },
      { name: 'Chocolate em po', quantityUsed: 50, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
      { name: 'Farinha de trigo', quantityUsed: 200, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
      { name: 'Ovos', quantityUsed: 2, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
      { name: 'Acucar', quantityUsed: 150, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
      { name: 'Leite', quantityUsed: 200, unit: 'ml', purchaseQuantity: 1000, purchasePrice: 6.49 },
    ],
  },
  {
    name: 'Beijinho',
    yield: 30,
    profitMargin: 100,
    ingredients: [
      { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
      { name: 'Coco ralado', quantityUsed: 100, unit: 'g', purchaseQuantity: 100, purchasePrice: 5.49 },
      { name: 'Manteiga', quantityUsed: 15, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
    ],
  },
  {
    name: 'Brownie',
    yield: 12,
    profitMargin: 100,
    ingredients: [
      { name: 'Chocolate meio amargo', quantityUsed: 200, unit: 'g', purchaseQuantity: 400, purchasePrice: 16.99 },
      { name: 'Manteiga', quantityUsed: 100, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
      { name: 'Acucar', quantityUsed: 200, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
      { name: 'Ovos', quantityUsed: 3, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
      { name: 'Farinha de trigo', quantityUsed: 80, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
      { name: 'Chocolate em po', quantityUsed: 30, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
    ],
  },
  {
    name: 'Palha Italiana',
    yield: 20,
    profitMargin: 100,
    ingredients: [
      { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
      { name: 'Chocolate em po', quantityUsed: 80, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
      { name: 'Manteiga', quantityUsed: 30, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
      { name: 'Biscoito maisena', quantityUsed: 200, unit: 'g', purchaseQuantity: 400, purchasePrice: 5.99 },
    ],
  },
  {
    name: 'Trufa de Chocolate',
    yield: 20,
    profitMargin: 100,
    ingredients: [
      { name: 'Chocolate meio amargo', quantityUsed: 300, unit: 'g', purchaseQuantity: 400, purchasePrice: 16.99 },
      { name: 'Creme de leite', quantityUsed: 200, unit: 'g', purchaseQuantity: 200, purchasePrice: 4.29 },
      { name: 'Chocolate em po', quantityUsed: 100, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
    ],
  },
  {
    name: 'Bolo Red Velvet',
    yield: 15,
    profitMargin: 100,
    ingredients: [
      { name: 'Farinha de trigo', quantityUsed: 280, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
      { name: 'Acucar', quantityUsed: 250, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
      { name: 'Ovos', quantityUsed: 2, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
      { name: 'Chocolate em po', quantityUsed: 20, unit: 'g', purchaseQuantity: 200, purchasePrice: 8.99 },
      { name: 'Oleo de soja', quantityUsed: 240, unit: 'ml', purchaseQuantity: 900, purchasePrice: 8.99 },
      { name: 'Corante vermelho', quantityUsed: 30, unit: 'ml', purchaseQuantity: 60, purchasePrice: 7.99 },
      { name: 'Cream cheese', quantityUsed: 300, unit: 'g', purchaseQuantity: 300, purchasePrice: 12.99 },
      { name: 'Manteiga', quantityUsed: 60, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
      { name: 'Leite', quantityUsed: 240, unit: 'ml', purchaseQuantity: 1000, purchasePrice: 6.49 },
    ],
  },
  {
    name: 'Mousse de Maracuja',
    yield: 8,
    profitMargin: 70,
    ingredients: [
      { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
      { name: 'Creme de leite', quantityUsed: 200, unit: 'g', purchaseQuantity: 200, purchasePrice: 4.29 },
      { name: 'Suco de maracuja concentrado', quantityUsed: 200, unit: 'ml', purchaseQuantity: 500, purchasePrice: 9.99 },
      { name: 'Gelatina sem sabor', quantityUsed: 12, unit: 'g', purchaseQuantity: 12, purchasePrice: 2.99 },
    ],
  },
  {
    name: 'Cookie Americano',
    yield: 15,
    profitMargin: 100,
    ingredients: [
      { name: 'Farinha de trigo', quantityUsed: 280, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
      { name: 'Manteiga', quantityUsed: 115, unit: 'g', purchaseQuantity: 200, purchasePrice: 9.49 },
      { name: 'Acucar', quantityUsed: 100, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
      { name: 'Acucar mascavo', quantityUsed: 100, unit: 'g', purchaseQuantity: 500, purchasePrice: 7.99 },
      { name: 'Ovos', quantityUsed: 1, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
      { name: 'Gotas de chocolate', quantityUsed: 200, unit: 'g', purchaseQuantity: 300, purchasePrice: 11.99 },
      { name: 'Fermento em po', quantityUsed: 5, unit: 'g', purchaseQuantity: 100, purchasePrice: 5.49 },
    ],
  },
  {
    name: 'Coxinha Gourmet',
    yield: 20,
    profitMargin: 70,
    ingredients: [
      { name: 'Peito de frango', quantityUsed: 500, unit: 'g', purchaseQuantity: 1000, purchasePrice: 19.99 },
      { name: 'Cream cheese', quantityUsed: 150, unit: 'g', purchaseQuantity: 300, purchasePrice: 12.99 },
      { name: 'Farinha de trigo', quantityUsed: 500, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.99 },
      { name: 'Caldo de galinha', quantityUsed: 20, unit: 'g', purchaseQuantity: 45, purchasePrice: 3.49 },
      { name: 'Leite', quantityUsed: 500, unit: 'ml', purchaseQuantity: 1000, purchasePrice: 6.49 },
      { name: 'Ovos', quantityUsed: 2, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
      { name: 'Farinha de rosca', quantityUsed: 200, unit: 'g', purchaseQuantity: 500, purchasePrice: 5.99 },
    ],
  },
  {
    name: 'Pudim de Leite',
    yield: 10,
    profitMargin: 70,
    ingredients: [
      { name: 'Leite condensado', quantityUsed: 395, unit: 'g', purchaseQuantity: 395, purchasePrice: 7.49 },
      { name: 'Leite', quantityUsed: 400, unit: 'ml', purchaseQuantity: 1000, purchasePrice: 6.49 },
      { name: 'Ovos', quantityUsed: 3, unit: 'unit', purchaseQuantity: 12, purchasePrice: 14.99 },
      { name: 'Acucar', quantityUsed: 200, unit: 'g', purchaseQuantity: 1000, purchasePrice: 5.49 },
    ],
  },
];
