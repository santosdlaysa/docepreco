import { useEffect, useState, useCallback, useMemo } from 'react';
import { api, Stats, TopRevenueUser, TopActivityUser, PremiumSubscriber, RecentUser, PixRequestItem, AdminUserDetail } from '../lib/api';
import { Skeleton, TableSkeleton, ModalOverlay, PageSizeSelect } from '../components';
import {
  Users, Crown, CalendarPlus, CalendarDays,
  BookOpen, Egg, ShoppingCart, DollarSign, TrendingUp,
  Trophy, Flame, Mail, Loader2, X, Eye, UserRoundPlus, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown, QrCode, CheckCircle, XCircle, Clock,
  ArrowUpRight, Sparkles, Check,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import type { LucideIcon } from 'lucide-react';

/* ─── helpers ─── */
const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtShort = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/* card base */
const card = 'bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50';

/* ─── Stat Card with mini area chart ─── */
function StatCard({ label, value, sub, color, data }: {
  label: string; value: string | number; sub?: string; color: string;
  data?: number[];
}) {
  const sparkData = data?.map((v, i) => ({ v })) ?? [];
  return (
    <div className={`${card} p-4 sm:p-5 flex flex-col justify-between gap-3`}>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
          {sub && (
            <span className={`inline-flex items-center gap-1 mt-1.5 text-xs font-semibold ${color}`}>
              <ArrowUpRight size={12} />
              {sub}
            </span>
          )}
        </div>
        {sparkData.length > 0 && (
          <div className="hidden sm:block w-24 h-12 shrink-0 opacity-70">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color.includes('green') ? '#5FB180' : color.includes('blue') ? '#2646E1' : '#e91e8c'} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color.includes('green') ? '#5FB180' : color.includes('blue') ? '#2646E1' : '#e91e8c'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={color.includes('green') ? '#5FB180' : color.includes('blue') ? '#2646E1' : '#e91e8c'} strokeWidth={2} fill={`url(#grad-${label})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Progress bar row ─── */
function ProgressRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600 dark:text-gray-300 w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

/* ─── Avatar initials ─── */
const AVATAR_COLORS = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700', 'bg-red-100 text-red-700', 'bg-indigo-100 text-indigo-700'];

function Avatar({ name, index }: { name: string; index: number }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  const c = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${c}`}>
      {initials}
    </div>
  );
}

/* ─── Pagination ─── */

function Pagination({ page, totalPages, onPrev, onNext }: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
      <span className="text-xs text-gray-400">Pagina {page} de {totalPages}</span>
      <div className="flex gap-1">
        <button onClick={onPrev} disabled={page === 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
        <button onClick={onNext} disabled={page === totalPages} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

/* ─── Status badge ─── */
function StatusBadge({ label, variant }: { label: string; variant: 'green' | 'orange' | 'red' | 'gray' }) {
  const styles = {
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    orange: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };
  return <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${styles[variant]}`}>{label}</span>;
}

function timeRemaining(dateStr: string | null): { label: string; variant: 'green' | 'orange' | 'red' | 'gray' } {
  if (!dateStr) return { label: 'Vitalicio', variant: 'green' };
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return { label: 'Expirado', variant: 'red' };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const expDate = new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (days === 0) return { label: `Expira hoje (${expDate})`, variant: 'red' };
  if (days <= 7) return { label: `Expira em ${days}d (${expDate})`, variant: 'orange' };
  if (days <= 30) return { label: `Expira em ${days}d (${expDate})`, variant: 'orange' };
  const m = Math.floor(days / 30);
  const rd = days % 30;
  const remaining = rd ? `${m}m ${rd}d` : `${m} meses`;
  return { label: `Expira em ${remaining} (${expDate})`, variant: 'green' };
}

function timeSinceExpired(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoje';
  if (days < 30) return `${days}d atras`;
  const m = Math.floor(days / 30);
  return `${m} mes${m > 1 ? 'es' : ''} atras`;
}

function platformLabel(p: string | null) {
  if (p === 'ios') return 'App Store';
  if (p === 'android') return 'Google Play';
  if (p === 'manual') return 'PIX';
  return '—';
}

/* ─── Cabeçalho de coluna "Plataforma" com filtro dropdown ─── */
function FilterOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      {label}
      {active && <Check size={13} />}
    </button>
  );
}

function PlatformFilterTh({ value, onChange, options }: {
  value: string | null;
  onChange: (v: string | null) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          Plataforma
          <ChevronDown size={12} className={value ? 'text-pink-500' : 'text-gray-400'} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 mt-1.5 z-20 min-w-[150px] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 normal-case tracking-normal">
              <FilterOption label="Todas" active={value === null} onClick={() => { onChange(null); setOpen(false); }} />
              {options.map(p => (
                <FilterOption key={p} label={platformLabel(p)} active={value === p} onClick={() => { onChange(p); setOpen(false); }} />
              ))}
            </div>
          </>
        )}
      </div>
    </th>
  );
}

/* ─── Top Customers (card-style list) ─── */
function TopCustomersCard({ users }: { users: TopRevenueUser[] }) {
  return (
    <div className={card}>
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Top Confeiteiras</h3>
        <span className="text-xs text-gray-400">Vendas das confeiteiras</span>
      </div>
      <div className="px-5 pb-5 space-y-3">
        {users.slice(0, 5).map((u, i) => (
          <div key={u.id} className="flex items-center gap-3">
            <Avatar name={u.companyName} index={i} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.companyName}</p>
              <p className="text-xs text-gray-400">{u.isPremium ? 'Premium' : 'Gratuito'}</p>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmt(u.totalRevenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Activity ranking ─── */
function ActivityCard({ users }: { users: TopActivityUser[] }) {
  return (
    <div className={card}>
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Mais Ativas</h3>
        <span className="text-xs text-gray-400">Ultimos 30 dias</span>
      </div>
      <div className="px-5 pb-5 space-y-3">
        {users.slice(0, 5).map((u, i) => (
          <div key={u.id} className="flex items-center gap-3">
            <Avatar name={u.companyName} index={i + 3} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.companyName}</p>
              <p className="text-xs text-gray-400">{u.salesMonth} vendas · {u.recipeCount} receitas</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── User detail modal ─── */
function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getUser(userId).then(setUser).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  const fmtDateFull = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Detalhes do Usuario</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-60" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : !user ? (
          <p className="p-6 text-sm text-gray-400">Usuario nao encontrado</p>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Avatar name={user.companyName} index={0} />
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{user.companyName}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
              {user.isPremium ? <StatusBadge label="Premium" variant="green" /> : <StatusBadge label="Gratuito" variant="gray" />}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`${card} p-3`}>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Receitas</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{user.recipeCount}</p>
              </div>
              <div className={`${card} p-3`}>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Ingredientes</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{user.ingredientCount}</p>
              </div>
              <div className={`${card} p-3`}>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Vendas</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{user.saleCount}</p>
              </div>
              <div className={`${card} p-3`}>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Faturamento</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{fmt(user.totalRevenue)}</p>
              </div>
            </div>

            {/* Details list */}
            <div className="space-y-3 text-sm">
              {user.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Telefone</span>
                  <span className="text-gray-900 dark:text-white font-medium">{user.phone}</span>
                </div>
              )}
              {user.instagramHandle && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Instagram</span>
                  <span className="text-gray-900 dark:text-white font-medium">@{user.instagramHandle}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Cadastro</span>
                <span className="text-gray-900 dark:text-white font-medium">{fmtDateFull(user.createdAt)}</span>
              </div>
              {user.lastSeenAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Ultimo acesso</span>
                  <span className="text-gray-900 dark:text-white font-medium">{fmtDateFull(user.lastSeenAt)}</span>
                </div>
              )}
              {user.isPremium && user.premiumUntil && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Premium ate</span>
                  <span className="text-gray-900 dark:text-white font-medium">{fmtDate(user.premiumUntil)}</span>
                </div>
              )}
              {user.isPremium && user.premiumPlatform && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Plataforma</span>
                  <span className="text-gray-900 dark:text-white font-medium">{platformLabel(user.premiumPlatform)}</span>
                </div>
              )}
            </div>

            {/* Recent sales */}
            {user.recentSales && user.recentSales.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Vendas Recentes</p>
                <div className="space-y-2">
                  {user.recentSales.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-900 dark:text-white font-medium">{s.recipeName}</span>
                        <span className="text-gray-400 ml-2">x{s.quantitySold}</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{fmt(s.totalRevenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

/* ─── New users ─── */
function NewUsersCard({ users, newToday }: { users: RecentUser[]; newToday: number }) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  return (
    <>
      <div className={card}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Novos Cadastros</h3>
          <StatusBadge label={`+${newToday} hoje`} variant="green" />
        </div>
        <div className="px-5 pb-5 space-y-3">
          {users.slice(0, 5).map((u, i) => (
            <div key={u.id} onClick={() => setSelectedUserId(u.id)} className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <Avatar name={u.companyName} index={i + 5} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.companyName}</p>
                <p className="text-xs text-gray-400">{fmtShort(u.createdAt)}</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 shrink-0" />
            </div>
          ))}
        </div>
      </div>
      {selectedUserId && <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </>
  );
}

/* ─── Subscriber tables ─── */
function PlanBadge({ planTier }: { planTier?: string | null }) {
  if (planTier === 'master') {
    return <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 uppercase">Master</span>;
  }
  if (planTier === 'premium') {
    return <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 uppercase">Premium</span>;
  }
  return null;
}

function PremiumSubscribersTable({ subscribers }: { subscribers: PremiumSubscriber[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [platform, setPlatform] = useState<string | null>(null);

  // Plataformas presentes entre os assinantes (para as opções do filtro)
  const platforms = useMemo(() => {
    const set = new Set<string>();
    subscribers.forEach(s => { if (s.premiumPlatform) set.add(s.premiumPlatform); });
    return Array.from(set).sort();
  }, [subscribers]);

  const filtered = useMemo(
    () => (platform ? subscribers.filter(s => s.premiumPlatform === platform) : subscribers),
    [subscribers, platform],
  );

  // Volta para a primeira página ao trocar o filtro ou o tamanho da página
  useEffect(() => { setPage(1); }, [platform, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={card}>
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Assinantes Ativos</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">{filtered.length}</span>
          <PageSizeSelect value={pageSize} onChange={setPageSize} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Nenhum assinante</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Nome</th>
                <PlatformFilterTh value={platform} onChange={setPlatform} options={platforms} />
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Valido ate</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s, i) => {
                const r = timeRemaining(s.premiumUntil);
                return (
                  <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.companyName} index={i} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">{s.companyName} <PlanBadge planTier={s.planTier} /></p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{platformLabel(s.premiumPlatform)}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{s.premiumUntil ? fmtDate(s.premiumUntil) : '—'}</td>
                    <td className="px-5 py-3 text-right"><StatusBadge label={r.label} variant={r.variant} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}
    </div>
  );
}

function ExpiredSubscribersTable({ subscribers }: { subscribers: PremiumSubscriber[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(subscribers.length / pageSize));
  const paged = subscribers.slice((page - 1) * pageSize, page * pageSize);

  const handlePageSizeChange = (n: number) => {
    setPageSize(n);
    setPage(1);
  };

  return (
    <div className={card}>
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Assinantes Expirados</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">{subscribers.length}</span>
          <PageSizeSelect value={pageSize} onChange={handlePageSizeChange} />
        </div>
      </div>
      {subscribers.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Nenhuma assinatura expirada</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Plataforma</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Expirou em</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Tempo</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s, i) => (
                <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.companyName} index={i + 4} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">{s.companyName} <PlanBadge planTier={s.planTier} /></p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{platformLabel(s.premiumPlatform)}</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{s.premiumUntil ? fmtDate(s.premiumUntil) : '—'}</td>
                  <td className="px-5 py-3 text-right"><StatusBadge label={s.premiumUntil ? timeSinceExpired(s.premiumUntil) : '—'} variant="red" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}
    </div>
  );
}

/* ─── Skeleton ─── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => <div key={i} className={`${card} p-5 space-y-3`}><Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-24" /></div>)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {[...Array(2)].map((_, i) => <div key={i} className={`${card}`}><div className="p-5"><Skeleton className="h-5 w-32" /></div><TableSkeleton rows={5} cols={3} /></div>)}
      </div>
    </div>
  );
}

/* ─── PIX Pending ─── */
function PixPendingCard({ toast }: { toast: (msg: string, type?: 'success' | 'error') => void }) {
  const [requests, setRequests] = useState<PixRequestItem[]>([]);
  const [approving, setApproving] = useState<string | null>(null);

  const load = useCallback(async () => { try { setRequests(await api.listPixRequests('pending')); } catch {} }, []);
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);

  if (requests.length === 0) return null;

  const fmtMoney = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const timeSince = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'agora'; if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60); return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
  };

  return (
    <div className={`${card} border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 p-5`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center">
          <QrCode size={16} className="text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{requests.length} PIX pendente{requests.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-amber-600">Atualiza a cada 15s</p>
        </div>
      </div>
      <div className="space-y-2">
        {requests.map(req => (
          <div key={req.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={req.companyName} index={0} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{req.companyName}</p>
                <p className="text-xs text-gray-400">{req.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label={req.planLabel} variant="gray" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtMoney(req.amountCents)}</span>
              <span className="text-xs text-gray-400">{timeSince(req.createdAt)}</span>
              <button onClick={() => { setApproving(req.id); api.approvePixRequest(req.id, req.planLabel === 'Anual' ? 365 : 30).then(() => { toast(`Premium liberado para ${req.companyName}`, 'success'); load(); }).catch((e: any) => toast(e.message || 'Erro', 'error')).finally(() => setApproving(null)); }}
                disabled={approving === req.id}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                Aprovar
              </button>
              <button onClick={() => { api.rejectPixRequest(req.id).then(() => { toast('Rejeitado', 'success'); load(); }).catch((e: any) => toast(e.message || 'Erro', 'error')); }}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors">
                Rejeitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════ MAIN DASHBOARD ═══════════ */
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

  const loadStats = () => { setRefreshing(true); api.getStats().then(setStats).catch(e => setError(e.message)).finally(() => setRefreshing(false)); };
  useEffect(() => { loadStats(); const i = setInterval(loadStats, 60_000); return () => clearInterval(i); }, []);

  if (error) return <p className="text-red-600 p-4">{error}</p>;
  if (!stats) return <DashboardSkeleton />;

  const masterUsers = stats.masterUsers ?? 0;
  const premiumOnlyUsers = Math.max(0, stats.premiumUsers - masterUsers);
  const freeUsers = stats.totalUsers - stats.premiumUsers;
  const pctOfTotal = (n: number) => (stats.totalUsers > 0 ? ((n / stats.totalUsers) * 100).toFixed(1) : '0');
  const premiumPct = pctOfTotal(stats.premiumUsers);
  const premiumOnlyPct = pctOfTotal(premiumOnlyUsers);
  const masterPct = pctOfTotal(masterUsers);
  const freePct = pctOfTotal(freeUsers);

  const activeSubscribers = stats.premiumSubscribers.filter(s => {
    if (s.email === 'santosdlaysa@gmail.com') return false;
    if (!s.premiumUntil) return true;
    return new Date(s.premiumUntil).getTime() > Date.now();
  });
  const expiredSubscribers = stats.premiumSubscribers.filter(s => {
    if (s.email === 'santosdlaysa@gmail.com') return false;
    if (!s.premiumUntil) return false;
    return new Date(s.premiumUntil).getTime() <= Date.now();
  });

  const iosCount = activeSubscribers.filter(s => s.premiumPlatform === 'ios').length;
  const androidCount = activeSubscribers.filter(s => s.premiumPlatform === 'android').length;
  const manualCount = activeSubscribers.filter(s => s.premiumPlatform === 'manual' || !s.premiumPlatform).length;
  const platTotal = activeSubscribers.length || 1;

  // Fake sparkline data (trend-like)
  const spark1 = [3, 5, 4, 7, 6, 8, 9, stats.newUsersToday];
  const spark2 = [2, 3, 2, 4, 3, 5, 4, stats.premiumUsers];
  const spark3 = [1, 2, 3, 2, 4, 3, 5, 6];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Dashboard</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">Visao Geral</h2>
        </div>
        <button onClick={loadStats} disabled={refreshing}
          className={`${card} px-4 py-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50`}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <PixPendingCard toast={toast} />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard label="Total de Usuarios" value={stats.totalUsers} sub={`+${stats.newUsersToday} hoje`} color="text-blue-600" data={spark1} />
        <StatCard label="Assinantes" value={stats.premiumUsers} sub={`${premiumPct}% conversao · ${premiumOnlyUsers} Premium · ${masterUsers} Master`} color="text-primary-600" data={spark2} />
        <StatCard label="Vendas do Mes" value={fmt(stats.revenueThisMonth)} sub="confeiteiras" color="text-emerald-600" data={spark3} />
        <StatCard label="Vendas Totais" value={fmt(stats.totalRevenue)} sub="confeiteiras" color="text-violet-600" />
      </div>

      {/* Revenue chart + Gradient payout card + Top customers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Revenue bar chart */}
        <div className={`${card} p-5 lg:col-span-5`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Vendas das Confeiteiras</p>
            <span className="text-xs font-semibold text-emerald-600">+{((stats.revenueThisMonth / (stats.totalRevenue || 1)) * 100).toFixed(0)}% este mes</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{fmt(stats.totalRevenue)}</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={[
              { name: 'Receitas', value: stats.totalRecipes },
              { name: 'Ingredientes', value: stats.totalIngredients },
              { name: 'Vendas', value: stats.totalSales },
              { name: 'Usuarios', value: stats.totalUsers },
            ]} margin={{ left: -10, right: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => Number(v).toLocaleString('pt-BR')} />
              <Bar dataKey="value" fill="#2646E1" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gradient card (premium summary) */}
        <div className="lg:col-span-3 rounded-2xl p-5 text-white flex flex-col justify-between relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #e91e8c 100%)' }}>
          <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
          <div className="relative space-y-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm opacity-80">Assinantes ativos</p>
                <p className="text-3xl font-bold">{activeSubscribers.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">Expirados</p>
                <p className="text-3xl font-bold">{expiredSubscribers.length}</p>
              </div>
            </div>
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between text-sm"><span className="opacity-80">App Store</span><span className="font-semibold">{iosCount}</span></div>
              <div className="w-full bg-white/20 rounded-full h-1.5"><div className="bg-white h-1.5 rounded-full" style={{ width: `${(iosCount / platTotal) * 100}%` }} /></div>
              <div className="flex justify-between text-sm"><span className="opacity-80">Google Play</span><span className="font-semibold">{androidCount}</span></div>
              <div className="w-full bg-white/20 rounded-full h-1.5"><div className="bg-white h-1.5 rounded-full" style={{ width: `${(androidCount / platTotal) * 100}%` }} /></div>
              <div className="flex justify-between text-sm"><span className="opacity-80">PIX / Manual</span><span className="font-semibold">{manualCount}</span></div>
              <div className="w-full bg-white/20 rounded-full h-1.5"><div className="bg-white h-1.5 rounded-full" style={{ width: `${(manualCount / platTotal) * 100}%` }} /></div>
            </div>
          </div>
        </div>

        {/* Top customers */}
        <div className="lg:col-span-4">
          <TopCustomersCard users={stats.topByRevenue} />
        </div>
      </div>

      {/* Distribution + Growth stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Pie chart */}
        <div className={`${card} p-5 lg:col-span-4`}>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Distribuicao de Planos</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie data={[{ v: masterUsers }, { v: premiumOnlyUsers }, { v: freeUsers }]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="v" strokeWidth={0}>
                  <Cell fill="#7C3AED" />
                  <Cell fill="#e91e8c" />
                  <Cell fill="#e5e7eb" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded" style={{ background: '#7C3AED' }} />
                <span className="text-sm text-gray-600 dark:text-gray-300">Master</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white ml-auto">{masterUsers}</span>
                <span className="text-xs text-gray-400 w-12 text-right">{masterPct}%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded bg-primary-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Premium</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white ml-auto">{premiumOnlyUsers}</span>
                <span className="text-xs text-gray-400 w-12 text-right">{premiumOnlyPct}%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded bg-gray-300" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Gratuito</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white ml-auto">{freeUsers}</span>
                <span className="text-xs text-gray-400 w-12 text-right">{freePct}%</span>
              </div>
              <p className="text-xs text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">Conversao total: {premiumPct}%</p>
            </div>
          </div>
        </div>

        {/* Growth numbers */}
        <div className={`${card} p-5 lg:col-span-4`}>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Crescimento</h3>
          <div className="space-y-4">
            <ProgressRow label="Hoje" value={stats.newUsersToday} total={stats.newUsersMonth || 1} color="bg-blue-500" />
            <ProgressRow label="Semana" value={stats.newUsersWeek} total={stats.newUsersMonth || 1} color="bg-indigo-500" />
            <ProgressRow label="Mes" value={stats.newUsersMonth} total={stats.newUsersMonth || 1} color="bg-violet-500" />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalRecipes}</p><p className="text-xs text-gray-400">Receitas</p></div>
            <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalIngredients}</p><p className="text-xs text-gray-400">Ingredientes</p></div>
            <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalSales}</p><p className="text-xs text-gray-400">Vendas</p></div>
          </div>
        </div>

        {/* Rankings */}
        <div className="lg:col-span-4 grid grid-rows-2 gap-5">
          <ActivityCard users={stats.topByActivity} />
          <NewUsersCard users={stats.recentUsers ?? []} newToday={stats.newUsersToday} />
        </div>
      </div>

      {/* Subscriptions */}
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Assinaturas</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <PremiumSubscribersTable subscribers={activeSubscribers} />
          <ExpiredSubscribersTable subscribers={expiredSubscribers} />
        </div>
      </div>

      {/* Email */}
      <div className={`${card} px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center"><Mail size={18} className="text-blue-600" /></div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Email de Atualizacao</p>
            <p className="text-xs text-gray-400">Enviar para {stats.totalUsers} usuarios</p>
          </div>
        </div>
        <button onClick={() => setEmailModalOpen(true)}
          className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors shrink-0">
          Compor email
        </button>
      </div>

      {/* Email modal */}
      {emailModalOpen && (
        <ModalOverlay onClose={() => { if (!sendingEmail) setEmailModalOpen(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Compor email</h3>
              <button onClick={() => { if (!sendingEmail) setEmailModalOpen(false); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-700">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Assunto</label>
                  <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Introducao</label>
                  <textarea rows={2} value={emailIntro} onChange={e => setEmailIntro(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Novidades (1 por linha)</label>
                  <textarea rows={5} value={emailFeatures} onChange={e => setEmailFeatures(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Botao</label>
                    <input type="text" value={emailCtaText} onChange={e => setEmailCtaText(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none dark:bg-gray-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">URL</label>
                    <input type="url" value={emailCtaUrl} onChange={e => setEmailCtaUrl(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none dark:bg-gray-700 dark:text-white" />
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Preview</p>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-sm space-y-3">
                  <div className="bg-primary-500 rounded-t-xl p-4 text-center text-white"><p className="font-bold">Precifica Doces</p><p className="text-xs opacity-80">Gestao inteligente para confeiteiros</p></div>
                  <div className="bg-white rounded-b-xl p-4 space-y-3">
                    <p className="font-semibold text-gray-800 text-sm">Ola, [Nome]!</p>
                    <p className="text-gray-600 text-xs" dangerouslySetInnerHTML={{ __html: emailIntro }} />
                    <ul className="space-y-1">{emailFeatures.split('\n').filter(Boolean).map((f, i) => (<li key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><CheckCircle size={12} className="text-primary-500 mt-0.5 shrink-0" /><span>{f}</span></li>))}</ul>
                    <div className="text-center pt-2"><span className="inline-block bg-primary-500 text-white text-xs font-bold px-4 py-2 rounded-lg">{emailCtaText}</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 justify-end">
              {!confirmEmail ? (
                <>
                  <button onClick={() => { if (!sendingEmail) setEmailModalOpen(false); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancelar</button>
                  <button onClick={() => setConfirmEmail(true)} className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors">Enviar para {stats.totalUsers} usuarios</button>
                </>
              ) : (
                <>
                  <span className="text-sm text-amber-600 font-medium mr-2">Confirmar?</span>
                  <button onClick={() => setConfirmEmail(false)} disabled={sendingEmail} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors">Voltar</button>
                  <button onClick={async () => {
                    setSendingEmail(true);
                    try { const f = emailFeatures.split('\n').filter(Boolean); const r = await api.sendUpdateEmail({ subject: emailSubject, intro: emailIntro, features: f, ctaText: emailCtaText, ctaUrl: emailCtaUrl }); toast(`${r.sent} enviados, ${r.failed} falhas.`, 'success'); setEmailModalOpen(false); }
                    catch (e: any) { toast(e.message, 'error'); } finally { setSendingEmail(false); setConfirmEmail(false); }
                  }} disabled={sendingEmail}
                    className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                    {sendingEmail && <Loader2 size={14} className="animate-spin" />}
                    {sendingEmail ? 'Enviando...' : 'Confirmar'}
                  </button>
                </>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
