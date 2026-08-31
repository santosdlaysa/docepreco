import { useCallback, useEffect, useState } from 'react';
import { Activity, BookOpen, RefreshCw, Search, ShoppingCart, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api, AdminUser, Stats } from '../lib/api';

const card = 'bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50';
const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const date = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : 'Nunca acessou';

function planLabel(user: AdminUser): string {
  if (user.planTier === 'master') return 'Master';
  if (user.isPremium || user.planTier === 'premium') return 'Premium';
  return 'Gratuito';
}

export function ActivityUsersPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summary, result] = await Promise.all([
        api.getStats(),
        api.listUsers({ search: search.trim() || undefined, limit: 50, sortBy: 'saleCount', lastSeenDays: 30 }),
      ]);
      setStats(summary);
      setUsers(result.users);
      setTotal(result.total);
    } catch {
      setError('Não foi possível carregar os dados de atividade.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Atividade dos cadastros</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Usuários com acesso nos últimos 30 dias e seus indicadores de uso.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {stats && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            [Users, 'Total de usuários', stats.totalUsers, 'todos os cadastros'],
            [Activity, 'Ativos (30 dias)', total, 'com acesso recente'],
            [ShoppingCart, 'Vendas registradas', stats.totalSales, 'em toda a base'],
            [BookOpen, 'Receitas cadastradas', stats.totalRecipes, 'em toda a base'],
          ] as Array<[LucideIcon, string, number, string]>).map(([Icon, label, value, sub]) => (
            <div className={`${card} p-4`} key={String(label)}>
              <Icon size={18} className="text-primary-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-1">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className={`${card} overflow-hidden`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Cadastros mais ativos</h2>
            <p className="text-xs text-gray-400 mt-1">Ordenados pela quantidade total de vendas, entre quem acessou nos últimos 30 dias.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuário..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-200" />
          </div>
        </div>
        {error ? <p className="p-6 text-sm text-red-500">{error}</p> : loading ? <p className="p-6 text-sm text-gray-400">Carregando...</p> : users.length === 0 ? <p className="p-6 text-sm text-gray-400">Nenhum usuário ativo encontrado.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700/50">
                <th className="px-4 py-3 font-medium">Usuário</th><th className="px-4 py-3 font-medium">Plano</th><th className="px-4 py-3 font-medium">Último acesso</th><th className="px-4 py-3 font-medium text-right">Receitas</th><th className="px-4 py-3 font-medium text-right">Ingredientes</th><th className="px-4 py-3 font-medium text-right">Vendas</th><th className="px-4 py-3 font-medium text-right">Faturamento</th>
              </tr></thead>
              <tbody>{users.map(user => <tr key={user.id} className="border-b last:border-0 border-gray-50 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3"><p className="font-semibold text-gray-900 dark:text-white">{user.companyName}</p><p className="text-xs text-gray-400">{user.email}</p></td><td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${user.planTier === 'master' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : user.isPremium ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{planLabel(user)}</span></td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{date(user.lastSeenAt)}</td><td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">{user.recipeCount}</td><td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">{user.ingredientCount}</td><td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{user.saleCount}</td><td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">{fmt(user.totalRevenue)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
