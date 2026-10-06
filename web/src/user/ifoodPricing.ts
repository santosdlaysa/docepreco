/**
 * Preço de venda no iFood a partir do preço de venda direto. A comissão incide
 * sobre o preço final, então o preço é "grossed-up": preço / (1 - taxa).
 * Somar a porcentagem por cima (preço × (1 + taxa)) deixaria a confeiteira no
 * prejuízo. Taxas = comissão do plano + taxa de pagamento online (3,2%).
 * Mantido em sincronia com mobile/src/domain/services/ifoodPricing.ts.
 */
export const IFOOD_PLANS = [
  { key: 'basico', label: 'Plano Básico', rate: 0.152 },
  { key: 'entrega', label: 'Plano Entrega', rate: 0.262 },
] as const;

export function ifoodPrice(price: number, rate: number): number {
  return price > 0 && rate < 1 ? price / (1 - rate) : 0;
}
