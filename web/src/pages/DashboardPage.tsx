import { useEffect, useState } from 'react';
import { api, Stats, TopRevenueUser, TopActivityUser, PremiumSubscriber, RecentUser } from '../lib/api';
import { Skeleton, TableSkeleton, ModalOverlay } from '../components';
import {
  Users, Crown, CalendarPlus, CalendarDays,
  BookOpen, Egg, ShoppingCart, DollarSign, TrendingUp,
  Trophy, Flame, Mail, Loader2, X, Eye, UserRoundPlus, RefreshCw,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import type { LucideIcon } from 'lucide-react';

const STAT_ICONS: Array<{ icon: LucideIcon; color: string; border: string }> = [
  { icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', border: 'border-l-blue-500' },
  { icon: Crown, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20', border: 'border-l-primary-500' },
  { icon: CalendarPlus, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', border: 'border-l-green-500' },
  { icon: CalendarDays, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', border: 'border-l-purple-500' },
];

const CONTENT_ICONS: Array<{ icon: LucideIcon; color: string; border: string }> = [
  { icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', border: 'border-l-indigo-500' },
  { icon: Egg, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20', border: 'border-l-orange-500' },
  { icon: ShoppingCart, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20', border: 'border-l-teal-500' },
];

const REVENUE_ICONS: Array<{ icon: LucideIcon; color: string; border: string }> = [
  { icon: DollarSign, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', border: 'border-l-green-500' },
  { icon: TrendingUp, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20', border: 'border-l-primary-500' },
];

function StatCard({ label, value, sub, icon: Icon, iconStyle, borderStyle }: {
  label: string; value: string | number; sub?: string;
  icon: LucideIcon; iconStyle: string; borderStyle: string;
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4 border-l-4 ${borderStyle}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconStyle}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const PIE_COLORS = ['#e91e8c', '#d1d5db'];

function PremiumDot({ isPremium }: { isPremium: boolean }) {
  return isPremium
    ? <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1.5" title="Premium" />
    : <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1.5" title="Gratuito" />;
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function MedalBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 font-bold text-xs">1</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold text-xs">2</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-500 font-bold text-xs">3</span>;
  return <span className="text-gray-400 font-bold text-sm w-6 text-center">{rank}</span>;
}

function TopRevenueTable({ users }: { users: TopRevenueUser[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Trophy size={18} className="text-yellow-500" />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Maior faturamento</p>
          <p className="text-xs text-gray-400 mt-0.5">Faturamento das confeiteiras no app (todas as vendas registradas)</p>
        </div>
      </div>
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="text-left px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">#</th>
            <th className="text-left px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Confeitaria</th>
            <th className="text-right px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Faturamento total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {users.map((u, i) => (
            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <td className="px-5 py-3"><MedalBadge rank={i + 1} /></td>
              <td className="px-5 py-3">
                <span className="flex items-center">
                  <PremiumDot isPremium={u.isPremium} />
                  <span className="font-medium text-gray-900 dark:text-white">{u.companyName}</span>
                </span>
              </td>
              <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmt(u.totalRevenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopActivityTable({ users }: { users: TopActivityUser[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Flame size={18} className="text-orange-500" />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Mais ativas no app</p>
          <p className="text-xs text-gray-400 mt-0.5">Ordenado por vendas nos últimos 30 dias</p>
        </div>
      </div>
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="text-left px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">#</th>
            <th className="text-left px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Confeitaria</th>
            <th className="text-right px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Vendas/30d</th>
            <th className="text-right px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Receitas</th>
            <th className="text-right px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Ingredientes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {users.map((u, i) => (
            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <td className="px-5 py-3"><MedalBadge rank={i + 1} /></td>
              <td className="px-5 py-3 max-w-[120px]">
                <span className="flex items-center">
                  <PremiumDot isPremium={u.isPremium} />
                  <span className="font-medium text-gray-900 dark:text-white truncate">{u.companyName}</span>
                </span>
              </td>
              <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">{u.salesMonth}</td>
              <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">{u.recipeCount}</td>
              <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">{u.ingredientCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1" />Premium
          <span className="inline-block w-2 h-2 rounded-full bg-gray-300 ml-3 mr-1" />Gratuito
        </p>
      </div>
    </div>
  );
}

function NewRegistrationsTable({ users, newToday }: { users: RecentUser[]; newToday: number }) {
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <UserRoundPlus size={18} className="text-green-500" />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Novos cadastros</p>
          <p className="text-xs text-gray-400 mt-0.5">{newToday} novo{newToday !== 1 ? 's' : ''} hoje</p>
        </div>
      </div>
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="text-left px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">#</th>
            <th className="text-left px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Confeitaria</th>
            <th className="text-right px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {users.map((u, i) => (
            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <td className="px-5 py-3"><MedalBadge rank={i + 1} /></td>
              <td className="px-5 py-3">
                <span className="flex items-center">
                  <PremiumDot isPremium={u.isPremium} />
                  <span className="font-medium text-gray-900 dark:text-white">{u.companyName}</span>
                </span>
              </td>
              <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-200">{fmtDate(u.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1" />Premium
          <span className="inline-block w-2 h-2 rounded-full bg-gray-300 ml-3 mr-1" />Gratuito
        </p>
      </div>
    </div>
  );
}

function timeRemaining(dateStr: string | null): { label: string; color: string } {
  if (!dateStr) return { label: 'Sem expiração', color: 'text-gray-400' };
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return { label: 'Expirado', color: 'text-red-600' };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return { label: 'Expira hoje', color: 'text-red-600' };
  if (days <= 3) return { label: `${days}d restante${days > 1 ? 's' : ''}`, color: 'text-red-500' };
  if (days <= 7) return { label: `${days} dias`, color: 'text-orange-500' };
  if (days <= 30) return { label: `${days} dias`, color: 'text-yellow-600' };
  const months = Math.floor(days / 30);
  const remDays = days % 30;
  return { label: remDays > 0 ? `${months}m ${remDays}d` : `${months} mês${months > 1 ? 'es' : ''}`, color: 'text-green-600' };
}

function PremiumSubscribersTable({ subscribers }: { subscribers: PremiumSubscriber[] }) {
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const platformLabel = (p: string | null) => {
    if (p === 'ios') return 'iOS';
    if (p === 'android') return 'Android';
    if (p === 'manual') return 'Manual';
    return p || '—';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Crown size={18} className="text-primary-500" />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Assinantes premium</p>
          <p className="text-xs text-gray-400 mt-0.5">{subscribers.length} assinante{subscribers.length !== 1 ? 's' : ''} ativo{subscribers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      {subscribers.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Nenhum assinante premium</p>
      ) : (
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="text-left px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Confeitaria</th>
              <th className="text-left px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Plataforma</th>
              <th className="text-left px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Válido até</th>
              <th className="text-right px-5 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Tempo restante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {subscribers.map(s => {
              const remaining = timeRemaining(s.premiumUntil);
              return (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{s.companyName}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{platformLabel(s.premiumPlatform)}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{s.premiumUntil ? fmtDate(s.premiumUntil) : '—'}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${remaining.color}`}>{remaining.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5"><Skeleton className="h-5 w-40" /></div>
          <TableSkeleton rows={5} cols={3} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5"><Skeleton className="h-5 w-40" /></div>
          <TableSkeleton rows={5} cols={5} />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage({ toast }: { toast: (msg: string, type?: 'success' | 'error') => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Nova versao disponivel! Atualize seu Precifica Doces');
  const [emailIntro, setEmailIntro] = useState('Temos uma <strong>nova versao</strong> do Precifica Doces com varias melhorias para voce!');
  const [emailFeatures, setEmailFeatures] = useState(
    'Notificacoes push — Receba avisos importantes direto no celular\nDicas motivacionais — Dicas diarias para impulsionar seu negocio\nBanners informativos — Fique por dentro das novidades\nMelhorias de desempenho — App mais rapido e estavel'
  );
  const [emailCtaText, setEmailCtaText] = useState('Atualizar agora');
  const [emailCtaUrl, setEmailCtaUrl] = useState('https://apps.apple.com/app/precifica-doces/id6744712907');
  const [confirmEmail, setConfirmEmail] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const loadStats = () => {
    setRefreshing(true);
    api.getStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <p className="text-red-600 p-4">{error}</p>;
  if (!stats) return <DashboardSkeleton />;

  const premiumPct = stats.totalUsers > 0
    ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)
    : '0';

  const freeUsers = stats.totalUsers - stats.premiumUsers;
  const pieData = [
    { name: 'Premium', value: stats.premiumUsers },
    { name: 'Gratuito', value: freeUsers },
  ];

  const barData = [
    { name: 'Acumulado', value: stats.totalRevenue },
    { name: 'Este mês', value: stats.revenueThisMonth },
  ];

  const userStats = [
    { label: 'Total de usuários', value: stats.totalUsers },
    { label: 'Premium', value: stats.premiumUsers, sub: `${premiumPct}% do total` },
    { label: 'Novos hoje', value: stats.newUsersToday },
    { label: 'Novos esta semana', value: stats.newUsersWeek },
  ];

  const contentStats = [
    { label: 'Receitas criadas', value: stats.totalRecipes },
    { label: 'Ingredientes', value: stats.totalIngredients },
    { label: 'Vendas registradas', value: stats.totalSales },
  ];

  const revenueStats = [
    { label: 'Total acumulado', value: fmt(stats.totalRevenue), sub: 'todas as vendas desde o início' },
    { label: 'Este mês', value: fmt(stats.revenueThisMonth) },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Visão geral</h2>
        <button
          onClick={loadStats}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Usuários</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {userStats.map((s, i) => (
            <StatCard key={s.label} {...s} icon={STAT_ICONS[i].icon} iconStyle={STAT_ICONS[i].color} borderStyle={STAT_ICONS[i].border} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Conteúdo</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contentStats.map((s, i) => (
            <StatCard key={s.label} {...s} icon={CONTENT_ICONS[i].icon} iconStyle={CONTENT_ICONS[i].color} borderStyle={CONTENT_ICONS[i].border} />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Distribuição e Faturamento</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie Chart - Planos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Distribuição de planos</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Premium: <strong>{stats.premiumUsers}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Gratuito: <strong>{freeUsers}</strong></span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{premiumPct}% premium</p>
              </div>
            </div>
          </div>

          {/* Bar Chart - Faturamento */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Faturamento das confeiteiras</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="value" fill="#e91e8c" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Faturamento das confeiteiras
          <span className="ml-2 normal-case font-normal text-gray-400">(soma das vendas registradas no app)</span>
        </p>
        <div className="grid grid-cols-2 gap-4">
          {revenueStats.map((s, i) => (
            <StatCard key={s.label} {...s} icon={REVENUE_ICONS[i].icon} iconStyle={REVENUE_ICONS[i].color} borderStyle={REVENUE_ICONS[i].border} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Rankings</p>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <TopRevenueTable users={stats.topByRevenue} />
          <TopActivityTable users={stats.topByActivity} />
          <NewRegistrationsTable users={stats.recentUsers ?? []} newToday={stats.newUsersToday} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assinaturas</p>
        <PremiumSubscribersTable subscribers={stats.premiumSubscribers.filter(s => {
          if (s.email === 'santosdlaysa@gmail.com') return false;
          if (!s.premiumUntil) return true;
          return new Date(s.premiumUntil).getTime() > Date.now();
        })} />
      </div>

      {/* Email de atualização */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Comunicação</p>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <Mail size={20} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">Email de atualização</p>
                <p className="text-xs text-gray-400 truncate">Edite e envie email para todos os {stats.totalUsers} usuários</p>
              </div>
            </div>
            <button
              onClick={() => setEmailModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
            >
              Compor email
            </button>
          </div>
        </div>
      </div>

      {emailModalOpen && (
        <ModalOverlay onClose={() => { if (!sendingEmail) setEmailModalOpen(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Compor email de atualização</h3>
              <button onClick={() => { if (!sendingEmail) setEmailModalOpen(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">
              {/* Form */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Assunto</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Texto de introdução</label>
                  <textarea
                    rows={2}
                    value={emailIntro}
                    onChange={e => setEmailIntro(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Suporta HTML (ex: &lt;strong&gt;negrito&lt;/strong&gt;)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Novidades (1 por linha)</label>
                  <textarea
                    rows={5}
                    value={emailFeatures}
                    onChange={e => setEmailFeatures(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Texto do botão</label>
                    <input
                      type="text"
                      value={emailCtaText}
                      onChange={e => setEmailCtaText(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">URL do botão</label>
                    <input
                      type="url"
                      value={emailCtaUrl}
                      onChange={e => setEmailCtaUrl(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={16} className="text-gray-400" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Preview</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-4 text-sm space-y-3">
                  <div className="bg-primary-500 rounded-t-xl p-4 text-center text-white">
                    <p className="text-lg font-bold">Precifica Doces</p>
                    <p className="text-xs opacity-80">Gestao inteligente para confeiteiros</p>
                  </div>
                  <div className="bg-white rounded-b-xl p-4 space-y-3">
                    <p className="font-bold text-gray-800">Ola, [Nome]!</p>
                    <p className="text-gray-600 text-xs" dangerouslySetInnerHTML={{ __html: emailIntro }} />
                    <p className="font-semibold text-primary-500 text-xs">O que ha de novo:</p>
                    <ul className="space-y-1">
                      {emailFeatures.split('\n').filter(Boolean).map((f, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-primary-500 mt-0.5">&#10003;</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="text-center pt-2">
                      <span className="inline-block bg-primary-500 text-white text-xs font-bold px-4 py-2 rounded-lg">
                        {emailCtaText}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Assunto: {emailSubject}</p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              {!confirmEmail ? (
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
                  <button
                    onClick={() => { if (!sendingEmail) setEmailModalOpen(false); }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setConfirmEmail(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Enviar para {stats.totalUsers} usuários
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
                  <p className="text-sm text-orange-600 font-medium">Confirma o envio?</p>
                  <button
                    onClick={() => setConfirmEmail(false)}
                    disabled={sendingEmail}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={async () => {
                      setSendingEmail(true);
                      try {
                        const features = emailFeatures.split('\n').filter(Boolean);
                        const result = await api.sendUpdateEmail({
                          subject: emailSubject,
                          intro: emailIntro,
                          features,
                          ctaText: emailCtaText,
                          ctaUrl: emailCtaUrl,
                        });
                        toast(`Email enviado! ${result.sent} enviados, ${result.failed} falhas.`, 'success');
                        setEmailModalOpen(false);
                      } catch (e: any) {
                        toast(`Erro ao enviar: ${e.message}`, 'error');
                      } finally {
                        setSendingEmail(false);
                        setConfirmEmail(false);
                      }
                    }}
                    disabled={sendingEmail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingEmail && <Loader2 size={14} className="animate-spin" />}
                    {sendingEmail ? 'Enviando...' : 'Confirmar envio'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
