import { useEffect, useState } from 'react';
import {
  api,
  RecipeAdditionalCost,
  UserData,
  UserIngredient,
  UserRecipe,
  UserSubRecipe,
  UpdateUserIngredientDTO,
  UpdateUserRecipeDTO,
} from '../lib/api';
import { ModalOverlay, Skeleton, ToastFn } from '../components';
import {
  ArrowLeft,
  Crown,
  CakeSlice,
  ShoppingBasket,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  X,
} from 'lucide-react';

interface Props {
  userId: string;
  onBack: () => void;
  toast: ToastFn;
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

const UNIT_OPTIONS = [
  { value: 'unit', label: 'un' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'l' },
];

const PKG_TYPES = ['Lata', 'Pacote', 'Saco', 'Caixa', 'Garrafa', 'Pote'];
const SUB_UNITS = ['un', 'g', 'kg', 'ml', 'l'];

export function UserDataPage({ userId, onBack, toast }: Props) {
  const [data, setData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('recipes');
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<UserIngredient | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<UserRecipe | null>(null);

  const loadData = () => {
    setError(null);
    return api.getUserData(userId)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Erro ao carregar dados'));
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  const fmtUnitCurrency = (n: number) => {
    const numericValue = Number.isFinite(n) ? n : 0;
    const fractionDigits = numericValue > 0 && numericValue < 0.01 ? 4 : 2;

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(numericValue);
  };

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Erro ao carregar dados do usuario</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
          <button
            onClick={loadData}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const { user, recipes, ingredients, sales } = data;
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalRevenue || 0), 0);

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
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.companyName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
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
            <div key={s.label} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="font-bold text-gray-900 dark:text-white mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                active
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                active ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
              }`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {tab === 'recipes' && (
          recipes.length === 0 ? (
            <p className="text-center py-12 text-gray-400">Nenhuma receita cadastrada</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recipes.map(r => {
                const sellingPrice = r.totalCost > 0
                  ? r.totalCost * (1 + r.profitMargin / 100) / r.yield
                  : 0;
                const expanded = expandedRecipe === r.id;
                return (
                  <div key={r.id}>
                    <button
                      onClick={() => setExpandedRecipe(expanded ? null : r.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{r.name}</p>
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
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingRecipe(r);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Editar receita"
                        >
                          <Pencil size={16} />
                        </button>
                        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
                          <div>
                            <p className="text-xs text-gray-400">Custo total</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{fmtCurrency(r.totalCost)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Custo/unidade</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{fmtUnitCurrency(r.yield > 0 ? r.totalCost / r.yield : 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Margem</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{r.profitMargin}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Preco sugerido</p>
                            <p className="font-semibold text-primary-600">{fmtCurrency(sellingPrice)}</p>
                          </div>
                        </div>
                        {r.ingredients && r.ingredients.length > 0 && (
                          <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Ingredientes</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {r.ingredients.map((ing, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-1.5 text-sm">
                                  <span className="text-gray-700 dark:text-gray-200">{ing.name}</span>
                                  <span className="text-gray-500 dark:text-gray-400 font-medium ml-2 shrink-0">
                                    {ing.quantityUsed} {ing.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {r.additionalCosts && r.additionalCosts.length > 0 && (
                          <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Custos adicionais</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {r.additionalCosts.map((ac, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-1.5 text-sm">
                                  <span className="text-gray-700 dark:text-gray-200">{ac.name}</span>
                                  <span className="text-gray-500 dark:text-gray-400 font-medium ml-2 shrink-0">
                                    {fmtCurrency(ac.value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-3">Criada em {fmtDate(r.createdAt)}</p>
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
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Nome</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Preco</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Embalagem</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Preco/un</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Usado em</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {ingredients.map(i => (
                    <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.name}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">{fmtCurrency(i.price)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {i.packageAmount} {i.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                        {(() => {
                          const effectiveAmount = i.purchaseUnitWeight ? i.packageAmount * i.purchaseUnitWeight : i.packageAmount;
                          return fmtUnitCurrency(effectiveAmount > 0 ? i.price / effectiveAmount : 0);
                        })()}/{i.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {i.usedInRecipes} {i.usedInRecipes === 1 ? 'receita' : 'receitas'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setEditingIngredient(i)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Editar ingrediente"
                        >
                          <Pencil size={16} />
                        </button>
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
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Receita</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Qtd</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Preco un.</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Total</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Data</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {sales.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.recipeName ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">{s.quantitySold}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">{fmtCurrency(s.salePrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmtCurrency(s.totalRevenue)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(s.saleDate)}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{s.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {editingIngredient && (
        <EditIngredientModal
          userId={userId}
          ingredient={editingIngredient}
          toast={toast}
          onClose={() => setEditingIngredient(null)}
          onSaved={updated => {
            setData(prev => prev
              ? {
                  ...prev,
                  ingredients: prev.ingredients.map(i => i.id === updated.id ? { ...i, ...updated } : i),
                }
              : prev);
            setEditingIngredient(null);
          }}
        />
      )}

      {editingRecipe && (
        <EditRecipeModal
          userId={userId}
          recipe={editingRecipe}
          ingredients={ingredients}
          recipes={recipes}
          toast={toast}
          onClose={() => setEditingRecipe(null)}
          onSaved={async () => {
            setEditingRecipe(null);
            await loadData();
          }}
        />
      )}
    </div>
  );
}

function compatibleUnits(ingredient: Pick<UserIngredient, 'unit' | 'purchaseUnitWeight'>): string[] {
  const baseUnits =
    ingredient.unit === 'g' || ingredient.unit === 'kg'
      ? ['g', 'kg']
      : ingredient.unit === 'ml' || ingredient.unit === 'l'
        ? ['ml', 'l']
        : [ingredient.unit];
  return ingredient.purchaseUnitWeight ? ['unit', ...baseUnits] : baseUnits;
}

function EditRecipeModal({
  userId,
  recipe,
  ingredients,
  recipes,
  toast,
  onClose,
  onSaved,
}: {
  userId: string;
  recipe: UserRecipe;
  ingredients: UserIngredient[];
  recipes: UserRecipe[];
  toast: ToastFn;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState(recipe.name);
  const [yieldValue, setYieldValue] = useState(String(recipe.yield));
  const [margin, setMargin] = useState(String(recipe.profitMargin));
  const [rows, setRows] = useState(recipe.ingredients.map(i => ({
    ingredientId: i.ingredientId,
    ingredientName: i.name,
    quantityUsed: i.quantityUsed,
    unit: i.unit,
  })));
  const [costs, setCosts] = useState<RecipeAdditionalCost[]>(recipe.additionalCosts ?? []);
  const [subRows, setSubRows] = useState<UserSubRecipe[]>(recipe.subRecipes ?? []);
  const [saving, setSaving] = useState(false);

  const availableSubRecipes = recipes.filter(r => r.id !== recipe.id);

  const addIngredient = () => {
    const first = ingredients[0];
    if (!first) return toast.error('Usuário não tem ingredientes cadastrados.');
    setRows(prev => [...prev, {
      ingredientId: first.id,
      ingredientName: first.name,
      quantityUsed: 0,
      unit: first.purchaseUnitWeight ? 'unit' : first.unit,
    }]);
  };

  const addCost = () => setCosts(prev => [...prev, { name: '', value: 0 }]);

  const addSubRecipe = () => {
    const first = availableSubRecipes[0];
    if (!first) return toast.error('Não há outra receita para juntar.');
    setSubRows(prev => [...prev, { subRecipeId: first.id, subRecipeName: first.name, quantityUsed: 0, unit: 'un' }]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe o nome da receita.');
    if ((parseFloat(yieldValue.replace(',', '.')) || 0) <= 0) return toast.error('Informe o rendimento.');
    if (rows.length === 0 && subRows.length === 0) return toast.error('Adicione ao menos um ingrediente ou receita.');

    for (const row of rows) {
      const ingredient = ingredients.find(i => i.id === row.ingredientId);
      if (!ingredient) return toast.error('Ingrediente inválido na receita.');
      if (!compatibleUnits(ingredient).includes(row.unit)) return toast.error(`Unidade incompatível para ${ingredient.name}.`);
    }

    const payload: UpdateUserRecipeDTO = {
      name: name.trim(),
      yield: parseFloat(yieldValue.replace(',', '.')) || 1,
      profitMargin: parseFloat(margin.replace(',', '.')) || 0,
      ingredients: rows.map(row => ({
        ...row,
        quantityUsed: Number(row.quantityUsed) || 0,
      })),
      additionalCosts: costs
        .map(c => ({ name: c.name.trim(), value: Number(c.value) || 0 }))
        .filter(c => c.name && c.value > 0),
      subRecipes: subRows.map(row => ({
        ...row,
        quantityUsed: Number(row.quantityUsed) || 0,
        unit: row.unit || 'un',
      })),
    };

    setSaving(true);
    try {
      await api.updateUserRecipe(userId, recipe.id, payload);
      toast.success('Receita atualizada.');
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar receita.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-5">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Editar receita do usuário</h3>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome</span>
          <input value={name} onChange={e => setName(e.target.value)} className={inputClass} autoFocus />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Rendimento</span>
            <input type="number" step="any" value={yieldValue} onChange={e => setYieldValue(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Margem de lucro (%)</span>
            <input type="number" step="any" value={margin} onChange={e => setMargin(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Ingredientes</span>
            <button type="button" onClick={addIngredient} className="text-xs text-primary-600 font-medium inline-flex items-center gap-1">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {rows.map((row, idx) => {
              const ingredient = ingredients.find(i => i.id === row.ingredientId);
              const units = ingredient ? compatibleUnits(ingredient) : [row.unit];
              return (
                <div key={idx} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <select
                      value={row.ingredientId}
                      onChange={e => {
                        const selected = ingredients.find(i => i.id === e.target.value);
                        setRows(prev => prev.map((r, i) => i === idx ? {
                          ...r,
                          ingredientId: e.target.value,
                          ingredientName: selected?.name ?? '',
                          unit: selected ? (selected.purchaseUnitWeight ? 'unit' : selected.unit) : r.unit,
                        } : r));
                      }}
                      className={inputClass}
                    >
                      {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={row.quantityUsed || ''}
                        onChange={e => setRows(prev => prev.map((r, i) => i === idx ? { ...r, quantityUsed: Number(e.target.value) } : r))}
                        placeholder="Quantidade"
                        className={inputClass + ' flex-1 !w-auto min-w-0'}
                      />
                      <select
                        value={row.unit}
                        onChange={e => setRows(prev => prev.map((r, i) => i === idx ? { ...r, unit: e.target.value } : r))}
                        className={inputClass + ' !w-24 shrink-0'}
                      >
                        {units.map(u => <option key={u} value={u}>{u === 'unit' ? 'un' : u}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="button" onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <X size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Custos adicionais</span>
            <button type="button" onClick={addCost} className="text-xs text-primary-600 font-medium inline-flex items-center gap-1">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {costs.map((cost, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={cost.name}
                  onChange={e => setCosts(prev => prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))}
                  placeholder="Nome do custo"
                  className={inputClass + ' flex-1 !w-auto min-w-0'}
                />
                <input
                  type="number"
                  step="any"
                  value={cost.value || ''}
                  onChange={e => setCosts(prev => prev.map((c, i) => i === idx ? { ...c, value: Number(e.target.value) } : c))}
                  placeholder="R$"
                  className={inputClass + ' !w-28 shrink-0'}
                />
                <button type="button" onClick={() => setCosts(prev => prev.filter((_, i) => i !== idx))} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <X size={15} />
                </button>
              </div>
            ))}
            {costs.length === 0 && <p className="text-xs text-gray-400">Nenhum custo adicional.</p>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Receitas para juntar</span>
            <button type="button" onClick={addSubRecipe} className="text-xs text-primary-600 font-medium inline-flex items-center gap-1">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {subRows.map((row, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2">
                <div className="flex-1 min-w-0 space-y-2">
                  <select
                    value={row.subRecipeId}
                    onChange={e => {
                      const selected = availableSubRecipes.find(r => r.id === e.target.value);
                      setSubRows(prev => prev.map((r, i) => i === idx ? { ...r, subRecipeId: e.target.value, subRecipeName: selected?.name } : r));
                    }}
                    className={inputClass}
                  >
                    {availableSubRecipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={row.quantityUsed || ''}
                      onChange={e => setSubRows(prev => prev.map((r, i) => i === idx ? { ...r, quantityUsed: Number(e.target.value) } : r))}
                      placeholder="Quantidade"
                      className={inputClass + ' flex-1 !w-auto min-w-0'}
                    />
                    <select
                      value={row.unit}
                      onChange={e => setSubRows(prev => prev.map((r, i) => i === idx ? { ...r, unit: e.target.value } : r))}
                      className={inputClass + ' !w-24 shrink-0'}
                    >
                      {SUB_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <button type="button" onClick={() => setSubRows(prev => prev.filter((_, i) => i !== idx))} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <X size={15} />
                </button>
              </div>
            ))}
            {subRows.length === 0 && <p className="text-xs text-gray-400">Nenhuma receita combinada.</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function EditIngredientModal({
  userId,
  ingredient,
  toast,
  onClose,
  onSaved,
}: {
  userId: string;
  ingredient: UserIngredient;
  toast: ToastFn;
  onClose: () => void;
  onSaved: (ingredient: UserIngredient) => void;
}) {
  const [name, setName] = useState(ingredient.name);
  const [quantity, setQuantity] = useState(String(ingredient.purchaseQuantity ?? ingredient.packageAmount ?? ''));
  const [price, setPrice] = useState(String(ingredient.purchasePrice ?? ingredient.price ?? ''));
  const [unit, setUnit] = useState(ingredient.unit);
  const [pkgLabel, setPkgLabel] = useState(ingredient.purchaseUnitLabel ?? '');
  const [pkgWeight, setPkgWeight] = useState(String(ingredient.purchaseUnitWeight ?? ''));
  const [saving, setSaving] = useState(false);

  const qtyN = parseFloat(quantity.replace(',', '.')) || 0;
  const priceN = parseFloat(price.replace(',', '.')) || 0;
  const weightN = parseFloat(pkgWeight.replace(',', '.')) || 0;
  const useCustom = pkgLabel.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe o nome do ingrediente.');
    if (qtyN <= 0) return toast.error('Informe a quantidade comprada.');
    if (priceN <= 0) return toast.error('Informe o valor pago.');
    if (!unit) return toast.error('Escolha a unidade.');
    if (useCustom && weightN <= 0) return toast.error('Informe o peso por embalagem.');

    const payload: UpdateUserIngredientDTO = {
      name: name.trim(),
      purchaseQuantity: qtyN,
      purchasePrice: priceN,
      unit,
      purchaseUnitLabel: useCustom ? pkgLabel.trim() : null,
      purchaseUnitWeight: useCustom ? weightN : null,
    };

    setSaving(true);
    try {
      const updated = await api.updateUserIngredient(userId, ingredient.id, payload);
      toast.success('Ingrediente atualizado.');
      onSaved(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar ingrediente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Editar ingrediente do usuário</h3>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome</span>
          <input value={name} onChange={e => setName(e.target.value)} className={inputClass} autoFocus />
        </label>

        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Tipo de embalagem</span>
          <div className="flex flex-wrap gap-2">
            {PKG_TYPES.map(pkg => {
              const on = pkgLabel === pkg;
              return (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => {
                    setPkgLabel(on ? '' : pkg);
                    if (on) setPkgWeight('');
                  }}
                  className={chipClass(on)}
                >
                  {pkg}
                </button>
              );
            })}
          </div>
        </div>

        {useCustom && (
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Peso por embalagem</span>
            <input type="number" step="any" value={pkgWeight} onChange={e => setPkgWeight(e.target.value)} className={inputClass} />
          </label>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Quantidade comprada</span>
            <input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Valor total pago (R$)</span>
            <input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Unidade de medida</span>
          <div className="flex flex-wrap gap-2">
            {UNIT_OPTIONS.map(u => (
              <button key={u.value} type="button" onClick={() => setUnit(u.value)} className={chipClass(unit === u.value)}>
                {u.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';

function chipClass(on: boolean): string {
  return `h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
    on
      ? 'bg-primary-500 text-white'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
  }`;
}
