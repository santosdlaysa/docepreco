import { useEffect, useState, useMemo, useCallback } from 'react';
import { api, SubscriptionDashboard, SubscriptionEvent } from '../lib/api';
import { Skeleton, ModalOverlay, TableSkeleton } from '../components';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Crown, Zap,
  Download, Filter, X, RefreshCw, Calendar, CheckCircle,
  Loader2, Eye, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDateTime = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const card = 'bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50';

function StatMetric({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className={`${card} p-5 flex items-start gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function TrendBadge({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
      isPositive
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    }`}>
      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(value).toFixed(1)}% {label}
    </div>
  );
}

function SubscriptionsPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${card} p-5 space-y-3`}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...Array(2)].map((_, i) => (
          <div key={i} className={`${card} p-5`}>
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformDistribution({ byPlatform }: { byPlatform: any[] }) {
  const colors = ['#2646E1', '#e91e8c', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];
  const data = byPlatform.map((p, i) => ({ ...p, fill: colors[i % colors.length] }));

  return (
    <div className={`${card} p-5`}>
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Distribuição por Plataforma</h3>
      {data.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Sem dados</p>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="subscriberCount" strokeWidth={0}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-3 min-w-0">
            {data.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill }} />
                  <span className="text-gray-600 dark:text-gray-300 truncate">{p.platform || 'Desconhecido'}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{p.subscriberCount}</p>
                  <p className="text-xs text-gray-400">{fmt(p.totalBRL)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueChart({ timeseries }: { timeseries: any[] }) {
  const data = timeseries.slice(-30).map(point => ({
    date: new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    revenue: point.totalBRL,
    events: point.eventCount,
  }));

  return (
    <div className={`${card} p-5`}>
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Receita - Últimos 30 dias</h3>
      {data.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Sem dados</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <Tooltip formatter={(v: any) => fmt(typeof v === 'number' ? v : 0)} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#2646E1" strokeWidth={2} name="Receita (R$)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function EventsTable({ events, onExport }: { events: SubscriptionEvent[]; onExport: () => void }) {
  const [page, setPage] = useState(1);
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');
  const pageSize = 15;

  const eventMonth = (dateValue: string) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 7);
  };

  const platforms = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      if (e.platform) set.add(e.platform);
    });
    return Array.from(set).sort();
  }, [events]);

  const months = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      const month = eventMonth(e.createdAt);
      if (month) set.add(month);
    });
    return Array.from(set).sort().reverse();
  }, [events]);

  const monthLabel = (month: string) => {
    const [year, monthIndex] = month.split('-').map(Number);
    return new Date(year, monthIndex - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  };

  const eventStatus = (event: SubscriptionEvent) => {
    if (!event.expirationAt) return 'active';
    return new Date(event.expirationAt) <= new Date() ? 'expired' : 'active';
  };

  const statusMatches = (event: SubscriptionEvent) => {
    return filterStatus === 'all' ? true : eventStatus(event) === filterStatus;
  };

  const filtered = useMemo(() => {
    return events.filter(event => {
      const platformMatches = filterPlatform ? event.platform === filterPlatform : true;
      const monthMatches = filterMonth ? eventMonth(event.createdAt) === filterMonth : true;
      return platformMatches && monthMatches && statusMatches(event);
    });
  }, [events, filterPlatform, filterMonth, filterStatus]);

  const monthlyTotals = useMemo(() => {
    return months.map(month => {
      const monthEvents = events.filter(event => {
        const platformMatches = filterPlatform ? event.platform === filterPlatform : true;
        return platformMatches && eventMonth(event.createdAt) === month && statusMatches(event);
      });

      return {
        month,
        count: monthEvents.length,
        totalBRL: monthEvents.reduce((sum, event) => sum + event.amountBRL, 0),
      };
    });
  }, [events, filterPlatform, filterStatus, months]);

  const filteredTotalBRL = filtered.reduce((sum, event) => sum + event.amountBRL, 0);
  const selectedMonthTotal = filterMonth
    ? monthlyTotals.find(item => item.month === filterMonth)
    : null;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [filterPlatform, filterMonth, filterStatus]);

  return (
    <div className={`${card}`}>
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Eventos Recentes</h3>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">{filtered.length}</span>
        </div>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {(platforms.length > 0 || months.length > 0) && (
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700/50 space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all' as const, label: 'Todos' },
              { value: 'active' as const, label: 'Ativos' },
              { value: 'expired' as const, label: 'Expirados' },
            ].map(status => (
              <button
                key={status.value}
                onClick={() => setFilterStatus(status.value)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterStatus === status.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {status.label} ({events.filter(e => status.value === 'all' || eventStatus(e) === status.value).length})
              </button>
            ))}
          </div>

          {months.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mês</span>
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-primary-400"
              >
                <option value="">Todos os meses</option>
                {months.map(month => (
                  <option key={month} value={month}>
                    {monthLabel(month)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {platforms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterPlatform(null)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterPlatform === null
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Todas ({events.filter(e => (filterMonth ? eventMonth(e.createdAt) === filterMonth : true) && statusMatches(e)).length})
              </button>
              {platforms.map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPlatform(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    filterPlatform === p
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {p} ({events.filter(e => e.platform === p && (filterMonth ? eventMonth(e.createdAt) === filterMonth : true) && statusMatches(e)).length})
                </button>
              ))}
            </div>
          )}

          {monthlyTotals.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] gap-3">
              <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 bg-gray-50/70 dark:bg-gray-900/30 p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {filterMonth ? `Total de ${monthLabel(filterMonth)}` : 'Total dos registros filtrados'}
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {fmt(filterMonth ? selectedMonthTotal?.totalBRL ?? 0 : filteredTotalBRL)}
                  </p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {filterMonth ? selectedMonthTotal?.count ?? 0 : filtered.length} registros
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Soma por mÃªs</p>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                  {monthlyTotals.map(item => (
                    <button
                      key={item.month}
                      type="button"
                      onClick={() => setFilterMonth(item.month)}
                      className={`w-full px-3 py-2 flex items-center justify-between gap-3 text-left transition-colors ${
                        filterMonth === item.month
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{monthLabel(item.month)}</span>
                        <span className="block text-[11px] text-gray-400">{item.count} registros</span>
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white flex-shrink-0">{fmt(item.totalBRL)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {paged.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Nenhum evento encontrado</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/50">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Empresa</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Plataforma</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Valor</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Data</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Expiração</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(event => (
                  <tr key={event.id} className="border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3 max-w-[220px]">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{event.companyName}</p>
                        <p className="text-xs text-gray-400 truncate">{event.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        {event.platform || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{event.eventType}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmt(event.amountBRL)}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDateTime(event.createdAt)}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {event.expirationAt ? (
                        new Date(event.expirationAt) <= new Date() ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">Expirado</span>
                        ) : (
                          fmtDate(event.expirationAt)
                        )
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
              <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SubscriptionsPage({ toast }: { toast: (msg: string, type?: 'success' | 'error') => void }) {
  const [data, setData] = useState<SubscriptionDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getSubscriptionDashboard();
      setData(result);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados');
      console.error('Error loading subscriptions:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  const handleExportCSV = () => {
    if (!data) return;

    const headers = ['Empresa', 'Email', 'Plataforma', 'Loja', 'Tipo', 'Valor (R$)', 'Data', 'Expiração'];
    const rows = data.recentEvents.map(e => [
      e.companyName,
      e.email,
      e.platform || '—',
      e.store || '—',
      e.eventType,
      e.amountBRL.toFixed(2),
      fmtDateTime(e.createdAt),
      e.expirationAt ? fmtDate(e.expirationAt) : '—',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assinaturas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exportado com sucesso!', 'success');
  };

  if (error) return <p className="text-red-600 p-4">{error}</p>;
  if (loading) return <SubscriptionsPageSkeleton />;
  if (!data) return <p className="text-gray-400 p-4">Sem dados</p>;

  const { overview, byPlatform, recentEvents, timeseries } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Dashboard</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">Assinaturas</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`${card} px-4 py-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50`}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatMetric
          label="Assinantes Ativos"
          value={overview.activeSubscribers}
          sub={`${overview.expiringSubscribers} expirando em 7d`}
          icon={Users}
          color="bg-blue-500"
        />
        <StatMetric
          label="Expirando em 7 dias"
          value={overview.expiringSubscribers}
          sub={`${overview.expiredSubscribers} já expirados`}
          icon={Zap}
          color="bg-yellow-500"
        />
        <StatMetric
          label="Receita Total"
          value={fmt(overview.totalReceivedBRL)}
          sub={`Avg: ${fmt(overview.avgValueBRL)}`}
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <StatMetric
          label="MRR"
          value={fmt(overview.mrr)}
          sub="Receita mensal média"
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <StatMetric
          label="ARR"
          value={fmt(overview.arr)}
          sub={overview.momGrowth >= 0 ? `+${overview.momGrowth.toFixed(1)}% MoM` : `${overview.momGrowth.toFixed(1)}% MoM`}
          icon={Crown}
          color="bg-pink-500"
        />
      </div>

      {/* Monthly Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={`${card} p-5`}>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Este Mês</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{fmt(overview.monthlyReceivedBRL)}</p>
          <div className="mt-3">
            <TrendBadge value={overview.momGrowth} label="vs. mês anterior" />
          </div>
        </div>
        <div className={`${card} p-5`}>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Mês Anterior</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{fmt(overview.lastMonthBRL)}</p>
          <p className="text-xs text-gray-400 mt-3">Comparação</p>
        </div>
        <div className={`${card} p-5`}>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Taxa de Churn</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {overview.activeSubscribers > 0
              ? ((overview.expiredSubscribers / (overview.activeSubscribers + overview.expiredSubscribers)) * 100).toFixed(1)
              : '0'}%
          </p>
          <p className="text-xs text-gray-400 mt-3">Assinaturas expiradas</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueChart timeseries={timeseries} />
        <PlatformDistribution byPlatform={byPlatform} />
      </div>

      {/* Platform breakdown */}
      <div className={`${card} p-5`}>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Detalhamento por Plataforma</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Plataforma</th>
                <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Assinantes</th>
                <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Eventos</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Receita Total</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Valor Médio</th>
              </tr>
            </thead>
            <tbody>
              {byPlatform.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-8 text-sm">Sem dados</td>
                </tr>
              ) : (
                byPlatform.map(p => (
                  <tr key={p.platform} className="border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{p.platform || 'Desconhecido'}</td>
                    <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400">{p.subscriberCount}</td>
                    <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400">{p.eventCount}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmt(p.totalBRL)}</td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-400">{fmt(p.avgBRL)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Events table */}
      <EventsTable events={recentEvents} onExport={handleExportCSV} />
    </div>
  );
}
