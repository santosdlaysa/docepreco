import { calculateRecipe, convertUnit, RecipeCalculationInput } from './recipeCalculator';
import { Ingredient } from '../entities/Ingredient';

type TestIngredient = Pick<Ingredient, 'id' | 'purchasePrice' | 'purchaseQuantity' | 'unit'>;

const makeIngredientMap = (list: TestIngredient[]) =>
  new Map(list.map(i => [i.id, i] as const));

describe('calculateRecipe', () => {
  describe('happy path', () => {
    it('calcula corretamente o preço de um bolo simples', () => {
      // Bolo usa 500g de farinha (pacote 1kg = R$10 → R$5) +
      // 200g de açúcar (pacote 1kg = R$8 → R$1.60) = R$6.60 em ingredientes
      // + R$4 de custo de energia
      // rende 10 fatias, margem 50%
      // Total cost = 6.60 + 4 = 10.60
      // Cost per unit = 1.06
      // Suggested price = 1.06 * 1.5 = 1.59
      // Estimated profit = (1.59 - 1.06) * 10 = 5.30
      const recipe: RecipeCalculationInput = {
        yield: 10,
        profitMargin: 50,
        ingredients: [
          { ingredientId: 'farinha', quantityUsed: 500, unit: 'g' },
          { ingredientId: 'acucar', quantityUsed: 200, unit: 'g' },
        ],
        additionalCosts: [{ name: 'Energia', value: 4 }],
      };
      const ingredients = makeIngredientMap([
        { id: 'farinha', purchasePrice: 10, purchaseQuantity: 1000, unit: 'g' },
        { id: 'acucar', purchasePrice: 8, purchaseQuantity: 1000, unit: 'g' },
      ]);

      const result = calculateRecipe(recipe, ingredients);

      expect(result.ingredientsCost).toBeCloseTo(6.6, 5);
      expect(result.additionalCostTotal).toBe(4);
      expect(result.totalCost).toBeCloseTo(10.6, 5);
      expect(result.costPerUnit).toBeCloseTo(1.06, 5);
      expect(result.suggestedPrice).toBeCloseTo(1.59, 5);
      expect(result.estimatedProfit).toBeCloseTo(5.3, 5);
      expect(result.profitMargin).toBe(50);
    });

    it('retorna 0 para receita sem ingredientes e sem custos', () => {
      const result = calculateRecipe(
        { yield: 1, profitMargin: 100, ingredients: [], additionalCosts: [] },
        makeIngredientMap([])
      );

      expect(result.ingredientsCost).toBe(0);
      expect(result.additionalCostTotal).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.costPerUnit).toBe(0);
      expect(result.suggestedPrice).toBe(0);
      expect(result.estimatedProfit).toBe(0);
    });

    it('suporta múltiplos custos adicionais', () => {
      const result = calculateRecipe(
        {
          yield: 1,
          profitMargin: 0,
          ingredients: [],
          additionalCosts: [
            { name: 'Gás', value: 2 },
            { name: 'Embalagem', value: 3 },
            { name: 'Energia', value: 1.5 },
          ],
        },
        makeIngredientMap([])
      );

      expect(result.additionalCostTotal).toBe(6.5);
      expect(result.totalCost).toBe(6.5);
      expect(result.costPerUnit).toBe(6.5);
      expect(result.suggestedPrice).toBe(6.5); // margem 0
      expect(result.estimatedProfit).toBe(0);
    });

    it('aplica margem de lucro corretamente', () => {
      const ingredients = makeIngredientMap([
        { id: 'i1', purchasePrice: 100, purchaseQuantity: 100, unit: 'g' }, // R$1/un
      ]);

      const margem100 = calculateRecipe(
        {
          yield: 1,
          profitMargin: 100,
          ingredients: [{ ingredientId: 'i1', quantityUsed: 10, unit: 'g' }],
          additionalCosts: [],
        },
        ingredients
      );
      expect(margem100.costPerUnit).toBe(10);
      expect(margem100.suggestedPrice).toBe(20);

      const margem200 = calculateRecipe(
        {
          yield: 1,
          profitMargin: 200,
          ingredients: [{ ingredientId: 'i1', quantityUsed: 10, unit: 'g' }],
          additionalCosts: [],
        },
        ingredients
      );
      expect(margem200.suggestedPrice).toBe(30);
    });

    it('divide o custo pelo rendimento corretamente', () => {
      const result = calculateRecipe(
        {
          yield: 20,
          profitMargin: 0,
          ingredients: [],
          additionalCosts: [{ name: 'X', value: 100 }],
        },
        makeIngredientMap([])
      );
      expect(result.costPerUnit).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('ignora silenciosamente ingredientes cujo id não existe no map', () => {
      const result = calculateRecipe(
        {
          yield: 1,
          profitMargin: 0,
          ingredients: [
            { ingredientId: 'existe', quantityUsed: 100, unit: 'g' },
            { ingredientId: 'nao-existe', quantityUsed: 999, unit: 'g' },
          ],
          additionalCosts: [],
        },
        makeIngredientMap([
          { id: 'existe', purchasePrice: 10, purchaseQuantity: 100, unit: 'g' },
        ])
      );

      // só conta o ingrediente que existe: 10/100 * 100 = 10
      expect(result.ingredientsCost).toBe(10);
    });

    it('lança erro quando yield é zero', () => {
      expect(() =>
        calculateRecipe(
          { yield: 0, profitMargin: 0, ingredients: [], additionalCosts: [] },
          makeIngredientMap([])
        )
      ).toThrow('Recipe yield must be greater than 0');
    });

    it('lança erro quando yield é negativo', () => {
      expect(() =>
        calculateRecipe(
          { yield: -5, profitMargin: 0, ingredients: [], additionalCosts: [] },
          makeIngredientMap([])
        )
      ).toThrow('Recipe yield must be greater than 0');
    });

    it('lança erro quando purchaseQuantity do ingrediente é zero', () => {
      expect(() =>
        calculateRecipe(
          {
            yield: 1,
            profitMargin: 0,
            ingredients: [{ ingredientId: 'bug', quantityUsed: 10, unit: 'g' }],
            additionalCosts: [],
          },
          makeIngredientMap([
            { id: 'bug', purchasePrice: 100, purchaseQuantity: 0, unit: 'g' },
          ])
        )
      ).toThrow(/invalid purchaseQuantity/);
    });

    it('aceita margem de lucro negativa (preço abaixo do custo)', () => {
      // cenário: dar desconto / promoção
      const result = calculateRecipe(
        {
          yield: 1,
          profitMargin: -50,
          ingredients: [],
          additionalCosts: [{ name: 'X', value: 10 }],
        },
        makeIngredientMap([])
      );
      expect(result.suggestedPrice).toBe(5); // 10 * 0.5
      expect(result.estimatedProfit).toBe(-5);
    });

    it('mantém precisão em números fracionários pequenos', () => {
      // cenário: 1g de fermento em pó (pacote 100g = R$5)
      const result = calculateRecipe(
        {
          yield: 1,
          profitMargin: 0,
          ingredients: [{ ingredientId: 'ferm', quantityUsed: 1, unit: 'g' }],
          additionalCosts: [],
        },
        makeIngredientMap([
          { id: 'ferm', purchasePrice: 5, purchaseQuantity: 100, unit: 'g' },
        ])
      );
      expect(result.ingredientsCost).toBeCloseTo(0.05, 10);
    });
  });

  describe('integração de cenários reais', () => {
    it('cálculo para um brigadeiro de festa (100 unidades)', () => {
      // Leite condensado 395g = R$6 (usa 395g = R$6)
      // Chocolate em pó 200g = R$8 (usa 100g = R$4)
      // Manteiga 200g = R$10 (usa 20g = R$1)
      // Granulado 500g = R$15 (usa 150g = R$4.50)
      // Forminha R$3 (custo adicional)
      // Total = 6 + 4 + 1 + 4.5 + 3 = 18.50
      // Rende 100 brigadeiros, margem 150%
      // Cost per unit = 0.185
      // Suggested = 0.185 * 2.5 = 0.4625
      const result = calculateRecipe(
        {
          yield: 100,
          profitMargin: 150,
          ingredients: [
            { ingredientId: 'leite-c', quantityUsed: 395, unit: 'g' },
            { ingredientId: 'choc-po', quantityUsed: 100, unit: 'g' },
            { ingredientId: 'manteiga', quantityUsed: 20, unit: 'g' },
            { ingredientId: 'granulado', quantityUsed: 150, unit: 'g' },
          ],
          additionalCosts: [{ name: 'Forminhas', value: 3 }],
        },
        makeIngredientMap([
          { id: 'leite-c', purchasePrice: 6, purchaseQuantity: 395, unit: 'g' },
          { id: 'choc-po', purchasePrice: 8, purchaseQuantity: 200, unit: 'g' },
          { id: 'manteiga', purchasePrice: 10, purchaseQuantity: 200, unit: 'g' },
          { id: 'granulado', purchasePrice: 15, purchaseQuantity: 500, unit: 'g' },
        ])
      );

      expect(result.ingredientsCost).toBeCloseTo(15.5, 5);
      expect(result.totalCost).toBeCloseTo(18.5, 5);
      expect(result.costPerUnit).toBeCloseTo(0.185, 5);
      expect(result.suggestedPrice).toBeCloseTo(0.4625, 5);
      expect(result.estimatedProfit).toBeCloseTo(27.75, 5);
    });

    it('match com o exemplo de bolo simples do README', () => {
      // exemplo didático: farinha 1kg R$5, ovos 12un R$12, leite 1L R$4
      // Bolo usa 500g farinha (R$2.50), 4 ovos (R$4), 250ml leite (R$1)
      // Sem custos adicionais, rende 12 fatias, margem 100%
      const result = calculateRecipe(
        {
          yield: 12,
          profitMargin: 100,
          ingredients: [
            { ingredientId: 'farinha', quantityUsed: 500, unit: 'g' },
            { ingredientId: 'ovos', quantityUsed: 4, unit: 'unit' },
            { ingredientId: 'leite', quantityUsed: 250, unit: 'ml' },
          ],
          additionalCosts: [],
        },
        makeIngredientMap([
          { id: 'farinha', purchasePrice: 5, purchaseQuantity: 1000, unit: 'g' },
          { id: 'ovos', purchasePrice: 12, purchaseQuantity: 12, unit: 'unit' },
          { id: 'leite', purchasePrice: 4, purchaseQuantity: 1000, unit: 'ml' },
        ])
      );

      expect(result.ingredientsCost).toBeCloseTo(7.5, 5);
      expect(result.totalCost).toBeCloseTo(7.5, 5);
      expect(result.costPerUnit).toBeCloseTo(0.625, 5);
      expect(result.suggestedPrice).toBeCloseTo(1.25, 5);
      expect(result.estimatedProfit).toBeCloseTo(7.5, 5);
    });
  });

  describe('convertUnit', () => {
    it('retorna mesma quantidade quando unidades são iguais', () => {
      expect(convertUnit(500, 'g', 'g')).toBe(500);
      expect(convertUnit(2, 'kg', 'kg')).toBe(2);
      expect(convertUnit(100, 'ml', 'ml')).toBe(100);
      expect(convertUnit(3, 'l', 'l')).toBe(3);
      expect(convertUnit(5, 'unit', 'unit')).toBe(5);
    });

    it('converte g para kg', () => {
      expect(convertUnit(500, 'g', 'kg')).toBe(0.5);
      expect(convertUnit(1000, 'g', 'kg')).toBe(1);
    });

    it('converte kg para g', () => {
      expect(convertUnit(0.5, 'kg', 'g')).toBe(500);
      expect(convertUnit(2, 'kg', 'g')).toBe(2000);
    });

    it('converte ml para l', () => {
      expect(convertUnit(500, 'ml', 'l')).toBe(0.5);
      expect(convertUnit(1000, 'ml', 'l')).toBe(1);
    });

    it('converte l para ml', () => {
      expect(convertUnit(0.5, 'l', 'ml')).toBe(500);
      expect(convertUnit(2, 'l', 'ml')).toBe(2000);
    });
  });

  describe('cálculo com conversão de unidade', () => {
    it('ingrediente em kg, receita usa g', () => {
      // Açúcar: 2 kg por R$16 → R$8/kg → R$0.008/g
      // Receita usa 500g → 0.5 kg → 0.5 * R$8 = R$4
      const result = calculateRecipe(
        {
          yield: 1,
          profitMargin: 0,
          ingredients: [{ ingredientId: 'acucar', quantityUsed: 500, unit: 'g' }],
          additionalCosts: [],
        },
        makeIngredientMap([
          { id: 'acucar', purchasePrice: 16, purchaseQuantity: 2, unit: 'kg' },
        ])
      );
      expect(result.ingredientsCost).toBeCloseTo(4, 5);
    });

    it('ingrediente em g, receita usa kg', () => {
      // Farinha: 1000g por R$10 → R$0.01/g
      // Receita usa 1.5 kg → 1500g → 1500 * R$0.01 = R$15
      const result = calculateRecipe(
        {
          yield: 1,
          profitMargin: 0,
          ingredients: [{ ingredientId: 'farinha', quantityUsed: 1.5, unit: 'kg' }],
          additionalCosts: [],
        },
        makeIngredientMap([
          { id: 'farinha', purchasePrice: 10, purchaseQuantity: 1000, unit: 'g' },
        ])
      );
      expect(result.ingredientsCost).toBeCloseTo(15, 5);
    });

    it('ingrediente em l, receita usa ml', () => {
      // Leite: 1 l por R$6 → R$6/l
      // Receita usa 250 ml → 0.25 l → 0.25 * R$6 = R$1.50
      const result = calculateRecipe(
        {
          yield: 1,
          profitMargin: 0,
          ingredients: [{ ingredientId: 'leite', quantityUsed: 250, unit: 'ml' }],
          additionalCosts: [],
        },
        makeIngredientMap([
          { id: 'leite', purchasePrice: 6, purchaseQuantity: 1, unit: 'l' },
        ])
      );
      expect(result.ingredientsCost).toBeCloseTo(1.5, 5);
    });

    it('ingrediente em ml, receita usa l', () => {
      // Essência: 100 ml por R$20 → R$0.20/ml
      // Receita usa 0.05 l → 50 ml → 50 * R$0.20 = R$10
      const result = calculateRecipe(
        {
          yield: 1,
          profitMargin: 0,
          ingredients: [{ ingredientId: 'essencia', quantityUsed: 0.05, unit: 'l' }],
          additionalCosts: [],
        },
        makeIngredientMap([
          { id: 'essencia', purchasePrice: 20, purchaseQuantity: 100, unit: 'ml' },
        ])
      );
      expect(result.ingredientsCost).toBeCloseTo(10, 5);
    });
  });
});
