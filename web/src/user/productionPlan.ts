export interface ProductionPlan {
  start: string;
  end: string;
  orderCount: number;
  products: { key: string; name: string; quantity: number; batches: number | null }[];
  ingredients: { id: string; name: string; unit: string; required: number; available: number | null; missing: number }[];
  warnings: string[];
}
export const productionQuantity = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
export const productionDate = (value: string) => value.split('-').reverse().join('/');
export function productionShoppingText(plan: ProductionPlan): string {
  const rows = plan.ingredients.filter(i => i.missing > 0.0000001);
  return [
    'DocePreço — Lista de compras',
    productionDate(plan.start) + ' a ' + productionDate(plan.end),
    ...(plan.warnings.length ? ['Atenção: cálculo parcial ou estoque a conferir.', ...plan.warnings] : []),
    ...rows.map(i => '• ' + i.name + ': ' + productionQuantity(Math.ceil(i.missing * 1000) / 1000) + ' ' + (i.unit === 'unit' ? 'un' : i.unit) + (i.available === null ? ' (conferir estoque)' : '')),
    ...(rows.length ? [] : ['Nenhum ingrediente faltante calculado.']),
    'Confira o estoque antes de comprar. Quantidades proporcionais; embalagens não arredondadas.'
  ].join('\n');
}

