import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Package, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { userApi, Sale, Expense, PurchaseInvoice } from '../userApi';
import { ToastFn, TableSkeleton } from '../../components';
import { formatBRL } from '../format';
import { EmptyState } from './IngredientsPage';

type Period = 'month' | 'prev' | 'all';

const ymOf = (iso: string) => (iso || '').slice(0, 7);

function periodKeys(): { month: string; prev: string } {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prev = `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`;
  return { month, prev };
}

interface ProductLine {
  recipeId: string;
  name: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export function FinancePage({ toast }: { toast: ToastFn }) {
  const { t } = useTranslation('finance');
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [costPerUnit, setCostPerUnit] = useState<Record<string, number>>({});
  const [recipeName, setRecipeName] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState<Period>('month');

  const load = useCallback(async () => {
    setLoading(true);
    const { month, prev } = periodKeys();
    const expenseMonth = period === 'all' ? undefined : period === 'prev' ? prev : month;
    try {
      const [allSales, recipes, allExpenses, allPurchases] = await Promise.all([
        userApi.listSales(),
        userApi.listRecipes(),
        userApi.listExpenses(expenseMonth),
        userApi.listPurchases(expenseMonth),
      ]);
      setSales(allSales);
      setExpenses(allExpenses);
      setPurchases(allPurchases);

      const names: Record<string, string> = {};
      for (const r of recipes) names[r.id] = r.name;
      setRecipeName(names);

      // Custo unitário só das receitas que tiveram venda.
      const soldIds = Array.from(new Set(allSales.map(s => s.recipeId).filter((id): id is string => !!id)));
      const costs: Record<string, number> = {};
      await Promise.all(
        soldIds.map(async id => {
          try {
            const calc = await userApi.calculateRecipe(id);
            costs[id] = calc.costPerUnit ?? 0;
          } catch {
            costs[id] = 0;
          }
        })
      );
      setCostPerUnit(costs);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast, period]);

  useEffect(() => {
    load();
  }, [load]);

  const { month, prev } = periodKeys();
  const filtered = sales.filter(s => {
    if (period === 'all') return true;
    const ym = ymOf(s.saleDate);
    return period === 'month' ? ym === month : ym === prev;
  });

  const revenue = filtered.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
  const cost = filtered.reduce((sum, s) => sum + (costPerUnit[s.recipeId] ?? 0) * s.quantitySold, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidPurchases = purchases.filter(p => p.paymentStatus === 'paid').reduce((sum, p) => sum + p.total, 0);
  const pendingPurchases = purchases.filter(p => p.paymentStatus === 'pending').reduce((sum, p) => sum + p.total, 0);
  const cashBalance = revenue - totalExpenses - paidPurchases;
  const profit = revenue - cost - totalExpenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const units = filtered.reduce((sum, s) => sum + s.quantitySold, 0);
  const costPct = revenue > 0 ? (cost / revenue) * 100 : 0;
  const expensePct = revenue > 0 ? (totalExpenses / revenue) * 100 : 0;

  const byProduct: Record<string, ProductLine> = {};
  for (const s of filtered) {
    const line = byProduct[s.recipeId] ?? {
      recipeId: s.recipeId,
      name: s.recipeName || recipeName[s.recipeId] || t('fin.recipeFallback'),
      units: 0, revenue: 0, cost: 0, profit: 0, margin: 0,
    };
    line.units += s.quantitySold;
    line.revenue += s.totalRevenue || 0;
    line.cost += (costPerUnit[s.recipeId] ?? 0) * s.quantitySold;
    byProduct[s.recipeId] = line;
  }
  const products = Object.values(byProduct)
    .map(p => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 }))
    .sort((a, b) => b.profit - a.profit);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('fin.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('fin.subtitle')}</p>
        </div>
      </div>

      {/* Seletor de período */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5 mb-4">
        {([['month', t('fin.periodMonth')], ['prev', t('fin.periodPrev')], ['all', t('fin.periodAll')]] as [Period, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              period === key
                ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={5} cols={2} />
        </div>
      ) : filtered.length === 0 && expenses.length === 0 && purchases.length === 0 ? (
        <EmptyState icon={BarChart3} text={t('fin.empty')} />
      ) : (
        <div className="space-y-4">
          {/* Hero — Lucro do período */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800 shadow-sm">
            <p className="text-xs font-medium text-white/80">{t('fin.profitPeriod')}</p>
            <p className="text-3xl font-extrabold text-white tracking-tight mt-1">{formatBRL(profit)}</p>
            <div className="flex gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 rounded-lg px-2.5 py-1.5">
                <TrendingUp size={13} /> {t('fin.marginBadge', { value: margin.toFixed(0) })}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 rounded-lg px-2.5 py-1.5">
                <Package size={13} /> {t('fin.unitsSold', { count: units })}
              </span>
            </div>
          </div>

          {/* DRE */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{t('fin.dreTitle')}</p>
            <DreRow label={t('fin.grossRevenue')} value={formatBRL(revenue)} valueClass="text-gray-900 dark:text-white" bar={100} barClass="bg-purple-200 dark:bg-purple-500/40" />
            <DreRow
              label={t('fin.productCost')}
              sub={t('fin.pctOfRevenue', { value: costPct.toFixed(0) })}
              value={`− ${formatBRL(cost)}`}
              valueClass="text-red-500"
              bar={costPct}
              barClass="bg-red-200 dark:bg-red-500/40"
            />
            {totalExpenses > 0 && (
              <DreRow
                label={t('fin.opExpenses')}
                sub={t('fin.pctOfRevenue', { value: expensePct.toFixed(0) })}
                value={`− ${formatBRL(totalExpenses)}`}
                valueClass="text-red-500"
                bar={expensePct}
                barClass="bg-red-200 dark:bg-red-500/40"
              />
            )}
            <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
            <DreRow
              label={t('fin.netProfit')}
              value={formatBRL(profit)}
              valueClass={profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}
              bold
              bar={Math.max(0, margin)}
              barClass="bg-green-200 dark:bg-green-500/40"
            />
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('fin.profitMargin')}</span>
              <span className={`text-xl font-extrabold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {margin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Fluxo financeiro: compras pagas são saída de caixa, não nova despesa no DRE. */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{t('fin.flowTitle')}</p>
            <p className="text-[11px] text-gray-400 mb-3">{t('fin.flowHint')}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FlowCard label={t('fin.flowIn')} value={formatBRL(revenue)} className="text-green-600" />
              <FlowCard label={t('fin.flowPaidPurchases')} value={`− ${formatBRL(paidPurchases)}`} className="text-red-500" />
              <FlowCard label={t('fin.flowExpenses')} value={`− ${formatBRL(totalExpenses)}`} className="text-red-500" />
              <FlowCard label={t('fin.flowBalance')} value={formatBRL(cashBalance)} className={cashBalance >= 0 ? 'text-green-600' : 'text-red-500'} />
            </div>
            {pendingPurchases > 0 && <p className="text-xs text-amber-600 mt-3">{t('fin.pendingPurchases', { value: formatBRL(pendingPurchases) })}</p>}
          </div>

          {/* Por produto */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{t('fin.byProduct')}</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {products.map(p => (
                <div key={p.recipeId} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('fin.productLine', { units: p.units, revenue: formatBRL(p.revenue), cost: formatBRL(p.cost) })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold ${p.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{formatBRL(p.profit)}</p>
                    <p className="text-[11px] text-gray-400">{t('fin.productMargin', { value: p.margin.toFixed(0) })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 text-center leading-relaxed px-2">
            {t('fin.costNote')}
          </p>
        </div>
      )}
    </div>
  );
}

function FlowCard({ label, value, className }: { label: string; value: string; className: string }) {
  return <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3"><p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p><p className={`text-sm font-bold mt-1 ${className}`}>{value}</p></div>;
}

function DreRow({
  label, sub, value, valueClass, bold, bar, barClass,
}: {
  label: string; sub?: string; value: string; valueClass: string; bold?: boolean; bar: number; barClass: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-end justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className={`text-sm text-gray-900 dark:text-white ${bold ? 'font-extrabold' : 'font-medium'}`}>{label}</p>
          {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <span className={`text-sm shrink-0 ${valueClass} ${bold ? 'font-extrabold' : 'font-semibold'}`}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, bar))}%` }} />
      </div>
    </div>
  );
}
