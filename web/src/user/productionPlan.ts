import i18n, { getLang } from '../i18n';

export interface ProductionPlan {
  start: string;
  end: string;
  orderCount: number;
  products: { key: string; name: string; quantity: number; batches: number | null }[];
  ingredients: { id: string; name: string; unit: string; required: number; available: number | null; missing: number }[];
  warnings: string[];
}
export const productionQuantity = (value: number) => value.toLocaleString(getLang() === 'en' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 3 });
export const productionDate = (value: string) => {
  const [y, m, d] = value.split('-');
  return getLang() === 'en' ? [m, d, y].join('/') : [d, m, y].join('/');
};
export function productionShoppingText(plan: ProductionPlan): string {
  const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`orders:${key}`, opts);
  const rows = plan.ingredients.filter(i => i.missing > 0.0000001);
  return [
    t('production.shoppingTitle'),
    t('production.periodRange', { start: productionDate(plan.start), end: productionDate(plan.end) }),
    ...(plan.warnings.length ? [t('production.shoppingWarning'), ...plan.warnings] : []),
    ...rows.map(i => '• ' + i.name + ': ' + productionQuantity(Math.ceil(i.missing * 1000) / 1000) + ' ' + (i.unit === 'unit' ? t('production.unitShort') : i.unit) + (i.available === null ? t('production.checkStockSuffix') : '')),
    ...(rows.length ? [] : [t('production.noMissing')]),
    t('production.shoppingFooter'),
  ].join('\n');
}
