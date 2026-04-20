import { useEffect, useState } from 'react';
import { api, UserData } from '../lib/api';
import { Skeleton } from '../components';
import {
  ArrowLeft,
  Crown,
  CakeSlice,
  ShoppingBasket,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  userId: string;
  onBack: () => void;
}

type Tab = 'recipes' | 'ingredients' | 'sales';

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

export function UserDataPage({ userId, onBack }: Props) {
  const [data, setData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('recipes');
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api.getUserData(userId)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Erro ao carregar dados'));
  }, [userId]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Erro ao carregar dados do usuario</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
          <button
            onClick={() => { setError(null); api.getUserData(userId).then(setData).catch(e => setError(e instanceof Error ? e.message : 'Erro')); }}
            className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const { user, recipes, ingredients, sales } = data;
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalRevenue, 0);

  const tabs: Array<{ id: Tab; label: string; count: number; icon: typeof CakeSlice }> = [
    { id: 'recipes', label: 'Receitas', count: recipes.length, icon: CakeSlice },
    { id: 'ingredients', label: 'Ingredientes', count: ingredients.length, icon: ShoppingBasket },
    { id: 'sales', label: 'Vendas', count: sales.length, icon: DollarSign },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.companyName}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <PremiumBadge isPremium={user.isPremium} platform={user.premiumPlatform} />
              <span className="text-xs text-gray-400">Cadastro: {fmtDate(user.createdAt)}</span>
              {user.lastSeenAt && (
                <span className="text-xs text-gray-400">Ultimo acesso: {fmtDate(user.lastSeenAt)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Receitas', value: recipes.length },
            { label: 'Ingredientes', value: ingredients.length },
            { label: 'Vendas', value: sales.length },
            { label: 'Faturamento', value: fmtCurrency(totalRevenue) },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="font-bold text-gray-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                active ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {tab === 'recipes' && (
          recipes.length === 0 ? (
            <p className="text-center py-12 text-gray-400">Nenhuma receita cadastrada</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recipes.map(r => {
                const sellingPrice = r.totalCost > 0
                  ? r.totalCost * (1 + r.profitMargin / 100) / r.yield
                  : 0;
                const expanded = expandedRecipe === r.id;
                return (
                  <div key={r.id}>
                    <button
                      onClick={() => setExpandedRecipe(expanded ? null : r.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{r.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {r.ingredientCount} ingredientes · Rend. {r.yield} un · Atualizada em {fmtDate(r.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-3 shrink-0">
                        {sellingPrice > 0 && (
                          <span className="text-sm font-semibold text-primary-600">
                            {fmtCurrency(sellingPrice)}/un
                          </span>
                        )}
                        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
                          <div>
                            <p className="text-xs text-gray-400">Custo total</p>
                            <p className="font-semibold text-gray-900">{fmtCurrency(r.totalCost)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Custo/unidade</p>
                            <p className="font-semibold text-gray-900">{fmtCurrency(r.yield > 0 ? r.totalCost / r.yield : 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Margem</p>
                            <p className="font-semibold text-gray-900">{r.profitMargin}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Preco sugerido</p>
                            <p className="font-semibold text-primary-600">{fmtCurrency(sellingPrice)}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">Criada em {fmtDate(r.createdAt)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === 'ingredients' && (
          ingredients.length === 0 ? (
            <p className="text-center py-12 text-gray-400">Nenhum ingrediente cadastrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Preco</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Embalagem</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Preco/un</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Usado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ingredients.map(i => (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmtCurrency(i.price)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {i.packageAmount} {i.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {fmtCurrency(i.packageAmount > 0 ? i.price / i.packageAmount : 0)}/{i.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {i.usedInRecipes} {i.usedInRecipes === 1 ? 'receita' : 'receitas'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'sales' && (
          sales.length === 0 ? (
            <p className="text-center py-12 text-gray-400">Nenhuma venda registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Receita</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Qtd</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Preco un.</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Data</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.recipeName ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{s.quantitySold}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmtCurrency(s.salePrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtCurrency(s.totalRevenue)}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(s.saleDate)}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{s.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
