import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, ChefHat, X, Plus, Info, Layers, ChevronDown } from 'lucide-react';
import {
  userApi,
  Recipe,
  Ingredient,
  CreateRecipeDTO,
  RecipeIngredient,
  AdditionalCost,
  SubRecipe,
  CalculationResult,
} from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatBRL } from '../format';
import {
  Header,
  EmptyState,
  FormField,
  FormActions,
  inputClass,
  iconBtn,
  iconBtnDanger,
} from './IngredientsPage';

export function RecipesPage({ toast }: { toast: ToastFn }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [calcs, setCalcs] = useState<Record<string, CalculationResult>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, i] = await Promise.all([userApi.listRecipes(), userApi.listIngredients()]);
      setRecipes(r);
      setIngredients(i);
      // Calcula o preço de todas as receitas automaticamente, em paralelo
      const entries = await Promise.all(
        r.map(async rec => {
          try {
            return [rec.id, await userApi.calculateRecipe(rec.id)] as const;
          } catch {
            return null;
          }
        })
      );
      const map: Record<string, CalculationResult> = {};
      entries.forEach(e => {
        if (e) map[e[0]] = e[1];
      });
      setCalcs(map);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await userApi.deleteRecipe(confirmId);
      toast.success('Receita excluída.');
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <Header
        title="Receitas"
        subtitle={`${recipes.length} cadastrada${recipes.length !== 1 ? 's' : ''}`}
        onAdd={() => setCreating(true)}
        addLabel="Nova receita"
      />

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={5} cols={3} />
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState icon={ChefHat} text="Nenhuma receita ainda. Crie a primeira para calcular o preço de venda." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 items-start">
          {recipes.map(r => {
            const c = calcs[r.id];
            const open = expandedId === r.id;
            const toggle = () => setExpandedId(open ? null : r.id);
            return (
              <div
                key={r.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <button onClick={toggle} className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{r.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Rende {r.yield} · margem {r.profitMargin}% · {r.ingredients.length} ingrediente
                        {r.ingredients.length !== 1 ? 's' : ''}
                      </p>
                    </button>
                    <button onClick={() => setEditing(r)} className={iconBtn}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setConfirmId(r.id)} className={iconBtnDanger}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <button
                    onClick={toggle}
                    className="mt-3 w-full flex items-center gap-3 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg px-3 py-2.5 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="block text-[11px] text-primary-700/70 dark:text-primary-300/70 font-medium uppercase tracking-wide">
                        Preço sugerido / un
                      </span>
                      <span className="block text-lg font-bold text-primary-700 dark:text-primary-200 leading-tight">
                        {c ? formatBRL(c.suggestedPrice) : '—'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400">Custo / un</span>
                      <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {c ? formatBRL(c.costPerUnit) : '—'}
                      </span>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-primary-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {open && c && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 divide-y divide-gray-100 dark:divide-gray-700">
                    {(
                      [
                        ['Custo dos ingredientes', formatBRL(c.ingredientsCost)],
                        ['Custos adicionais', formatBRL(c.additionalCostTotal)],
                        ['Sub-receitas', formatBRL(c.subRecipesCost)],
                        ['Custo total', formatBRL(c.totalCost)],
                        ['Custo por unidade', formatBRL(c.costPerUnit)],
                        ['Lucro estimado', formatBRL(c.estimatedProfit)],
                      ] as [string, string][]
                    ).map(([label, value]) => (
                      <div key={label} className="flex justify-between py-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-300">{label}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <RecipeForm
          initial={editing}
          ingredients={ingredients}
          allRecipes={recipes}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
          toast={toast}
        />
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Excluir receita"
        message="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

const MARGIN_PRESETS = [
  { value: 30, label: 'Básico' },
  { value: 50, label: 'Equilibrado' },
  { value: 70, label: 'Recomendado' },
  { value: 100, label: 'Lucrativo' },
  { value: 150, label: 'Premium' },
];
const COST_PRESETS = ['Embalagem', 'Gás', 'Energia', 'Mão de obra'];
const LABOR_PRO_NAME = 'Mão de obra (profissional)';
const SUB_UNITS = ['un', 'g', 'kg', 'ml', 'l'];

function getCompatibleUnits(unit: string): string[] {
  if (unit === 'g' || unit === 'kg') return ['unit', 'g', 'kg'];
  if (unit === 'ml' || unit === 'l') return ['unit', 'ml', 'l'];
  return [unit];
}

function RecipeForm({
  initial,
  ingredients,
  allRecipes,
  onClose,
  onSaved,
  toast,
}: {
  initial: Recipe | null;
  ingredients: Ingredient[];
  allRecipes: Recipe[];
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  // Separa os custos existentes em presets x personalizados (mão de obra
  // profissional é recalculada pela calculadora, igual ao app)
  const presetInit: Record<string, string> = {};
  const customInit: AdditionalCost[] = [];
  (initial?.additionalCosts ?? []).forEach(c => {
    if (COST_PRESETS.includes(c.name)) presetInit[c.name] = String(c.value);
    else if (c.name !== LABOR_PRO_NAME) customInit.push(c);
  });

  const initialMargin = initial?.profitMargin ?? 30;

  const [name, setName] = useState(initial?.name ?? '');
  const [yieldValue, setYieldValue] = useState(String(initial?.yield ?? ''));
  const [margin, setMargin] = useState(String(initialMargin));
  const [customMargin, setCustomMargin] = useState(
    initial ? !MARGIN_PRESETS.some(p => p.value === initialMargin) : false
  );
  const [rows, setRows] = useState<RecipeIngredient[]>(initial?.ingredients ?? []);
  const [subRows, setSubRows] = useState<SubRecipe[]>(initial?.subRecipes ?? []);
  const [presetCosts, setPresetCosts] = useState<Record<string, string>>(presetInit);
  const [customCosts, setCustomCosts] = useState<AdditionalCost[]>(customInit);
  const [hourlyRate, setHourlyRate] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [saving, setSaving] = useState(false);

  const availableSubRecipes = allRecipes.filter(r => r.id !== initial?.id);

  // ── Ingredientes ──
  const addRow = () => {
    if (ingredients.length === 0) return toast.error('Cadastre ingredientes antes.');
    const first = ingredients[0];
    setRows(r => [
      ...r,
      { ingredientId: first.id, ingredientName: first.name, quantityUsed: 0, unit: first.unit },
    ]);
  };
  const updateRow = (idx: number, patch: Partial<RecipeIngredient>) =>
    setRows(r => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const removeRow = (idx: number) => setRows(r => r.filter((_, i) => i !== idx));

  // ── Sub-receitas ──
  const addSubRow = () => {
    if (availableSubRecipes.length === 0) return toast.error('Não há outras receitas para juntar.');
    const first = availableSubRecipes[0];
    setSubRows(s => [
      ...s,
      { subRecipeId: first.id, subRecipeName: first.name, quantityUsed: 0, unit: 'un' },
    ]);
  };
  const updateSubRow = (idx: number, patch: Partial<SubRecipe>) =>
    setSubRows(s => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const removeSubRow = (idx: number) => setSubRows(s => s.filter((_, i) => i !== idx));

  // ── Custos personalizados ──
  const addCustomCost = () => setCustomCosts(c => [...c, { name: '', value: 0 }]);
  const updateCustomCost = (idx: number, patch: Partial<AdditionalCost>) =>
    setCustomCosts(c => c.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const removeCustomCost = (idx: number) => setCustomCosts(c => c.filter((_, i) => i !== idx));

  const laborCostValue = (() => {
    const rate = parseFloat(hourlyRate.replace(',', '.'));
    const mins = parseFloat(prepTime.replace(',', '.'));
    if (rate > 0 && mins > 0) return Math.round((rate / 60) * mins * 100) / 100;
    return 0;
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe o nome da receita.');
    if (!yieldValue || Number(yieldValue) <= 0) return toast.error('Informe o rendimento.');
    if (rows.length === 0 && subRows.length === 0)
      return toast.error('Adicione ao menos um ingrediente ou receita.');

    const additionalCosts: AdditionalCost[] = [];
    COST_PRESETS.forEach(n => {
      const v = parseFloat((presetCosts[n] ?? '').replace(',', '.')) || 0;
      if (v > 0) additionalCosts.push({ name: n, value: v });
    });
    customCosts.forEach(c => {
      const v = Number(c.value) || 0;
      if (c.name.trim() && v > 0) additionalCosts.push({ name: c.name.trim(), value: v });
    });
    if (laborCostValue > 0) additionalCosts.push({ name: LABOR_PRO_NAME, value: laborCostValue });

    setSaving(true);
    const data: CreateRecipeDTO = {
      name: name.trim(),
      yield: Number(yieldValue) || 1,
      profitMargin: Number(margin) || 30,
      ingredients: rows.map(r => ({ ...r, quantityUsed: Number(r.quantityUsed) || 0 })),
      additionalCosts,
      subRecipes: subRows.map(s => ({ ...s, quantityUsed: Number(s.quantityUsed) || 0 })),
    };
    try {
      if (initial) {
        await userApi.updateRecipe(initial.id, data);
        toast.success('Receita atualizada.');
      } else {
        await userApi.createRecipe(data);
        toast.success('Receita criada.');
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-5">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
          {initial ? 'Editar receita' : 'Nova receita'}
        </h3>

        {/* Banner informativo */}
        <div className="flex items-center gap-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/40 rounded-xl p-3">
          <Info size={18} className="text-sky-500 shrink-0" />
          <p className="text-xs text-sky-800 dark:text-sky-200">
            O preço sugerido é calculado automaticamente a partir dos dados abaixo.
          </p>
        </div>

        {/* Dados básicos */}
        <FormField label="Nome da receita">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex.: Bolo de Chocolate"
            className={inputClass}
            autoFocus
          />
        </FormField>

        <FormField label="Rendimento (unidades)">
          <input
            type="number"
            step="any"
            value={yieldValue}
            onChange={e => setYieldValue(e.target.value)}
            placeholder="12"
            className={inputClass}
          />
        </FormField>

        {/* Margem de lucro — presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Margem de lucro
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MARGIN_PRESETS.map(p => {
              const selected = !customMargin && Number(margin) === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setCustomMargin(false);
                    setMargin(String(p.value));
                  }}
                  className={`rounded-xl border-2 py-2.5 px-1 text-center transition-colors ${
                    selected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
                  }`}
                >
                  <span className="block text-lg font-extrabold text-primary-600 dark:text-primary-400 leading-none">
                    {p.value}%
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">
                    {p.label}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCustomMargin(true)}
              className={`rounded-xl border-2 py-2.5 px-1 text-center transition-colors ${
                customMargin
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
              }`}
            >
              <span className="block text-sm font-bold text-gray-700 dark:text-gray-200 leading-none mt-1">
                Outro
              </span>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1.5">
                Personalizar
              </span>
            </button>
          </div>
          {customMargin && (
            <input
              type="number"
              step="any"
              value={margin}
              onChange={e => setMargin(e.target.value)}
              placeholder="Margem em %"
              className={inputClass + ' mt-2'}
            />
          )}
        </div>

        {/* Ingredientes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Ingredientes</label>
            <button type="button" onClick={addRow} className="text-xs text-primary-600 font-medium flex items-center gap-1">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          {rows.length === 0 && <p className="text-xs text-gray-400">Nenhum ingrediente nesta receita.</p>}
          <div className="space-y-2">
            {rows.map((row, idx) => {
              const ing = ingredients.find(i => i.id === row.ingredientId);
              const units = ing ? getCompatibleUnits(ing.unit) : [row.unit];
              return (
                <div key={idx} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <select
                      value={row.ingredientId}
                      onChange={e => {
                        const sel = ingredients.find(i => i.id === e.target.value);
                        updateRow(idx, {
                          ingredientId: e.target.value,
                          ingredientName: sel?.name,
                          unit: sel?.unit ?? row.unit,
                        });
                      }}
                      className={inputClass + ' w-full'}
                    >
                      {ingredients.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                    {ing && (
                      <p className="text-[11px] text-gray-400">
                        Comprado: {ing.purchaseQuantity} {ing.unit} · {formatBRL(ing.purchasePrice)}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={row.quantityUsed || ''}
                        onChange={e => updateRow(idx, { quantityUsed: Number(e.target.value) })}
                        placeholder="Quantidade usada"
                        className={inputClass + ' flex-1 !w-auto min-w-0'}
                      />
                      <select
                        value={row.unit}
                        onChange={e => updateRow(idx, { unit: e.target.value })}
                        className={inputClass + ' !w-24 shrink-0'}
                      >
                        {units.map(u => (
                          <option key={u} value={u}>
                            {u === 'unit' ? 'un' : u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeRow(idx)} className={iconBtnDanger + ' mt-1 shrink-0'}>
                    <X size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sub-receitas (receitas para juntar) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Layers size={14} /> Receitas para juntar
            </label>
            <button type="button" onClick={addSubRow} className="text-xs text-primary-600 font-medium flex items-center gap-1">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          {subRows.length === 0 && <p className="text-xs text-gray-400">Combine outras receitas como parte desta (ex.: recheio).</p>}
          <div className="space-y-2">
            {subRows.map((row, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2">
                <div className="flex-1 min-w-0 space-y-2">
                  <select
                    value={row.subRecipeId}
                    onChange={e => {
                      const sel = availableSubRecipes.find(r => r.id === e.target.value);
                      updateSubRow(idx, { subRecipeId: e.target.value, subRecipeName: sel?.name });
                    }}
                    className={inputClass + ' w-full'}
                  >
                    {availableSubRecipes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={row.quantityUsed || ''}
                      onChange={e => updateSubRow(idx, { quantityUsed: Number(e.target.value) })}
                      placeholder="Quantidade"
                      className={inputClass + ' flex-1 !w-auto min-w-0'}
                    />
                    <select
                      value={row.unit}
                      onChange={e => updateSubRow(idx, { unit: e.target.value })}
                      className={inputClass + ' !w-24 shrink-0'}
                    >
                      {SUB_UNITS.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="button" onClick={() => removeSubRow(idx)} className={iconBtnDanger + ' mt-1 shrink-0'}>
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custos adicionais (presets) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
            Custos adicionais
          </label>
          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            {COST_PRESETS.map(n => (
              <div key={n} className="flex items-center gap-3 px-3 py-2">
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{n}</span>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                  <input
                    type="number"
                    step="any"
                    value={presetCosts[n] ?? ''}
                    onChange={e => setPresetCosts(p => ({ ...p, [n]: e.target.value }))}
                    placeholder="0,00"
                    className={inputClass + ' pl-7 text-right'}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Custos personalizados extras */}
          {customCosts.length > 0 && (
            <div className="space-y-2 mt-2">
              {customCosts.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={c.name}
                    onChange={e => updateCustomCost(idx, { name: e.target.value })}
                    placeholder="Outro custo"
                    className={inputClass + ' flex-1 !w-auto min-w-0'}
                  />
                  <input
                    type="number"
                    step="any"
                    value={c.value || ''}
                    onChange={e => updateCustomCost(idx, { value: Number(e.target.value) })}
                    placeholder="R$"
                    className={inputClass + ' !w-24 shrink-0'}
                  />
                  <button type="button" onClick={() => removeCustomCost(idx)} className={iconBtnDanger}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={addCustomCost} className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-2">
            <Plus size={13} /> Adicionar outro custo
          </button>
        </div>

        {/* Calculadora de mão de obra */}
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Mão de obra (calculadora)</p>
          <p className="text-[11px] text-gray-400 mb-2">Quanto você quer ganhar por hora × tempo de preparo.</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$/h</span>
              <input
                type="number"
                step="any"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
                placeholder="20"
                className={inputClass + ' pl-10'}
              />
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={prepTime}
                onChange={e => setPrepTime(e.target.value)}
                placeholder="Minutos"
                className={inputClass + ' pr-10'}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">min</span>
            </div>
          </div>
          {laborCostValue > 0 && (
            <p className="text-xs text-primary-600 dark:text-primary-400 font-semibold mt-2">
              = {formatBRL(laborCostValue)} de mão de obra
            </p>
          )}
        </div>

        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}

