import { useEffect, useState, useCallback } from 'react';
import { api, BusinessMetrics } from '../lib/api';
import { Skeleton } from '../components';
import {
  RefreshCw, TrendingDown, TrendingUp, Users, Percent, Repeat,
  DollarSign, Calendar, Info, HelpCircle,
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const pct = (n: number | null, d = 1) => (n == null ? '—' : `${n.toFixed(d)}%`);
const num = (n: number | null, d = 1) => (n == null ? '—' : n.toFixed(d));

const card = 'bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50';

function previousMonthValue(): string {
  const now = new Date();
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(start: string): string {
  const [y, m] = start.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function KpiCard({ label, value, sub, icon: Icon, color, tone }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold mt-1 truncate ${
            tone === 'bad' ? 'text-red-600 dark:text-red-400'
            : tone === 'good' ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-gray-900 dark:text-white'
          }`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function MetricDetail({ title, formula, children }: {
  title: string; formula: string; children: React.ReactNode;
}) {
  return (
    <div className={`${card} p-5`}>
      <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-[11px] text-gray-400 mt-0.5 flex items-start gap-1">
        <Info size={12} className="mt-0.5 flex-shrink-0" /> {formula}
      </p>
      <div className="mt-4 space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

const NOT_MEASURED = [
  { name: 'CAC (Custo de Aquisição)', why: 'O sistema não registra investimento em marketing (mídia paga, ferramentas, salários, comissões).', how: 'Some os gastos do mês e divida pelo nº de novos pagantes. Sem esses dados: "Não medimos".' },
  { name: 'NPS', why: 'Não há coleta de Net Promoter Score no app nem no backend.', how: 'Precisa de uma pesquisa de satisfação (0–10) com os clientes. Hoje: "Não medimos".' },
  { name: 'Margem de lucro', why: 'É a margem da empresa (Doce Preço), e os custos operacionais (infra, domínios, etc.) não ficam no banco.', how: '(Receita − custo operacional) ÷ receita. Informe seus custos para calcular.' },
  { name: 'Runway / Break-even', why: 'Dependem do seu caixa e burn mensal, que não estão no sistema.', how: 'Avaliação sua com base no saldo disponível e nas despesas mensais.' },
];

export function BusinessMetricsPage({ toast }: { toast: (msg: string, type?: 'success' | 'error') => void }) {
  const [data, setData] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(previousMonthValue);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const d = await api.getBusinessMetrics(selectedMonth);
      setData(d);
    } catch {
      toast('Erro ao carregar métricas de negócio', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, selectedMonth]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`${card} p-5 space-y-3`}>
              <Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className={`${card} p-5`}><Skeleton className="h-40" /></div>)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { churn, conversion, renewals, ltv, revenue, period } = data;
  const label = periodLabel(period.start);
  const mom = revenue.momGrowthPct;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Métricas de Negócio</h1>
          <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
            <Calendar size={14} /> Período de referência: <span className="font-medium text-gray-600 dark:text-gray-300">{label}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400" htmlFor="business-metrics-month">Mês</label>
          <input
            id="business-metrics-month"
            type="month"
            value={selectedMonth}
            max={previousMonthValue()}
            onChange={e => setSelectedMonth(e.target.value || previousMonthValue())}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          label="Novos cadastros no mês"
          value={String(conversion.leads)}
          sub={`${conversion.totalAccounts} contas acumuladas até o fim do período`}
          icon={Users} color="bg-blue-500"
        />
        <KpiCard
          label="Churn (mês)"
          value={pct(churn.ratePct)}
          sub={`${churn.lost} de ${churn.base} pagantes não renovaram`}
          icon={TrendingDown} color="bg-red-500" tone="bad"
        />
        <KpiCard
          label="Conversão (mês)"
          value={pct(conversion.ratePct)}
          sub={`${conversion.payers} pagantes / ${conversion.leads} cadastros`}
          icon={Percent} color="bg-emerald-500" tone="good"
        />
        <KpiCard
          label="LTV estimado"
          value={ltv.valueBRL == null ? '—' : fmt(ltv.valueBRL)}
          sub={ltv.avgLifetimeMonths == null ? undefined : `vida média ~${num(ltv.avgLifetimeMonths)} meses`}
          icon={Users} color="bg-indigo-500"
        />
        <KpiCard
          label="Receita do mês"
          value={fmt(revenue.periodBRL)}
          sub={mom == null ? `ticket médio ${fmt(revenue.ticketAvgBRL)}` : `${mom >= 0 ? '▲' : '▼'} ${Math.abs(mom).toFixed(1)}% vs mês anterior`}
          icon={DollarSign} color="bg-primary-500"
          tone={mom == null ? 'neutral' : mom >= 0 ? 'good' : 'bad'}
        />
        <KpiCard
          label="Renovaram no mês"
          value={String(renewals.users)}
          sub={`${renewals.count} renovação(ões) registrada(s)`}
          icon={Repeat} color="bg-cyan-500" tone="good"
        />
        <KpiCard
          label="Receita das renovações"
          value={fmt(renewals.revenueBRL)}
          sub={`No período de ${label}`}
          icon={DollarSign} color="bg-emerald-600" tone="good"
        />
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <MetricDetail title="Taxa de churn" formula="(clientes perdidos ÷ clientes no início do período) × 100">
          <Row label="Pagantes no início do mês" value={String(churn.base)} />
          <Row label="Renovaram / continuaram" value={String(churn.renewed)} />
          <Row label="Perderam (não renovaram)" value={String(churn.lost)} />
          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Churn</span>
            <span className="font-bold text-red-600 dark:text-red-400">{pct(churn.ratePct)}</span>
          </div>
        </MetricDetail>

        <MetricDetail title="Taxa de conversão" formula="novos pagantes ÷ novos cadastros do período">
          <Row label="Novos cadastros (leads)" value={String(conversion.leads)} />
          <Row label="Novos pagantes" value={String(conversion.payers)} />
          <Row label="Conversão acumulada (base total)" value={pct(conversion.cumulativeRatePct)} />
          <p className="text-[11px] text-gray-400">
            {conversion.activePayers} pagantes ativos de {conversion.totalAccounts} contas.
          </p>
          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Conversão do mês</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{pct(conversion.ratePct)}</span>
          </div>
        </MetricDetail>

        <MetricDetail title="LTV & receita" formula="LTV = ARPU × vida média (1 ÷ churn)">
          <Row label="Receita do mês" value={fmt(revenue.periodBRL)} />
          <Row label="Mês anterior" value={fmt(revenue.prevPeriodBRL)} />
          <Row label="Crescimento (MoM)" value={pct(revenue.momGrowthPct)} />
          <Row label="Ticket médio" value={fmt(revenue.ticketAvgBRL)} />
          <Row label="ARPU (receita ÷ ativos)" value={ltv.arpuBRL == null ? '—' : fmt(ltv.arpuBRL)} />
          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">LTV estimado</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{ltv.valueBRL == null ? '—' : fmt(ltv.valueBRL)}</span>
          </div>
        </MetricDetail>
      </div>

      {/* Não medidas */}
      <div className={`${card} p-5`}>
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <HelpCircle size={18} className="text-amber-500" /> Não medidas pelo sistema (exigem dados externos)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {NOT_MEASURED.map((m) => (
            <div key={m.name} className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-900/10 p-4">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{m.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.why}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-start gap-1">
                <Repeat size={12} className="mt-0.5 flex-shrink-0" /> {m.how}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
        <TrendingUp size={12} /> Churn alto reflete o modelo de PIX mensal manual (o cliente precisa recomprar todo mês). O Pix Automático tende a reduzi-lo.
      </p>
    </div>
  );
}
