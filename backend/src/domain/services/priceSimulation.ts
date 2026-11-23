import { CalculationResult } from '../entities/Calculation';

export function simulatePrice(calculation: CalculationResult, discount: number, quantity: number) {
  if (!Number.isFinite(discount) || discount < 0 || discount > 100 ||
      !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) {
    throw new Error('Informe desconto entre 0 e 100 e quantidade inteira entre 1 e 100000.');
  }
  if (!Object.values(calculation).every(Number.isFinite) || calculation.costPerUnit <= 0 || calculation.suggestedPrice <= 0) {
    throw new Error('Revise os custos e o rendimento antes de analisar a receita.');
  }
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const unitPrice = round(calculation.suggestedPrice * (1 - discount / 100));
  const revenue = round(unitPrice * quantity);
  const cost = round(calculation.costPerUnit * quantity);
  const profit = round(revenue - cost);
  return { discount, quantity, unitPrice, revenue, cost, profit,
    marginPercent: revenue > 0 ? round(profit / revenue * 100) : null,
    belowCost: unitPrice < calculation.costPerUnit };
}
