import { useEffect, useState, useCallback } from 'react';
import {
  ChefHat, Package, TrendingUp, TrendingDown, CalendarDays,
  Trophy, Receipt, ShoppingBag, Filter, Download,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { userApi, AppStats, Sale, Recipe } from '../userApi';
import { ToastFn, TableSkeleton } from '../../components';
import { formatBRL, formatDate, todayISO } from '../format';
import { inputClass } from './IngredientsPage';
import { SaleForm } from './SalesPage';

const PERIODS = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: '7 dias' },
  { id: 'month', label: 'Mês' },
  { id: 'all', label: 'Tudo' },
] as const;
type PeriodId = (typeof PERIODS)[number]['id'];

const PINK = '#e91e8c';

/** Aritmética de calendário sem deslocamento de fuso (entrada/saída YYYY-MM-DD). */
function shiftDay(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function shiftMonth(prefix: string, n: number): string {
  const [y, m] = prefix.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}
function weekdayLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

export function ReportsPage({ toast }: { toast: ToastFn }) {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filterRecipe, setFilterRecipe] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<PeriodId>('month');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, allSales, r] = await Promise.all([
        userApi.getStats(),
        userApi.listSales(),
        userApi.listRecipes(),
      ]);
      setStats(s);
      setSales(allSales);
      setRecipes(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Cálculos ──
  const today = todayISO();
  const key = (s: Sale) => (s.saleDate || '').slice(0, 10);
  const sumRange = (from: string, to: string) =>
    sales.filter(s => { const k = key(s); return k >= from && k <= to; })
      .reduce((a, s) => a + (s.totalRevenue || 0), 0);

  // Hoje vs ontem
  const todayRevenue = sumRange(today, today);
  const yesterday = shiftDay(today, -1);
  const yesterdayRevenue = sumRange(yesterday, yesterday);
  const todayCount = sales.filter(s => key(s) === today).length;

  // Semana (últimos 7 dias) vs 7 dias anteriores
  const weekFrom = shiftDay(today, -6);
  const weekRevenue = sumRange(weekFrom, today);
  const prevWeekRevenue = sumRange(shiftDay(today, -13), shiftDay(today, -7));

  // Mês atual vs mês anterior
  const monthPrefix = today.slice(0, 7);
  const prevMonthPrefix = shiftMonth(monthPrefix, -1);
  const monthSales = sales.filter(s => key(s).startsWith(monthPrefix));
  const monthRevenue = monthSales.reduce((a, s) => a + (s.totalRevenue || 0), 0);
  const prevMonthRevenue = sales.filter(s => key(s).startsWith(prevMonthPrefix))
    .reduce((a, s) => a + (s.totalRevenue || 0), 0);

  // Indicadores do mês
  const monthCount = monthSales.length;
  const itemsSold = monthSales.reduce((a, s) => a + (s.quantitySold || 0), 0);
  const avgTicket = monthCount ? monthRevenue / monthCount : 0;

  // Gráfico — últimos 7 dias
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = shiftDay(today, -6 + i);
    const [, mm, dd] = d.split('-');
    return { label: weekdayLabel(d), date: `${dd}/${mm}`, value: sumRange(d, d), isToday: d === today };
  });

  // Produtos mais vendidos (mês)
  const productMap = new Map<string, { name: string; revenue: number; qty: number }>();
  monthSales.forEach(s => {
    const cur = productMap.get(s.recipeName) || { name: s.recipeName, revenue: 0, qty: 0 };
    cur.revenue += s.totalRevenue || 0;
    cur.qty += s.quantitySold || 0;
    productMap.set(s.recipeName, cur);
  });
  const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topMax = topProducts[0]?.revenue || 1;

  // ── Filtro "Vendas por receita" (receita + período) ──
  const recipeOptions = Array.from(
    sales.reduce((m, s) => {
      if (s.recipeId && !m.has(s.recipeId)) m.set(s.recipeId, s.recipeName);
      return m;
    }, new Map<string, string>())
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const inPeriod = (s: Sale) => {
    const k = key(s);
    if (filterPeriod === 'today') return k === today;
    if (filterPeriod === 'week') return k >= weekFrom && k <= today;
    if (filterPeriod === 'month') return k.startsWith(monthPrefix);
    return true;
  };
  const filterSales = sales.filter(s => inPeriod(s) && (filterRecipe === 'all' || s.recipeId === filterRecipe));
  const filterRevenue = filterSales.reduce((a, s) => a + (s.totalRevenue || 0), 0);
  const filterQty = filterSales.reduce((a, s) => a + (s.quantitySold || 0), 0);

  const recentSales = sales.slice(0, 6);

  // ── Baixar relatório (PDF via janela de impressão) ──
  const downloadReport = () => {
    const now = new Date();
    const dateLabel = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Últimos 6 meses
    const months: { label: string; revenue: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const prefix = shiftMonth(monthPrefix, -i);
      const ms = sales.filter(s => key(s).startsWith(prefix));
      const [y, m] = prefix.split('-').map(Number);
      const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      months.push({ label, revenue: ms.reduce((a, s) => a + (s.totalRevenue || 0), 0), count: ms.length });
    }

    // Receitas mais vendidas (geral)
    const map = new Map<string, { q: number; r: number }>();
    sales.forEach(s => {
      const e = map.get(s.recipeName) || { q: 0, r: 0 };
      e.q += s.quantitySold || 0;
      e.r += s.totalRevenue || 0;
      map.set(s.recipeName, e);
    });
    const top = [...map.entries()].map(([name, d]) => ({ name, ...d })).sort((a, b) => b.r - a.r).slice(0, 5);

    const totalRev = sales.reduce((a, s) => a + (s.totalRevenue || 0), 0);
    const avg = sales.length ? totalRev / sales.length : 0;
    const revChange = prevMonthRevenue > 0 ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

    const monthRows = months.map(m => `
      <tr><td>${m.label}</td><td>${m.count} venda${m.count !== 1 ? 's' : ''}</td>
      <td style="text-align:right;font-weight:600;color:#E91E63">${formatBRL(m.revenue)}</td></tr>`).join('');

    const recipeRows = top.map((r, i) => `
      <tr><td style="font-weight:700;color:${i === 0 ? '#E91E63' : '#333'}">${i + 1}º</td>
      <td>${r.name}</td><td>${r.q} un</td>
      <td style="text-align:right;font-weight:600;color:#E91E63">${formatBRL(r.r)}</td></tr>`).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Relatório DocePreço</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #333; }
        h1 { color: #E91E63; font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #888; font-size: 13px; margin-bottom: 28px; }
        .section { margin-bottom: 28px; }
        h2 { font-size: 15px; color: #555; border-bottom: 2px solid #F8BBD0; padding-bottom: 6px; margin-bottom: 12px; }
        .stat-grid { display: flex; gap: 16px; margin-bottom: 24px; }
        .stat { flex: 1; background: #FFF0F5; border-radius: 10px; padding: 14px; }
        .stat-label { font-size: 12px; color: #888; margin-bottom: 4px; }
        .stat-value { font-size: 22px; font-weight: 700; color: #E91E63; }
        .stat-sub { font-size: 11px; color: #888; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #FCE4EC; color: #C2185B; text-align: left; padding: 8px 10px; }
        td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
        .footer { margin-top: 40px; font-size: 11px; color: #bbb; text-align: center; }
      </style></head><body>
      <h1>Relatório DocePreço</h1>
      <div class="subtitle">Gerado em ${dateLabel}</div>
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-label">Faturamento do mês</div>
          <div class="stat-value">${formatBRL(monthRevenue)}</div>
          ${prevMonthRevenue > 0 ? `<div class="stat-sub">${revChange >= 0 ? '▲' : '▼'} ${Math.abs(revChange).toFixed(1)}% vs mês anterior</div>` : ''}
        </div>
        <div class="stat">
          <div class="stat-label">Ticket médio</div>
          <div class="stat-value">${formatBRL(avg)}</div>
          <div class="stat-sub">${sales.length} vendas no total</div>
        </div>
      </div>
      <div class="section">
        <h2>Vendas por mês (últimos 6 meses)</h2>
        <table><thead><tr><th>Mês</th><th>Qtd. vendas</th><th style="text-align:right">Faturamento</th></tr></thead>
        <tbody>${monthRows}</tbody></table>
      </div>
      <div class="section">
        <h2>Receitas mais vendidas</h2>
        ${top.length === 0
          ? '<p style="color:#aaa">Nenhuma venda registrada.</p>'
          : `<table><thead><tr><th>#</th><th>Receita</th><th>Qtd.</th><th style="text-align:right">Faturamento</th></tr></thead><tbody>${recipeRows}</tbody></table>`}
      </div>
      <div class="footer">DocePreço · relatório gerado automaticamente</div>
      </body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Permita pop-ups para baixar o relatório.');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Painel</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Visão geral do seu negócio</p>
        </div>
        <button
          onClick={downloadReport}
          className="flex items-center gap-1.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shrink-0"
        >
          <Download size={16} /> Baixar relatório
        </button>
      </div>

      {loading || !stats ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={4} cols={2} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Faturamento hoje / semana / mês ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Hoje (destaque) */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-white/80" />
                  <p className="text-xs font-medium text-white/80">Hoje</p>
                </div>
                <GrowthBadge current={todayRevenue} previous={yesterdayRevenue} light />
              </div>
              <p className="text-2xl font-bold text-white tracking-tight leading-tight">{formatBRL(todayRevenue)}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[11px] text-white/80">
                  {todayCount} venda{todayCount !== 1 ? 's' : ''} · vs. ontem
                </p>
                {recipes.length > 0 && (
                  <button
                    onClick={() => setCreating(true)}
                    className="text-[11px] font-semibold bg-white text-primary-600 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    + Registrar venda
                  </button>
                )}
              </div>
            </div>

            {/* Semana */}
            <RevenueCard label="Esta semana" sub="últimos 7 dias" value={weekRevenue} current={weekRevenue} previous={prevWeekRevenue} />
            {/* Mês */}
            <RevenueCard label="Este mês" sub="vs. mês anterior" value={monthRevenue} current={monthRevenue} previous={prevMonthRevenue} />
          </div>

          {/* ── Gráfico 7 dias ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-gray-400" />
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Faturamento dos últimos 7 dias</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(233,30,140,0.06)' }} content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={34}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.isToday ? PINK : '#f9b6d8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Vendas por receita (filtro) ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-gray-400" />
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Vendas por receita</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <select
                value={filterRecipe}
                onChange={e => setFilterRecipe(e.target.value)}
                className={`${inputClass} max-w-xs`}
              >
                <option value="all">Todas as receitas</option>
                {recipeOptions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5">
                {PERIODS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setFilterPeriod(p.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filterPeriod === p.id
                        ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Faturamento" value={formatBRL(filterRevenue)} highlight />
              <Metric label="Un. vendidas" value={String(filterQty)} />
              <Metric label="Vendas" value={String(filterSales.length)} />
            </div>
          </div>

          {/* ── Mais vendidos + Indicadores ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Mais vendidos */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <Trophy size={16} className="text-amber-500" />
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Mais vendidos no mês</p>
              </div>
              {topProducts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Sem vendas neste mês.</p>
              ) : (
                <div className="p-3 space-y-2.5">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className={`w-5 text-center text-xs font-bold ${i === 0 ? 'text-amber-500' : 'text-gray-400'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400 shrink-0">{formatBRL(p.revenue)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div className="h-full rounded-full bg-primary-400" style={{ width: `${Math.max(8, (p.revenue / topMax) * 100)}%` }} />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{p.qty} un. vendidas</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Indicadores */}
            <div className="grid grid-cols-2 gap-3 content-start">
              <Indicator icon={Receipt} label="Ticket médio" value={formatBRL(avgTicket)} color="text-primary-600" bg="bg-primary-50 dark:bg-primary-900/30" />
              <Indicator icon={ShoppingBag} label="Itens vendidos (mês)" value={String(itemsSold)} color="text-green-600" bg="bg-green-50 dark:bg-green-900/30" />
              <Indicator icon={ChefHat} label="Receitas" value={String(stats.recipesCount)} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/30" />
              <Indicator icon={Package} label="Ingredientes" value={String(stats.ingredientsCount)} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/30" />
            </div>
          </div>

          {/* ── Vendas recentes ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <CalendarDays size={16} className="text-gray-400" />
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Vendas recentes</p>
            </div>
            {recentSales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Nenhuma venda recente.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentSales.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{s.recipeName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.quantitySold}× · {formatDate(s.saleDate)}</p>
                    </div>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatBRL(s.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {creating && (
        <SaleForm
          recipes={recipes}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
          toast={toast}
        />
      )}
    </div>
  );
}

function GrowthBadge({ current, previous, light }: { current: number; previous: number; light?: boolean }) {
  if (previous <= 0) {
    if (current <= 0) return null;
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${light ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>novo</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const cls = light
    ? 'bg-white/20 text-white'
    : up ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>
      <Icon size={11} /> {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function RevenueCard({ label, sub, value, current, previous }: { label: string; sub: string; value: number; current: number; previous: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <GrowthBadge current={current} previous={previous} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{formatBRL(value)}</p>
      <p className="text-[11px] text-gray-400 mt-2">{sub}</p>
    </div>
  );
}

function Indicator({ icon: Icon, label, value, color, bg }: { icon: LucideIcon; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-primary-50 dark:bg-primary-900/30' : 'bg-gray-50 dark:bg-gray-900/40'}`}>
      <p className={`text-lg font-bold tracking-tight ${highlight ? 'text-primary-600 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; value: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg">
      <p className="font-semibold mb-0.5">{p.date}</p>
      <p>{formatBRL(p.value)}</p>
    </div>
  );
}
