import { simulatePrice } from './priceSimulation';

const calculation = { totalCost: 18, costPerUnit: 1.8, suggestedPrice: 3, estimatedProfit: 12, profitMargin: 66.67, ingredientsCost: 18, additionalCostTotal: 0, subRecipesCost: 0 };

describe('price simulation', () => {
  it('applies the discount to the unit price and calculates the order result', () => {
    expect(simulatePrice(calculation, 10, 100)).toEqual({ discount: 10, quantity: 100, unitPrice: 2.7, revenue: 270, cost: 180, profit: 90, marginPercent: 33.33, belowCost: false });
  });
  it('flags a sale below cost and handles a free order without division by zero', () => {
    expect(simulatePrice(calculation, 50, 1).belowCost).toBe(true);
    expect(simulatePrice(calculation, 100, 1)).toMatchObject({ revenue: 0, profit: -1.8, marginPercent: null, belowCost: true });
  });
  it.each([[-1, 1], [101, 1], [NaN, 1], [0, 0], [0, 1.5], [0, 100001]])('rejects invalid discount %s and quantity %s', (discount, quantity) => {
    expect(() => simulatePrice(calculation, discount, quantity)).toThrow();
  });
  it('rejects incomplete or invalid costs', () => {
    expect(() => simulatePrice({ ...calculation, costPerUnit: 0 }, 0, 1)).toThrow();
    expect(() => simulatePrice({ ...calculation, totalCost: Infinity }, 0, 1)).toThrow();
  });
});
