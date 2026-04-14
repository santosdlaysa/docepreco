import { useEffect, useState, useCallback } from 'react';
import { api, AdminUser, AdminUserDetail } from '../lib/api';
import { Skeleton, TableSkeleton, ModalOverlay, ToastFn } from '../components';
import { Crown, Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

type SortKey = 'createdAt' | 'recipeCount' | 'ingredientCount' | 'saleCount' | 'totalRevenue' | 'lastSeenAt';

function PremiumBadge({ isPremium, platform }: { isPremium: boolean; platform: string | null }) {
  if (!isPremium) return <span className="text-xs text-gray-400">Gratuito</span>;
  const label = platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Manual';
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
      <Crown size={12} />
      {label}
    </span>
  );
}

function SortIcon({ active }: { active: boolean }) {
  return (
    <ChevronDown size={14} className={`inline ml-0.5 ${active ? 'text-primary-600' : 'text-gray-300'}`} />
  );
}

function UserModal({ userId, onClose, toast }: { userId: string; onClose: () => void; toast: ToastFn }) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [premiumDays, setPremiumDays] = useState('30');

  useEffect(() => {
    api.getUser(userId).then(setUser).catch(console.error);
  }, [userId]);

  const togglePremium = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let premiumUntil: string | null = null;
      if (!user.isPremium) {
        const days = parseInt(premiumDays);
        if (!days || days <= 0) {
          toast.error('Informe um período válido');
          setSaving(false);
          return;
        }
        const until = new Date();
        until.setDate(until.getDate() + days);
        premiumUntil = until.toISOString();
      }
      await api.setPremium(user.id, !user.isPremium, premiumUntil);
      const msg = user.isPremium ? 'Premium removido.' : `Premium ativado por ${premiumDays} dias!`;
      setUser(prev => prev ? { ...prev, isPremium: !prev.isPremium, premiumUntil: premiumUntil } : prev);
      toast.success(msg);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Detalhes do usuário</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {!user ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <p className="font-semibold text-gray-900">{user.companyName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400 mt-1">Cadastrado em {fmtDate(user.createdAt)}</p>
              {user.lastSeenAt && (
                <p className="text-xs text-gray-400">Último acesso: {new Date(user.lastSeenAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(user.lastSeenAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Status premium</p>
                  <div className="mt-1">
                    <PremiumBadge isPremium={user.isPremium} platform={user.premiumPlatform} />
                  </div>
                  {user.premiumUntil && (
                    <p className="text-xs text-gray-400 mt-1">
                      Válido até {fmtDate(user.premiumUntil)}
                    </p>
                  )}
                </div>
                <button
                  onClick={togglePremium}
                  disabled={saving}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                    user.isPremium
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }`}
                >
                  {saving ? '...' : user.isPremium ? 'Remover premium' : 'Dar premium'}
                </button>
              </div>
              {!user.isPremium && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Período:</label>
                  <select
                    value={premiumDays}
                    onChange={e => setPremiumDays(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                    <option value="90">3 meses</option>
                    <option value="180">6 meses</option>
                    <option value="365">1 ano</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Receitas', value: user.recipeCount },
                { label: 'Ingredientes', value: user.ingredientCount },
                { label: 'Vendas', value: user.saleCount },
                { label: 'Faturamento total', value: fmtCurrency(user.totalRevenue) },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="font-bold text-gray-900 mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>

            {user.recentSales.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Últimas vendas</p>
                <div className="space-y-2">
                  {user.recentSales.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                      <div>
                        <p className="text-gray-800">{s.recipeName ?? '—'}</p>
                        <p className="text-xs text-gray-400">{fmtDate(s.saleDate)} · {s.quantitySold}x</p>
                      </div>
                      <p className="font-semibold text-gray-900">{fmtCurrency(s.totalRevenue)}</p>
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

export function UsersPage({ toast }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [premiumFilter, setPremiumFilter] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtDateTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listUsers({ search, page, isPremium: premiumFilter ?? undefined, sortBy });
      setUsers(res.users);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, page, premiumFilter, sortBy]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (key: SortKey) => {
    setSortBy(key);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20);

  const ColHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <th
      className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-primary-600 select-none whitespace-nowrap"
      onClick={() => handleSort(sortKey)}
    >
      {label}<SortIcon active={sortBy === sortKey} />
    </th>
  );

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Usuários</h2>
        <span className="text-sm text-gray-400">{total} no total</span>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
          />
        </div>
        <select
          value={premiumFilter === null ? '' : String(premiumFilter)}
          onChange={e => {
            setPremiumFilter(e.target.value === '' ? null : e.target.value === 'true');
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos os planos</option>
          <option value="true">Somente premium</option>
          <option value="false">Somente gratuito</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Confeitaria</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Plano</th>
                <ColHeader label="Receitas"      sortKey="recipeCount" />
                <ColHeader label="Ingredientes"  sortKey="ingredientCount" />
                <ColHeader label="Vendas"        sortKey="saleCount" />
                <ColHeader label="Faturamento"   sortKey="totalRevenue" />
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-primary-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('lastSeenAt')}
                >
                  Último acesso<SortIcon active={sortBy === 'lastSeenAt'} />
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-primary-600 select-none"
                  onClick={() => handleSort('createdAt')}
                >
                  Cadastro<SortIcon active={sortBy === 'createdAt'} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={9}>
                    <TableSkeleton rows={8} cols={8} />
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">Nenhum usuário encontrado</td>
                </tr>
              )}
              {!loading && users.map((u, i) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 20}ms` }}
                  onClick={() => setSelectedId(u.id)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{u.companyName}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <PremiumBadge isPremium={u.isPremium} platform={u.premiumPlatform} />
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'recipeCount' ? 'text-primary-600' : 'text-gray-700'}`}>{u.recipeCount}</td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'ingredientCount' ? 'text-primary-600' : 'text-gray-700'}`}>{u.ingredientCount}</td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'saleCount' ? 'text-primary-600' : 'text-gray-700'}`}>{u.saleCount}</td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'totalRevenue' ? 'text-primary-600' : 'text-gray-700'}`}>{fmtCurrency(u.totalRevenue)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${sortBy === 'lastSeenAt' ? 'text-primary-600' : 'text-gray-400'}`}>{u.lastSeenAt ? fmtDateTime(u.lastSeenAt) : '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-40 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === p
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-40 hover:text-gray-900 transition-colors"
            >
              Próxima
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {selectedId && (
        <UserModal
          userId={selectedId}
          onClose={() => { setSelectedId(null); load(); }}
          toast={toast}
        />
      )}
    </div>
  );
}
