import { useEffect, useState } from 'react';
import { api, Stats } from '../lib/api';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
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
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Faturamento</p>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Faturamento total" value={fmt(stats.totalRevenue)} sub="soma de todas as vendas" />
          <StatCard label="Este mês" value={fmt(stats.revenueThisMonth)} />
        </div>
      </div>
    </div>
  );
}
