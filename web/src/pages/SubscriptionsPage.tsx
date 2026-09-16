import { useEffect, useState, useMemo, useCallback } from 'react';
import { api, SubscriptionDashboard, SubscriptionEvent, WinbackOffer, WinbackEligibleUser } from '../lib/api';
import { Skeleton, ModalOverlay, TableSkeleton, PageSizeSelect } from '../components';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Crown, Zap,
  Download, Filter, X, RefreshCw, Calendar, CheckCircle,
  Loader2, Eye, ChevronLeft, ChevronRight, Gift, Send, Mail, Bell, MessageCircle,
} from 'lucide-react';
import { MessageSquare } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserChatModal } from './UserChatModal';

const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDateTime = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function eventPlan(event: SubscriptionEvent): string {
  const product = (event.productId || '').toLowerCase();
  return product.includes('master') ? 'Master' : 'Premium';
}

function eventCycle(event: SubscriptionEvent): string {
  const product = (event.productId || '').toLowerCase();
  if (product.includes('annual') || product.includes('anual') || product.includes('year')) return 'Anual';
  // Eventos PIX anuais antigos não guardavam o ciclo no product_id;
  // a validade de aproximadamente um ano permite identificá-los.
  if (event.expirationAt) {
    const days = (new Date(event.expirationAt).getTime() - new Date(event.createdAt).getTime()) / 86400000;
    if (days >= 180) return 'Anual';
  }
  return 'Mensal';
}

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

