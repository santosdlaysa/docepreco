import { useEffect, useState } from 'react';
import { api, Stats, TopRevenueUser, TopActivityUser } from '../lib/api';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function PremiumDot({ isPremium }: { isPremium: boolean }) {
  return isPremium
    ? <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1.5" title="Premium" />
    : <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1.5" title="Gratuito" />;
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function TopRevenueTable({ users }: { users: TopRevenueUser[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="font-semibold text-gray-900">🏆 Maior faturamento</p>
        <p className="text-xs text-gray-400 mt-0.5">Faturamento das confeiteiras no app (todas as vendas registradas)</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-5 py-2.5 font-semibold text-gray-500">#</th>
            <th className="text-left px-5 py-2.5 font-semibold text-gray-500">Confeitaria</th>
            <th className="text-right px-5 py-2.5 font-semibold text-gray-500">Faturamento total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((u, i) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-5 py-3 text-gray-400 font-bold">{i + 1}</td>
              <td className="px-5 py-3">
                <span className="flex items-center">
                  <PremiumDot isPremium={u.isPremium} />
                  <span className="font-medium text-gray-900">{u.companyName}</span>
                </span>
              </td>
              <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(u.totalRevenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopActivityTable({ users }: { users: TopActivityUser[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="font-semibold text-gray-900">🔥 Mais ativas no app</p>
        <p className="text-xs text-gray-400 mt-0.5">Ordenado por vendas nos últimos 30 dias</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-5 py-2.5 font-semibold text-gray-500">#</th>
            <th className="text-left px-5 py-2.5 font-semibold text-gray-500">Confeitaria</th>
            <th className="text-right px-5 py-2.5 font-semibold text-gray-500">Vendas/30d</th>
            <th className="text-right px-5 py-2.5 font-semibold text-gray-500">Receitas</th>
            <th className="text-right px-5 py-2.5 font-semibold text-gray-500">Ingredientes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((u, i) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-5 py-3 text-gray-400 font-bold">{i + 1}</td>
              <td className="px-5 py-3">
                <span className="flex items-center">
                  <PremiumDot isPremium={u.isPremium} />
                  <span className="font-medium text-gray-900">{u.companyName}</span>
                </span>
              </td>
              <td className="px-5 py-3 text-right text-gray-700">{u.salesMonth}</td>
              <td className="px-5 py-3 text-right text-gray-700">{u.recipeCount}</td>
              <td className="px-5 py-3 text-right text-gray-700">{u.ingredientCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-5 py-2 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1" />Premium
          <span className="inline-block w-2 h-2 rounded-full bg-gray-300 ml-3 mr-1" />Gratuito
        </p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600 p-4">{error}</p>;
  if (!stats) return <p className="text-gray-400 p-4">Carregando...</p>;

  const premiumPct = stats.totalUsers > 0
    ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Visão geral</h2>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Usuários</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total de usuários" value={stats.totalUsers} />
          <StatCard label="Premium" value={stats.premiumUsers} sub={`${premiumPct}% do total`} />
          <StatCard label="Novos hoje" value={stats.newUsersToday} />
          <StatCard label="Novos esta semana" value={stats.newUsersWeek} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Conteúdo</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Receitas criadas" value={stats.totalRecipes} />
          <StatCard label="Ingredientes" value={stats.totalIngredients} />
          <StatCard label="Vendas registradas" value={stats.totalSales} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Faturamento das confeiteiras
          <span className="ml-2 normal-case font-normal text-gray-400">(soma das vendas registradas no app)</span>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total acumulado" value={fmt(stats.totalRevenue)} sub="todas as vendas desde o início" />
          <StatCard label="Este mês" value={fmt(stats.revenueThisMonth)} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Rankings</p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <TopRevenueTable users={stats.topByRevenue} />
          <TopActivityTable users={stats.topByActivity} />
        </div>
      </div>
    </div>
  );
}
