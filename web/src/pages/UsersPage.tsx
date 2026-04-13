import { useEffect, useState, useCallback } from 'react';
import { api, AdminUser, AdminUserDetail } from '../lib/api';

type SortKey = 'createdAt' | 'recipeCount' | 'ingredientCount' | 'saleCount' | 'totalRevenue';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'createdAt',       label: 'Mais recentes' },
  { key: 'totalRevenue',    label: 'Maior faturamento' },
  { key: 'recipeCount',     label: 'Mais receitas' },
  { key: 'ingredientCount', label: 'Mais ingredientes' },
  { key: 'saleCount',       label: 'Mais vendas' },
];

function PremiumBadge({ isPremium, platform }: { isPremium: boolean; platform: string | null }) {
  if (!isPremium) return <span className="text-xs text-gray-400">Gratuito</span>;
  const label = platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Manual';
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
      ⭐ {label}
    </span>
  );
}

function SortIcon({ active }: { active: boolean }) {
  return (
    <span className={`ml-1 ${active ? 'text-primary-600' : 'text-gray-300'}`}>▼</span>
  );
}

function UserModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getUser(userId).then(setUser).catch(console.error);
  }, [userId]);

  const togglePremium = async () => {
    if (!user) return;
    setSaving(true);
    setMsg('');
    try {
      await api.setPremium(user.id, !user.isPremium, user.isPremium ? null : undefined);
      setUser(prev => prev ? { ...prev, isPremium: !prev.isPremium } : prev);
      setMsg(user.isPremium ? 'Premium removido.' : 'Premium ativado!');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Detalhes do usuário</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {!user ? (
          <p className="p-5 text-gray-400">Carregando...</p>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <p className="font-semibold text-gray-900">{user.companyName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400 mt-1">Cadastrado em {fmtDate(user.createdAt)}</p>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
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
            {msg && <p className="text-sm text-primary-600 font-medium">{msg}</p>}

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
                        <p className="text-xs text-gray-400">{fmtDate(s.saleDate)} · {s.quantitySold}×</p>
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
    </div>
  );
}

export function UsersPage() {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Usuários</h2>
        <span className="text-sm text-gray-400">{total} no total</span>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
        />
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
        <select
          value={sortBy}
          onChange={e => handleSort(e.target.value as SortKey)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                  <td colSpan={8} className="text-center py-8 text-gray-400">Carregando...</td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">Nenhum usuário encontrado</td>
                </tr>
              )}
              {!loading && users.map(u => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
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
              className="text-sm text-gray-500 disabled:opacity-40 hover:text-gray-900"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-400">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-sm text-gray-500 disabled:opacity-40 hover:text-gray-900"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>

      {selectedId && (
        <UserModal
          userId={selectedId}
          onClose={() => { setSelectedId(null); load(); }}
        />
      )}
    </div>
  );
}