function EventsTable({ events, onExport }: { events: SubscriptionEvent[]; onExport: (events: SubscriptionEvent[]) => void }) {
  const [page, setPage] = useState(1);
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [filterEventType, setFilterEventType] = useState<'all' | 'INITIAL_PURCHASE' | 'RENEWAL'>('all');
  const [pageSize, setPageSize] = useState(10);
  const [filterPlan, setFilterPlan] = useState('');
  const [filterCycle, setFilterCycle] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const filterInput = 'w-full min-w-0 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-xs font-normal normal-case tracking-normal text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400';
  const hasFilters = Boolean(filterPlatform || filterMonth || filterDay || filterPlan || filterCycle || minAmount || maxAmount || filterStatus !== 'all' || filterEventType !== 'all');
  const clearFilters = () => {
    setFilterPlatform(null);
    setFilterMonth('');
    setFilterDay('');
    setFilterPlan('');
    setFilterCycle('');
    setMinAmount('');
    setMaxAmount('');
    setFilterStatus('all');
    setFilterEventType('all');
    setPage(1);
  };

  const eventDay = (dateValue: string) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const eventMonth = (dateValue: string) => eventDay(dateValue).slice(0, 7);
  const selectMonth = (month: string) => {
    setFilterMonth(month);
    setFilterDay('');
  };
  const dateMatches = (event: SubscriptionEvent) =>
    (!filterMonth || eventMonth(event.createdAt) === filterMonth) &&
    (!filterDay || eventDay(event.createdAt) === filterDay);

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
      const typeMatches = filterEventType === 'all' || event.eventType === filterEventType;
      return platformMatches && dateMatches(event) && typeMatches && statusMatches(event)
        && (!filterPlan || eventPlan(event) === filterPlan)
        && (!filterCycle || eventCycle(event) === filterCycle)
        && (minAmount === '' || event.amountBRL >= Number(minAmount))
        && (maxAmount === '' || event.amountBRL <= Number(maxAmount));
    });
  }, [events, filterPlatform, filterMonth, filterDay, filterStatus, filterEventType, filterPlan, filterCycle, minAmount, maxAmount]);

  const filteredTotalBRL = filtered.reduce((sum, event) => sum + event.amountBRL, 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setPage(1), [filterPlatform, filterMonth, filterDay, filterStatus, filterEventType, filterPlan, filterCycle, minAmount, maxAmount, pageSize]);

  return (
    <div className={`${card}`}>
      <div className="px-5 py-4 flex flex-wrap gap-3 items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Eventos Recentes</h3>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <PageSizeSelect value={pageSize} onChange={setPageSize} />
          <button
            onClick={() => onExport(filtered)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-gray-50/70 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700/50">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span> de {events.length} registros
          <span className="mx-2">·</span>Total <span className="font-semibold text-gray-900 dark:text-white">{fmt(filteredTotalBRL)}</span>
        </p>
        {hasFilters ? (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
            <X size={14} /> Limpar filtros
          </button>
        ) : <span className="text-xs text-gray-400">Filtre pelos campos abaixo de cada coluna</span>}
      </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/50">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Empresa</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Plano</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Ciclo</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Plataforma</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Valor</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Data</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Expiração</th>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/40 dark:bg-gray-900/10 [&>th]:px-3 [&>th]:pb-3 [&>th]:pt-1 [&>th]:align-top">
                  <th />
                  <th>
                    <select aria-label="Filtrar por plano" value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className={`${filterInput} min-w-[100px]`}>
                      <option value="">Todos</option><option>Premium</option><option>Master</option>
                    </select>
                  </th>
                  <th>
                    <select aria-label="Filtrar por ciclo" value={filterCycle} onChange={e => setFilterCycle(e.target.value)} className={`${filterInput} min-w-[95px]`}>
                      <option value="">Todos</option><option>Mensal</option><option>Anual</option>
                    </select>
                  </th>
                  <th>
                    <select aria-label="Filtrar por plataforma" value={filterPlatform || ''} onChange={e => setFilterPlatform(e.target.value || null)} className={`${filterInput} min-w-[115px]`}>
                      <option value="">Todas</option>
                      {platforms.map(platform => <option key={platform} value={platform}>{platform}</option>)}
                    </select>
                  </th>
                  <th>
                    <select aria-label="Filtrar por tipo de evento" value={filterEventType} onChange={e => setFilterEventType(e.target.value as typeof filterEventType)} className={`${filterInput} min-w-[145px]`}>
                      <option value="all">Todos</option><option value="INITIAL_PURCHASE">Novas assinaturas</option><option value="RENEWAL">Renovações</option>
                    </select>
                  </th>
                  <th>
                    <div className="flex gap-1 min-w-[170px]">
                      <input aria-label="Valor mínimo em reais" type="number" min="0" step="0.01" placeholder="Mín. R$" value={minAmount} onChange={e => setMinAmount(e.target.value)} className={filterInput} />
                      <input aria-label="Valor máximo em reais" type="number" min="0" step="0.01" placeholder="Máx. R$" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className={filterInput} />
                    </div>
                  </th>
                  <th>
                    <div className="space-y-1.5 min-w-[150px]">
                      <input aria-label="Filtrar pelo dia do registro" type="date" value={filterDay} onChange={e => {
                        setFilterDay(e.target.value);
                        if (e.target.value) setFilterMonth(e.target.value.slice(0, 7));
                      }} className={filterInput} />
                      <select aria-label="Filtrar pelo mês do registro" value={filterMonth} onChange={e => selectMonth(e.target.value)} className={filterInput}>
                        <option value="">Todos os meses</option>
                        {months.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}
                      </select>
                    </div>
                  </th>
                  <th>
                    <select aria-label="Filtrar por status de expiração" value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)} className={`${filterInput} min-w-[105px]`}>
                      <option value="all">Todos</option><option value="active">Ativos</option><option value="expired">Expirados</option>
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">Nenhum evento encontrado para os filtros selecionados.</td></tr>}
                {paged.map(event => (
                  <tr key={event.id} className="border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3 max-w-[220px]">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{event.companyName}</p>
                        <p className="text-xs text-gray-400 truncate">{event.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${eventPlan(event) === 'Master' ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' : 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'}`}>
                        {eventPlan(event)}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs font-semibold text-gray-700 dark:text-gray-300">{eventCycle(event)}</td>
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
              <span className="text-xs text-gray-400">Página {currentPage} de {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
    </div>
  );
}

const winbackStatusBadge: Record<WinbackOffer['status'], { label: string; cls: string }> = {
  active: { label: 'Ativa', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  redeemed: { label: 'Resgatada 🎉', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  expired: { label: 'Expirou', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
};

function WinbackSection({ toast }: { toast: (msg: string, type?: 'success' | 'error') => void }) {
  const [eligible, setEligible] = useState<WinbackEligibleUser[]>([]);
  const [offers, setOffers] = useState<WinbackOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(50);
  const [validDays, setValidDays] = useState(7);
  const [includeWhatsapp, setIncludeWhatsapp] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [chatUser, setChatUser] = useState<{ id: string; name: string; email: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eligibleResult, offersResult] = await Promise.all([
        api.getWinbackEligible(),
        api.getWinbackOffers(),
      ]);
      setEligible(eligibleResult);
      setOffers(offersResult);
    } catch (e: any) {
      toast(e.message || 'Erro ao carregar campanha win-back', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await api.sendWinbackCampaign({ discountPercent, validDays, includeWhatsapp });
      toast(
        `Campanha enviada: ${result.offersCreated} ofertas (${result.emailSent} e-mails, ${result.pushSent} push${includeWhatsapp ? `, ${result.whatsappSent} WhatsApp` : ''})`,
        'success'
      );
      setConfirmOpen(false);
      load();
    } catch (e: any) {
      toast(e.message || 'Erro ao enviar campanha', 'error');
    } finally {
      setSending(false);
    }
  };

  const redeemedCount = offers.filter(o => o.status === 'redeemed').length;

  const totalPages = Math.max(1, Math.ceil(offers.length / pageSize));
  const pagedOffers = offers.slice((page - 1) * pageSize, page * pageSize);

  // Volta para uma página válida se a lista encolher (ex.: após recarregar).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className={card}>
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500 flex items-center justify-center">
            <Gift size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Campanha Win-back</h3>
            <p className="text-xs text-gray-400">Oferta de desconto para ex-assinantes voltarem</p>
          </div>
        </div>
        {loading ? (
          <Loader2 size={16} className="animate-spin text-gray-400" />
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
              {eligible.length} elegíveis
            </span>
            {redeemedCount > 0 && (
              <span className="font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                {redeemedCount} voltaram
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Desconto (%)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={discountPercent}
            onChange={e => setDiscountPercent(Number(e.target.value))}
            className="w-24 h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Validade (dias)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={validDays}
            onChange={e => setValidDays(Number(e.target.value))}
            className="w-24 h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-primary-400"
          />
        </div>
        <label className="flex items-center gap-2 h-9 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeWhatsapp}
            onChange={e => setIncludeWhatsapp(e.target.checked)}
            className="w-4 h-4 accent-pink-500"
          />
          <MessageCircle size={14} />
          Incluir WhatsApp
        </label>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={loading || sending || eligible.length === 0}
          className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-40"
        >
          <Send size={14} />
          Enviar para {eligible.length} ex-assinantes
        </button>
      </div>

      <p className="px-5 py-3 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700/50">
        Cada cliente recebe e-mail e push com a oferta. O desconto é aplicado automaticamente no PIX
        quando ela toca em "Assinar" no app — sem cupom. Ao aprovar o pagamento, a oferta vira "Resgatada".
      </p>

      {offers.length > 0 && (
        <>
        <div className="px-5 py-2.5 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-end">
          <PageSizeSelect value={pageSize} onChange={(n) => { setPageSize(n); setPage(1); }} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Desconto</th>
                <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Canais</th>
                <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Válida até</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Enviada em</th>
              </tr>
            </thead>
            <tbody>
              {pagedOffers.map(offer => {
                const badge = winbackStatusBadge[offer.status];
                return (
                  <tr key={offer.id} className="border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3 max-w-[220px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => setChatUser({ id: offer.userId, name: offer.companyName, email: offer.email })}
                          className="text-gray-300 hover:text-primary-500 transition-colors flex-shrink-0"
                          title="Abrir chat com a pessoa"
                          aria-label={`Abrir chat com ${offer.companyName}`}
                        >
                          <MessageSquare size={15} />
                        </button>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{offer.companyName}</p>
                          <p className="text-xs text-gray-400 truncate">{offer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center font-semibold text-gray-900 dark:text-white whitespace-nowrap">{offer.discountPercent}%</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2 text-gray-400">
                        {offer.emailSent && <Mail size={14} className="text-blue-500" aria-label="E-mail enviado" />}
                        {offer.pushSent && <Bell size={14} className="text-amber-500" aria-label="Push enviado" />}
                        {offer.whatsappSent && <MessageCircle size={14} className="text-emerald-500" aria-label="WhatsApp enviado" />}
                        {!offer.emailSent && !offer.pushSent && !offer.whatsappSent && '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDate(offer.expiresAt)}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDateTime(offer.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Página {page} de {totalPages} · {offers.length} ofertas
              </span>
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
        </div>
        </>
      )}

      {confirmOpen && (
        <ModalOverlay onClose={() => { if (!sending) setConfirmOpen(false); }}>
          <div className="p-6 max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirmar campanha win-back</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Enviar oferta de <strong>{discountPercent}% de desconto</strong> (válida por {validDays} dias)
              para <strong>{eligible.length} ex-assinantes</strong> por e-mail e push
              {includeWhatsapp ? ' e WhatsApp' : ''}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={sending}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {sending ? 'Enviando…' : 'Enviar agora'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {chatUser && (
        <UserChatModal
          userId={chatUser.id}
          userName={chatUser.name}
          userEmail={chatUser.email}
          onClose={() => setChatUser(null)}
          onError={(m) => toast(m, 'error')}
        />
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

  const handleExportCSV = (events: SubscriptionEvent[]) => {
    if (!data) return;

    const headers = ['Empresa', 'Email', 'Plataforma', 'Loja', 'Tipo', 'Valor (R$)', 'Data', 'Expiração'];
    const rows = events.map(e => [
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
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        <StatMetric
          label="Renovaram este mês"
          value={overview.monthlyRenewingUsers}
          sub={`${overview.monthlyRenewalCount} renovação(ões) registrada(s)`}
          icon={RefreshCw}
          color="bg-cyan-500"
        />
        <StatMetric
          label="Receita de renovações"
          value={fmt(overview.monthlyRenewalRevenueBRL)}
          sub="Gerada neste mês"
          icon={DollarSign}
          color="bg-emerald-600"
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

      {/* Win-back campaign */}
      <WinbackSection toast={toast} />

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
