import { createPortal } from 'react-dom';
import { getSubRecipeUsageCost } from '../subRecipePricing';
import { SubscribeModal } from '../SubscribeModal';
import { effectiveTier } from '../userApi';
import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, ChefHat, X, Plus, Info, Layers, ChevronDown, ChevronRight, ArrowLeft, Calculator, Copy, FileText, ImagePlus, MessageCircle, Share2, Palette, Sparkles, Loader2 } from 'lucide-react';
import {
  userApi,
  Recipe,
  Ingredient,
  CreateRecipeDTO,
  RecipeIngredient,
  AdditionalCost,
  SubRecipe,
  CalculationResult,
  Season,
} from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatBRL, formatBRLUnit } from '../format';
import { PRICING_TUTORIAL } from '../pricingTutorial';
import { parseLocaleNumber } from '../number';
import { IFOOD_PLANS, ifoodPrice } from '../ifoodPricing';
import { sameFamilyUnits, unitLabel } from '../units';
import { getCurrency } from '../format';
import { getEffectivePurchaseQuantity, getIngredientUsageCost } from '../ingredientPricing';
import { useAuth } from '../UserAuthContext';
import { printRecipeQuote } from '../quotePdf';
import { imageFileToJpegDataUrl } from '../../lib/image';
import { SUGGESTED_RECIPES, SuggestedRecipe } from '../suggestedRecipes';
import {
  PdfSettings, PDF_COLORS, getPdfSettings, savePdfSettings,
  getLaborSettings, saveLaborSettings, getRecipeDraft, saveRecipeDraft, clearRecipeDraft,
} from '../localPrefs';
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
  // Receita aberta na tela de detalhe. Entra no histórico do navegador para o
  // botão "voltar" retornar à lista.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  useEffect(() => { void userApi.getActiveSeason().then(setActiveSeason); }, []);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => setViewingId((e.state as { recipeId?: string } | null)?.recipeId ?? null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const openRecipe = (id: string) => {
    window.history.pushState({ recipeId: id }, '');
    setViewingId(id);
    window.scrollTo(0, 0);
  };
  const closeRecipe = () => {
    if ((window.history.state as { recipeId?: string } | null)?.recipeId) window.history.back();
    else setViewingId(null);
  };
  const viewing = viewingId ? recipes.find(r => r.id === viewingId) ?? null : null;
  const [scaleRecipe, setScaleRecipe] = useState<Recipe | null>(null);
  const { user } = useAuth();
  const [freeLimit, setFreeLimit] = useState<number | null>(null);
  const [offerSource, setOfferSource] = useState<string | null>(null);
  useEffect(() => { void userApi.getPlanConfig().then(c => setFreeLimit(c.freeRecipeLimit ?? 3)).catch(() => {}); }, []);
  const openOffer = (source: string) => {
    userApi.trackConversion('offer_clicked', source, 'premium');
    setOfferSource(source);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, i] = await Promise.all([userApi.listRecipes(), userApi.listIngredients()]);
      setRecipes(r);
      setIngredients(i);
      // Calcula o preço de todas as receitas automaticamente, em paralelo
      const entries = await Promise.all(
        r.filter(rec => rec.isActive !== false).map(async rec => {
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
  }, [load, user?.isPremium, user?.premiumUntil]);

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await userApi.deleteRecipe(confirmId);
      toast.success('Receita excluída.');
      if (confirmId === viewingId) closeRecipe();
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDuplicate = async (r: Recipe) => {
    try {
      await userApi.createRecipe({
        name: `${r.name} (cópia)`,
        yield: r.yield,
        profitMargin: r.profitMargin,
        ingredients: r.ingredients.map(i => ({
          ingredientId: i.ingredientId,
          ingredientName: i.ingredientName,
          quantityUsed: i.quantityUsed,
          unit: i.unit,
        })),
        additionalCosts: r.additionalCosts.map(c => ({ ...c })),
        subRecipes: (r.subRecipes ?? []).map(s => ({
          subRecipeId: s.subRecipeId,
          quantityUsed: s.quantityUsed,
          unit: s.unit || 'un',
        })),
      });
      toast.success('Receita duplicada.');
      load();
    } catch (e) {
      if ((e as { code?: string }).code === 'RECIPE_LIMIT') { setOfferSource('recipe_limit'); return; }
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      {viewing ? (
        <RecipeDetail
          recipe={viewing}
          calc={calcs[viewing.id]}
          season={activeSeason}
          ingredients={ingredients}
          allRecipes={recipes}
          onBack={closeRecipe}
          onEdit={() => setEditing(viewing)}
          onScale={() => setScaleRecipe(viewing)}
          onDuplicate={() => handleDuplicate(viewing)}
          onDelete={() => setConfirmId(viewing.id)}
          toast={toast}
          onPhotoChange={async photoUrl => {
            try {
              await userApi.updateRecipe(viewing.id, { photoUrl });
              setRecipes(list => list.map(x => (x.id === viewing.id ? { ...x, photoUrl: photoUrl || undefined } : x)));
              toast.success(photoUrl ? 'Foto salva.' : 'Foto removida.');
            } catch (err) {
              toast.error((err as Error).message || 'Erro ao salvar foto.');
            }
          }}
        />
      ) : (<>
      <Header
        title="Receitas"
        subtitle={`${recipes.length} cadastrada${recipes.length !== 1 ? 's' : ''}`}
        onAdd={() => setCreating(true)}
        addLabel="Nova receita"
      />

      {effectiveTier(user) === 'free' && freeLimit !== null && recipes.length >= freeLimit - 1 && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-gray-800 dark:text-gray-100">
          <p>{recipes.length} de {freeLimit} receitas gratuitas. {recipes.length >= freeLimit ? 'Cadastre sua próxima receita com o Premium.' : 'Falta 1 receita para atingir o limite gratuito.'}</p>
          <button onClick={() => openOffer('recipe_near_limit')} className="mt-2 font-semibold text-primary-600">Conhecer Premium</button>
        </div>
      )}
      {offerSource && <SubscribeModal initialTier="premium" source={offerSource} onClose={() => setOfferSource(null)} toast={toast} />}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={5} cols={3} />
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState icon={ChefHat} text="Nenhuma receita ainda. Crie a primeira para calcular o preço de venda." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 items-start">
          {recipes.map(r => {
            if (r.isActive === false) return (
              <div key={r.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-2">
                <button onClick={() => openOffer('recipe_inactive')} className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-gray-500 truncate">{r.name}</p>
                  <p className="text-sm text-gray-500 mt-1">Inativa no plano gratuito</p>
                  <p className="text-sm font-semibold text-primary-600 mt-2">Assine para liberar</p>
                </button>
                <button onClick={() => setConfirmId(r.id)} className={iconBtnDanger} title="Excluir"><Trash2 size={16} /></button>
              </div>
            );
            const c = calcs[r.id];
            const toggle = () => openRecipe(r.id);
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
                        Rende {r.yield} · acréscimo {r.profitMargin}% · {r.ingredients.length} ingrediente
                        {r.ingredients.length !== 1 ? 's' : ''}
                      </p>
                    </button>
                    <button onClick={() => setScaleRecipe(r)} className={iconBtn} title="Escala e orçamento" disabled={!c}>
                      <Calculator size={16} />
                    </button>
                    <button onClick={() => handleDuplicate(r)} className={iconBtn} title="Duplicar">
                      <Copy size={16} />
                    </button>
                    <button onClick={() => setEditing(r)} className={iconBtn} title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setConfirmId(r.id)} className={iconBtnDanger} title="Excluir">
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
                      {c && <span className="block text-xs text-primary-700 dark:text-primary-200 mt-1">
                        Total da receita ({fmtQty(r.yield)} un): {formatBRL(c.suggestedPrice * r.yield)}
                      </span>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400">Custo / un</span>
                      <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {c ? formatBRLUnit(c.costPerUnit) : '—'}
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-primary-500 shrink-0" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
      </>)}

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

      {scaleRecipe && calcs[scaleRecipe.id] && (
        <ScaleQuoteModal
          recipe={scaleRecipe}
          calc={calcs[scaleRecipe.id]}
          companyName={user?.companyName}
          onClose={() => setScaleRecipe(null)}
          toast={toast}
        />
      )}
    </div>
  );
}

function fmtQty(v: number): string {
  const r = Math.abs(v);
  const digits = r >= 1000 ? 0 : r >= 100 ? 1 : r >= 1 ? 2 : 3;
  return v.toFixed(digits).replace(/\.?0+$/, '').replace('.', ',');
}

function ScaleQuoteModal({
  recipe,
  calc,
  companyName,
  onClose,
  toast,
}: {
  recipe: Recipe;
  calc: CalculationResult;
  companyName?: string;
  onClose: () => void;
  toast: ToastFn;
}) {
  const [qtyInput, setQtyInput] = useState(String(recipe.yield));
  const qty = parseLocaleNumber(qtyInput);
  const valid = qty > 0;
  const factor = valid ? qty / recipe.yield : 0;

  const totalCost = calc.totalCost * factor;
  const totalRevenue = calc.suggestedPrice * qty;
  const totalProfit = totalRevenue - totalCost;

  const { user } = useAuth();
  const isPaid = effectiveTier(user) !== 'free';
  const [showPdfSettings, setShowPdfSettings] = useState(false);

  const generatePdf = () => {
    // Personalização do PDF é Premium (mesma regra do app).
    const ok = printRecipeQuote(recipe, calc, companyName, isPaid ? getPdfSettings() : undefined);
    if (!ok) toast.error('Permita pop-ups para gerar o orçamento em PDF.');
  };

  // Texto do orçamento para o cliente (sem custos/lucro internos).
  const quoteText = () => [
    `*Orçamento — ${recipe.name}*`,
    companyName ? companyName : null,
    '',
    `Quantidade: ${fmtQty(qty)} un`,
    `Valor por unidade: ${formatBRL(calc.suggestedPrice)}`,
    `*Total: ${formatBRL(totalRevenue)}*`,
    '',
    `Orçamento de ${new Date().toLocaleDateString('pt-BR')}`,
  ].filter(l => l !== null).join('\n');

  const sendWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(quoteText())}`, '_blank', 'noopener');
  };
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = async () => {
    try {
      await navigator.share({ title: `Orçamento — ${recipe.name}`, text: quoteText() });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error('Não foi possível compartilhar.');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator size={18} className="text-primary-500" /> Escala e orçamento
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{recipe.name}</p>
        </div>

        <FormField label={`Quantas unidades quer produzir? (rende ${recipe.yield})`}>
          <input
            type="text"
            inputMode="decimal"
            value={qtyInput}
            onChange={e => setQtyInput(e.target.value)}
            className={inputClass}
            autoFocus
          />
        </FormField>

        {valid && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Multiplicador" value={`${factor.toFixed(2)}x`} />
              <Metric label="Custo total" value={formatBRL(totalCost)} />
              <Metric label="Venda total" value={formatBRL(totalRevenue)} highlight />
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Lucro estimado</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-300">{formatBRL(totalProfit)}</span>
            </div>

            {recipe.ingredients.length > 0 && (
              <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2 bg-gray-50 dark:bg-gray-900/40">
                  Ingredientes para {fmtQty(qty)} un
                </p>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-52 overflow-y-auto">
                  {recipe.ingredients.map((ri, i) => (
                    <div key={i} className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-gray-700 dark:text-gray-200">{ri.ingredientName || 'Ingrediente'}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {fmtQty(ri.quantityUsed * factor)} {ri.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={generatePdf}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
          >
            <FileText size={16} /> Gerar orçamento (PDF)
          </button>
          <button
            onClick={sendWhatsApp}
            disabled={!valid}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
          >
            <MessageCircle size={16} /> Enviar no WhatsApp
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-3">
            <button onClick={() => setShowPdfSettings(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline">
              <Palette size={15} /> Personalizar PDF
            </button>
            {canShare && (
              <button onClick={share} disabled={!valid} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:underline disabled:opacity-50">
                <Share2 size={15} /> Compartilhar
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            Fechar
          </button>
        </div>
      </div>
      {showPdfSettings && createPortal(
        <PdfSettingsModal isPaid={isPaid} onClose={() => setShowPdfSettings(false)} toast={toast} />,
        document.body,
      )}
    </ModalOverlay>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${highlight ? 'bg-primary-50 dark:bg-primary-900/30' : 'bg-gray-50 dark:bg-gray-900/40'}`}>
      <p className={`text-sm font-bold tracking-tight ${highlight ? 'text-primary-600 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>{value}</p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
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

type RecipeIngredientForm = Omit<RecipeIngredient, 'quantityUsed'> & { quantityUsed: string | number };
type SubRecipeForm = Omit<SubRecipe, 'quantityUsed'> & { quantityUsed: string | number };
type AdditionalCostForm = Omit<AdditionalCost, 'value'> & { value: string | number };

function getCompatibleUnits(ingredient: Pick<Ingredient, 'unit' | 'purchaseUnitWeight'>): string[] {
  const baseUnits = sameFamilyUnits(ingredient.unit);
  return ingredient.purchaseUnitWeight && ingredient.unit !== 'unit' ? ['unit', ...baseUnits] : baseUnits;
}

function RecipeForm({
  initial,
  ingredients: ingredientsProp,
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
  const [costTypes, setCostTypes] = useState<Record<string, 'recipe' | 'unit'>>(() => Object.fromEntries((initial?.additionalCosts ?? []).map(c => [c.name, c.costType ?? 'recipe'])));
  const customInit: AdditionalCostForm[] = [];
  (initial?.additionalCosts ?? []).forEach(c => {
    if (COST_PRESETS.includes(c.name)) presetInit[c.name] = String(c.value);
    else if (c.name !== LABOR_PRO_NAME) customInit.push(c);
  });

  const initialMargin = initial?.profitMargin ?? 30;
  // Lista local: aplicar um modelo pode cadastrar ingredientes novos.
  const [ingredients, setIngredients] = useState<Ingredient[]>(ingredientsProp);

  const [name, setName] = useState(initial?.name ?? '');
  const [yieldValue, setYieldValue] = useState(String(initial?.yield ?? ''));
  const [yieldMode, setYieldMode] = useState<'manual' | 'estimated'>(initial?.yieldMode ?? 'manual');
  const [totalReadyWeight, setTotalReadyWeight] = useState(
    initial?.yieldTotalWeight ? String(initial.yieldTotalWeight).replace('.', ',') : ''
  );
  const [totalReadyUnit, setTotalReadyUnit] = useState<'g' | 'kg'>(initial?.yieldTotalUnit ?? 'g');
  const [weightPerUnit, setWeightPerUnit] = useState(
    initial?.yieldUnitWeight ? String(initial.yieldUnitWeight).replace('.', ',') : ''
  );
  const [weightPerUnitUnit, setWeightPerUnitUnit] = useState<'g' | 'kg'>(initial?.yieldUnitWeightUnit ?? 'g');
  const [margin, setMargin] = useState(String(initialMargin));
  const [customMargin, setCustomMargin] = useState(
    initial ? !MARGIN_PRESETS.some(p => p.value === initialMargin) : false
  );
  const [rows, setRows] = useState<RecipeIngredientForm[]>(initial?.ingredients ?? []);
  const [subRows, setSubRows] = useState<SubRecipeForm[]>(initial?.subRecipes ?? []);
  const [presetCosts, setPresetCosts] = useState<Record<string, string>>(presetInit);
  const [customCosts, setCustomCosts] = useState<AdditionalCostForm[]>(customInit);
  const [hourlyRate, setHourlyRate] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [rateHelperOpen, setRateHelperOpen] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRecipeOffer, setShowRecipeOffer] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showYieldInfo, setShowYieldInfo] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // ── Rascunho (só receita nova) e mão de obra lembrada — igual ao app ──
  type Draft = {
    name: string; yieldValue: string; margin: string; customMargin: boolean;
    rows: RecipeIngredientForm[]; subRows: SubRecipeForm[];
    presetCosts: Record<string, string>; customCosts: AdditionalCostForm[];
    hourlyRate: string; prepTime: string;
  };
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(() => {
    if (initial) return null;
    const d = getRecipeDraft<Draft>();
    return d && (d.name || d.rows?.length) ? d : null;
  });
  useEffect(() => {
    if (initial) return;
    const s = getLaborSettings();
    if (s.hourlyRate) setHourlyRate(s.hourlyRate);
    if (s.monthlyIncome) setMonthlyIncome(s.monthlyIncome);
    if (s.hoursPerDay) setHoursPerDay(s.hoursPerDay);
    if (s.daysPerWeek) setDaysPerWeek(s.daysPerWeek);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (initial || pendingDraft) return; // não sobrescreve o rascunho antes de a pessoa decidir
    const t = setTimeout(() => {
      if (!name.trim() && rows.length === 0) return;
      saveRecipeDraft({ name, yieldValue, margin, customMargin, rows, subRows, presetCosts, customCosts, hourlyRate, prepTime } satisfies Draft);
    }, 800);
    return () => clearTimeout(t);
  }, [initial, pendingDraft, name, yieldValue, margin, customMargin, rows, subRows, presetCosts, customCosts, hourlyRate, prepTime]);
  const restoreDraft = () => {
    const d = pendingDraft!;
    setName(d.name ?? '');
    setYieldValue(d.yieldValue ?? '');
    setMargin(d.margin ?? '30');
    setCustomMargin(!!d.customMargin);
    // Só mantém ingredientes/sub-receitas que ainda existem.
    setRows((d.rows ?? []).filter(r => ingredients.some(i => i.id === r.ingredientId)));
    setSubRows((d.subRows ?? []).filter(s => allRecipes.some(r => r.id === s.subRecipeId)));
    setPresetCosts(d.presetCosts ?? {});
    setCustomCosts(d.customCosts ?? []);
    if (d.hourlyRate) setHourlyRate(d.hourlyRate);
    if (d.prepTime) setPrepTime(d.prepTime);
    setPendingDraft(null);
  };
  const discardDraft = () => { clearRecipeDraft(); setPendingDraft(null); };

  // ── Modelo sugerido: casa ingredientes por nome+unidade compatível; cria os que faltam ──
  const applyTemplate = async (tpl: SuggestedRecipe) => {
    setShowTemplates(false);
    setApplyingTemplate(true);
    try {
      const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const existing = [...ingredients];
      const newRows: RecipeIngredientForm[] = [];
      for (const si of tpl.ingredients) {
        const n = norm(si.name);
        let found = existing.find(e => norm(e.name) === n && getCompatibleUnits(e).includes(si.unit))
          ?? existing.find(e => norm(e.name).startsWith(`${n} (sugestao)`) && getCompatibleUnits(e).includes(si.unit));
        if (!found) {
          let ingredientName = si.name;
          if (existing.some(e => norm(e.name) === n)) {
            const base = `${si.name} (sugestao)`;
            ingredientName = base;
            let suffix = 2;
            while (existing.some(e => norm(e.name) === norm(ingredientName))) ingredientName = `${base} ${suffix++}`;
          }
          found = await userApi.createIngredient({ name: ingredientName, purchaseQuantity: si.purchaseQuantity, purchasePrice: si.purchasePrice, unit: si.unit });
          existing.push(found);
        }
        newRows.push({ ingredientId: found.id, ingredientName: found.name, quantityUsed: si.quantityUsed, unit: si.unit });
      }
      setIngredients(existing);
      setName(tpl.name);
      setYieldValue(String(tpl.yield));
      setMargin(String(tpl.profitMargin));
      setCustomMargin(!MARGIN_PRESETS.some(p => p.value === tpl.profitMargin));
      setRows(newRows);
      toast.success('Modelo aplicado! Confira os preços dos ingredientes.');
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível aplicar o modelo.');
    } finally {
      setApplyingTemplate(false);
    }
  };

  const availableSubRecipes = allRecipes.filter(r => r.isActive !== false && r.id !== initial?.id);

  // ── Ingredientes ──
  const addRow = () => {
    if (ingredients.length === 0) return toast.error('Cadastre ingredientes antes.');
    const first = ingredients[0];
    setRows(r => [
      ...r,
      { ingredientId: first.id, ingredientName: first.name, quantityUsed: 0, unit: first.unit },
    ]);
  };
  const updateRow = (idx: number, patch: Partial<RecipeIngredientForm>) =>
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
  const updateSubRow = (idx: number, patch: Partial<SubRecipeForm>) =>
    setSubRows(s => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const removeSubRow = (idx: number) => setSubRows(s => s.filter((_, i) => i !== idx));

  // ── Custos personalizados ──
  const addCustomCost = () => setCustomCosts(c => [...c, { name: '', value: 0 }]);
  const updateCustomCost = (idx: number, patch: Partial<AdditionalCostForm>) =>
    setCustomCosts(c => c.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const removeCustomCost = (idx: number) => setCustomCosts(c => c.filter((_, i) => i !== idx));

  const laborCostValue = (() => {
    const rate = parseLocaleNumber(hourlyRate);
    const mins = parseLocaleNumber(prepTime);
    if (rate > 0 && mins > 0) return Math.round((rate / 60) * mins * 100) / 100;
    return 0;
  })();

  // Assistente: converte "quanto quero ganhar por mês" em custo por hora.
  // horas no mês = horas/dia × dias/semana × semanas/mês (média de 4,33).
  const computedHourlyRate = (() => {
    const income = parseLocaleNumber(monthlyIncome);
    const hoursPerMonth = parseLocaleNumber(hoursPerDay) * parseLocaleNumber(daysPerWeek) * 4.33;
    if (income > 0 && hoursPerMonth > 0) return Math.round((income / hoursPerMonth) * 100) / 100;
    return 0;
  })();

  const toGrams = (value: number, unit: 'g' | 'kg') => unit === 'kg' ? value * 1000 : value;

  const estimatedYield = (() => {
    const total = toGrams(parseLocaleNumber(totalReadyWeight), totalReadyUnit);
    const perUnit = toGrams(parseLocaleNumber(weightPerUnit), weightPerUnitUnit);
    if (total <= 0 || perUnit <= 0) return 0;
    return Math.floor(total / perUnit);
  })();

  const estimatedExactYield = (() => {
    const total = toGrams(parseLocaleNumber(totalReadyWeight), totalReadyUnit);
    const perUnit = toGrams(parseLocaleNumber(weightPerUnit), weightPerUnitUnit);
    if (total <= 0 || perUnit <= 0) return 0;
    return total / perUnit;
  })();

  useEffect(() => {
    if (yieldMode !== 'estimated') return;
    setYieldValue(estimatedYield > 0 ? String(estimatedYield) : '');
  }, [yieldMode, estimatedYield]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe o nome da receita.');
    if (!yieldValue || parseLocaleNumber(yieldValue) <= 0) return toast.error('Informe o rendimento.');
    if (rows.length === 0 && subRows.length === 0)
      return toast.error('Adicione ao menos um ingrediente ou receita.');
    for (const row of rows) {
      const ingredient = ingredients.find(i => i.id === row.ingredientId);
      if (ingredient && !getCompatibleUnits(ingredient).includes(row.unit)) {
        return toast.error(`Unidade incompatível para ${ingredient.name}.`);
      }
    }

    const additionalCosts: AdditionalCost[] = [];
    COST_PRESETS.forEach(n => {
      const v = parseLocaleNumber(presetCosts[n] ?? '');
      if (v > 0) additionalCosts.push({ name: n, value: v, costType: costTypes[n] ?? 'recipe' });
    });
    customCosts.forEach(c => {
      const v = parseLocaleNumber(c.value);
      if (c.name.trim() && v > 0) additionalCosts.push({ ...c, name: c.name.trim(), value: v });
    });
    if (laborCostValue > 0) additionalCosts.push({ name: LABOR_PRO_NAME, value: laborCostValue, costType: costTypes[LABOR_PRO_NAME] ?? 'recipe' });

    // Lembra o custo por hora (e o assistente) como padrão para as próximas receitas
    if (parseLocaleNumber(hourlyRate) > 0) saveLaborSettings({ hourlyRate, monthlyIncome, hoursPerDay, daysPerWeek });

    setSaving(true);
    const data: CreateRecipeDTO = {
      name: name.trim(),
      yield: parseLocaleNumber(yieldValue) || 1,
      yieldMode,
      yieldTotalWeight: yieldMode === 'estimated' ? parseLocaleNumber(totalReadyWeight) : null,
      yieldTotalUnit: yieldMode === 'estimated' ? totalReadyUnit : null,
      yieldUnitWeight: yieldMode === 'estimated' ? parseLocaleNumber(weightPerUnit) : null,
      yieldUnitWeightUnit: yieldMode === 'estimated' ? weightPerUnitUnit : null,
      profitMargin: parseLocaleNumber(margin),
      ingredients: rows.map(r => ({ ...r, quantityUsed: parseLocaleNumber(r.quantityUsed) })),
      additionalCosts,
      subRecipes: subRows.map(s => ({ ...s, quantityUsed: parseLocaleNumber(s.quantityUsed) })),
    };
    try {
      if (initial) {
        await userApi.updateRecipe(initial.id, data);
        toast.success('Receita atualizada.');
      } else {
        await userApi.createRecipe(data);
        clearRecipeDraft();
        toast.success('Receita criada.');
      }
      onSaved();
    } catch (err) {
      if (['RECIPE_LIMIT', 'RECIPE_INACTIVE'].includes((err as { code?: string }).code ?? '')) { setShowRecipeOffer(true); return; }
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      {showRecipeOffer && createPortal(<SubscribeModal initialTier="premium" source="recipe_limit" onClose={() => setShowRecipeOffer(false)} toast={toast} />, document.body)}
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-5">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
          {initial ? 'Editar receita' : 'Nova receita'}
        </h3>

        {/* Banner informativo */}
        <div className="flex items-center gap-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/40 rounded-xl p-3">
          <Info size={18} className="text-sky-500 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-sky-800 dark:text-sky-200">
              O resumo abaixo mostra o preço sugerido por unidade e o preço sugerido total da receita, calculados a partir dos custos e do rendimento.
            </p>
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="mt-2 text-xs font-semibold text-sky-700 dark:text-sky-200 underline underline-offset-2"
            >
              Ver tutorial
            </button>
          </div>
        </div>

        {pendingDraft && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Você tem um rascunho não salvo{pendingDraft.name ? ` de "${pendingDraft.name}"` : ''}.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={restoreDraft} className="text-sm font-semibold text-amber-700 dark:text-amber-200 hover:underline">Restaurar</button>
              <button type="button" onClick={discardDraft} className="text-sm text-gray-500 hover:underline">Descartar</button>
            </div>
          </div>
        )}

        {!initial && (
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            disabled={applyingTemplate}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 dark:border-primary-800 py-2.5 text-sm font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50"
          >
            {applyingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {applyingTemplate ? 'Aplicando modelo…' : 'Começar de um modelo pronto'}
          </button>
        )}
        {showTemplates && createPortal(
          <ModalOverlay onClose={() => setShowTemplates(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Modelos de receita</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Preenche nome, rendimento e ingredientes. Ingredientes que você ainda não tem são cadastrados com preços médios — ajuste depois para os seus.
              </p>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {SUGGESTED_RECIPES.map(tpl => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="w-full text-left px-2 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-lg"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{tpl.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Rende {tpl.yield} · {tpl.ingredients.length} ingredientes · acréscimo {tpl.profitMargin}%
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setShowTemplates(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Fechar</button>
              </div>
            </div>
          </ModalOverlay>,
          document.body,
        )}

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

        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Rendimento
            <button
              type="button"
              onClick={() => setShowYieldInfo(true)}
              title="Por que informar o rendimento?"
              aria-label="Por que informar o rendimento?"
              className="text-sky-500 hover:text-sky-600 transition-colors"
            >
              <Info size={15} />
            </button>
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setYieldMode('manual')}
              className={`rounded-xl border-2 py-2 px-3 text-sm font-semibold transition-colors ${
                yieldMode === 'manual'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                  : 'border-gray-200 text-gray-600 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              Informar unidades
            </button>
            <button
              type="button"
              onClick={() => setYieldMode('estimated')}
              className={`rounded-xl border-2 py-2 px-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                yieldMode === 'estimated'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                  : 'border-gray-200 text-gray-600 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              <Calculator size={15} /> Calcular por peso
            </button>
          </div>

          {yieldMode === 'manual' ? (
            <input
              type="text"
              inputMode="numeric"
              step="any"
              value={yieldValue}
              onChange={e => setYieldValue(e.target.value)}
              placeholder="12"
              className={inputClass}
            />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={totalReadyWeight}
                    onChange={e => setTotalReadyWeight(e.target.value)}
                    placeholder="Peso total pronto"
                    className={inputClass + ' flex-1 !w-auto min-w-0'}
                  />
                  <select
                    value={totalReadyUnit}
                    onChange={e => setTotalReadyUnit(e.target.value as 'g' | 'kg')}
                    className={inputClass + ' !w-20 shrink-0'}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weightPerUnit}
                    onChange={e => setWeightPerUnit(e.target.value)}
                    placeholder="Peso por unidade"
                    className={inputClass + ' flex-1 !w-auto min-w-0'}
                  />
                  <select
                    value={weightPerUnitUnit}
                    onChange={e => setWeightPerUnitUnit(e.target.value as 'g' | 'kg')}
                    className={inputClass + ' !w-20 shrink-0'}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                {estimatedYield > 0 ? (
                  <>
                    Rendimento usado: <strong>{estimatedYield} unidades</strong>
                    {estimatedExactYield !== estimatedYield && (
                      <span> ({estimatedExactYield.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} no cálculo bruto)</span>
                    )}
                  </>
                ) : (
                  'Informe os dois pesos para o app estimar o rendimento.'
                )}
              </div>
            </div>
          )}
        </div>

        {/* Acréscimo sobre o custo — presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Acréscimo sobre o custo
          </label>
          <p className="text-xs text-gray-500 mb-2">100% dobra o custo. Isso equivale a 50% de margem sobre a venda.</p>
          <div className="grid grid-cols-3 gap-2">
            {MARGIN_PRESETS.map(p => {
              const selected = !customMargin && parseLocaleNumber(margin) === p.value;
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
              type="text"
              inputMode="decimal"
              value={margin}
              onChange={e => setMargin(e.target.value)}
              placeholder="Acréscimo em %"
              className={inputClass + ' mt-2'}
            />
          )}
        </div>

        {/* 📊 Painel de Cálculos em Tempo Real */}
        {(() => {
          const yieldNum = parseLocaleNumber(yieldValue) || 1;
          const marginNum = parseLocaleNumber(margin);

          // Calcula custo dos ingredientes
          let ingredientsCost = 0;
          rows.forEach(row => {
            const ing = ingredients.find(i => i.id === row.ingredientId);
            if (ing) {
              const qtyUsed = parseLocaleNumber(row.quantityUsed);
              if (getCompatibleUnits(ing).includes(row.unit)) {
                ingredientsCost += getIngredientUsageCost(ing, qtyUsed, row.unit);
              }
            }
          });

          // Calcula custos adicionais
          let additionalCostTotal = 0;
          Object.entries(presetCosts).forEach(([n, v]) => {
            additionalCostTotal += Math.max(0, parseLocaleNumber(v)) * (costTypes[n] === 'unit' ? yieldNum : 1);
          });
          customCosts.forEach(c => {
            if (c.name.trim()) additionalCostTotal += Math.max(0, parseLocaleNumber(c.value)) * (c.costType === 'unit' ? yieldNum : 1);
          });
          additionalCostTotal += laborCostValue * (costTypes[LABOR_PRO_NAME] === 'unit' ? yieldNum : 1);

          let subRecipesCost = 0;
          try {
            for (const row of subRows) {
              const quantity = parseLocaleNumber(row.quantityUsed);
              if (quantity === 0) continue;
              const sub = allRecipes.find(recipe => recipe.id === row.subRecipeId);
              if (!sub) throw new Error('Sub-receita não encontrada.');
              subRecipesCost += getSubRecipeUsageCost(sub, ingredients, quantity, row.unit);
            }
          } catch (error) {
            return <p role="alert" className="text-sm text-red-600">{(error as Error).message}</p>;
          }
          const totalCost = ingredientsCost + additionalCostTotal + subRecipesCost;
          const costPerUnit = yieldNum > 0 ? totalCost / yieldNum : 0;
          const suggestedPrice = costPerUnit * (1 + marginNum / 100);
          const estimatedProfit = (suggestedPrice - costPerUnit) * yieldNum;

          return totalCost > 0 ? (
            <div className="grid grid-cols-2 gap-3 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/10 rounded-xl p-4 border border-primary-200 dark:border-primary-800">
              <div className="col-span-2 mb-2">
                <p className="text-xs font-medium text-primary-700 dark:text-primary-300 uppercase tracking-wide">📊 Resumo de Cálculos</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Custo Ingredientes</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatBRL(ingredientsCost)}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Custos Adicionais</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatBRL(additionalCostTotal)}</p>
              </div>

              {subRows.length > 0 && <div className="bg-white dark:bg-gray-800 rounded-lg p-3 col-span-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Sub-receitas</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatBRL(subRecipesCost)}</p>
              </div>}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border-2 border-primary-300 dark:border-primary-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Custo Total</p>
                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{formatBRL(totalCost)}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Custo por unidade</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatBRLUnit(costPerUnit)}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 col-span-2 border-2 border-emerald-300 dark:border-emerald-700">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Preço sugerido por unidade</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(suggestedPrice)}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Valor de venda de 1 unidade, com {marginNum}% de acréscimo sobre o custo.</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 col-span-2 border-2 border-emerald-300 dark:border-emerald-700">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Preço sugerido total da receita</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(suggestedPrice * yieldNum)}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Valor total da venda de todas as {fmtQty(yieldNum)} unidades: {formatBRL(totalCost)} para cobrir os custos
                  {' '}+ {formatBRL(estimatedProfit)} de lucro estimado.
                </p>
              </div>

              <div className="col-span-2">
                <IfoodPrices price={suggestedPrice} yieldQty={yieldNum} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 col-span-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Lucro estimado da receita</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatBRL(estimatedProfit)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Lucro / un: {formatBRL(suggestedPrice - costPerUnit)} · Margem sobre a venda: {suggestedPrice > 0 ? `${((suggestedPrice - costPerUnit) / suggestedPrice * 100).toFixed(1)}%` : '—'}</p>
                <p className="text-xs text-gray-500">O total e o lucro usam o preço por unidade antes do arredondamento. Ao cobrar o valor exibido em centavos, pode haver uma pequena diferença.</p>
              </div>
            </div>
          ) : null;
        })()}

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
              const units = ing ? getCompatibleUnits(ing) : [row.unit];
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
                          unit: sel ? (sel.purchaseUnitWeight ? 'unit' : sel.unit) : row.unit,
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
                        Comprado: {ing.purchaseUnitLabel
                          ? `${ing.purchaseQuantity} ${ing.purchaseUnitLabel} (${getEffectivePurchaseQuantity(ing)} ${ing.unit === 'unit' ? 'un' : ing.unit})`
                          : `${getEffectivePurchaseQuantity(ing)} ${ing.unit === 'unit' ? 'un' : ing.unit}`} · {formatBRL(ing.purchasePrice)}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.quantityUsed || ''}
                        onChange={e => updateRow(idx, { quantityUsed: e.target.value })}
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
                            {u === 'unit' ? (ing?.purchaseUnitWeight && ing.unit !== 'unit' ? ing.purchaseUnitLabel || 'embalagem' : 'un') : unitLabel(u)}
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
                      type="text"
                      inputMode="decimal"
                      value={row.quantityUsed || ''}
                      onChange={e => updateSubRow(idx, { quantityUsed: e.target.value })}
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Custos por unidade são multiplicados pelo rendimento. Custos por receita entram uma vez no total.</p>
          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            {COST_PRESETS.map(n => (
              <div key={n} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{n}</span>
                <select aria-label={`Base do custo ${n}`} value={costTypes[n] ?? 'recipe'} onChange={e => setCostTypes(p => ({ ...p, [n]: e.target.value as 'recipe' | 'unit' }))} className={inputClass + ' !w-auto'}>
                  <option value="recipe">Por receita</option><option value="unit">Por unidade</option>
                </select>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
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
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <input
                    value={c.name}
                    onChange={e => updateCustomCost(idx, { name: e.target.value })}
                    placeholder="Outro custo"
                    className={inputClass + ' flex-1 !w-auto min-w-0'}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={c.value || ''}
                    onChange={e => updateCustomCost(idx, { value: e.target.value })}
                    placeholder="R$"
                    className={inputClass + ' !w-24 shrink-0'}
                  />
                  <select aria-label={`Base do custo ${c.name || 'adicional'}`} value={c.costType ?? 'recipe'} onChange={e => updateCustomCost(idx, { costType: e.target.value as 'recipe' | 'unit' })} className={inputClass + ' !w-auto'}>
                    <option value="recipe">Por receita</option><option value="unit">Por unidade</option>
                  </select>
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

          {/* Assistente: calcula o R$/h a partir do salário desejado */}
          <div className="bg-white dark:bg-gray-800/60 rounded-lg p-2.5 mb-2 border border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setRateHelperOpen(v => !v)}
              className="w-full flex items-center gap-2 text-left"
            >
              <Calculator size={14} className="text-primary-500 shrink-0" />
              <span className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
                Não sabe seu valor por hora? Calcule aqui
              </span>
              <ChevronDown size={15} className={`text-gray-400 transition-transform ${rateHelperOpen ? 'rotate-180' : ''}`} />
            </button>
            {rateHelperOpen && (
              <div className="mt-2.5 space-y-2">
                <p className="text-[11px] text-gray-400">
                  Informe quanto quer receber por mês e a sua jornada. A gente calcula quanto vale a sua hora.
                </p>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$/mês</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={monthlyIncome}
                    onChange={e => setMonthlyIncome(e.target.value)}
                    placeholder="Quero receber por mês"
                    className={inputClass + ' pl-14'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={hoursPerDay}
                      onChange={e => setHoursPerDay(e.target.value)}
                      placeholder="Horas/dia"
                      className={inputClass + ' pr-12'}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">h/dia</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={daysPerWeek}
                      onChange={e => setDaysPerWeek(e.target.value)}
                      placeholder="Dias/semana"
                      className={inputClass + ' pr-12'}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">dias</span>
                  </div>
                </div>
                {computedHourlyRate > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Sua hora vale ~{formatBRL(computedHourlyRate)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHourlyRate(computedHourlyRate.toFixed(2).replace('.', ','));
                        setRateHelperOpen(false);
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-500 text-white"
                    >
                      Usar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$/h</span>
              <input
                type="text"
                inputMode="decimal"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
                placeholder="20"
                className={inputClass + ' pl-10'}
              />
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
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
        {showTutorial && (
          <ModalOverlay onClose={() => setShowTutorial(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Tutorial</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 font-sans leading-relaxed">
                {PRICING_TUTORIAL}
              </pre>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTutorial(false)}
                  className="text-sm px-4 py-2 rounded-lg bg-primary-500 text-white font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}

        {showYieldInfo && (
          <ModalOverlay onClose={() => setShowYieldInfo(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4 max-w-md">
              <div className="flex items-center gap-2">
                <Info size={20} className="text-sky-500 shrink-0" />
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  Por que informar o rendimento?
                </h3>
              </div>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                <p>
                  A <strong>quantidade das receitas que você juntou</strong> serve para calcular
                  quanto o bolo <strong>custou</strong> (a soma de tudo que entrou nele).
                </p>
                <p>
                  O <strong>rendimento</strong> serve para outra coisa: dizer em{' '}
                  <strong>quantas fatias, porções ou unidades</strong> esse bolo vai ser vendido —
                  ou seja, o custo de <strong>cada pedaço</strong>.
                </p>
                <div className="rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/40 p-3 space-y-1.5">
                  <p className="font-semibold text-sky-800 dark:text-sky-200">Exemplo</p>
                  <p className="text-sky-800 dark:text-sky-200">
                    O bolo custou <strong>R$ 40</strong> e rende <strong>10 fatias</strong>{' '}
                    → cada fatia custa <strong>R$ 4</strong>. Com esse valor o app sugere o preço de venda.
                  </p>
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  Sem o rendimento, o app sabe o custo do bolo inteiro, mas não consegue saber quanto
                  cobrar por fatia. Por isso os dois campos se completam — não são a mesma informação.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowYieldInfo(false)}
                  className="text-sm px-4 py-2 rounded-lg bg-primary-500 text-white font-medium"
                >
                  Entendi
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </form>
    </ModalOverlay>
  );
}

/** Preço por unidade/total para vender no iFood, já repassando a taxa do plano. */
function IfoodPrices({ price, yieldQty }: { price: number; yieldQty: number }) {
  if (price <= 0 || getCurrency() !== 'BRL') return null;
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 p-3">
      <p className="text-sm font-semibold text-red-600 dark:text-red-400">🛵 Preço para iFood</p>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {IFOOD_PLANS.map(plan => {
          const unit = ifoodPrice(price, plan.rate);
          return (
            <div key={plan.key} className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2.5">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {plan.label} ({(plan.rate * 100).toFixed(1).replace('.', ',')}%)
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatBRL(unit)}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Total ({fmtQty(yieldQty)} un): {formatBRL(unit * yieldQty)}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
        Já repassa a comissão + taxa de pagamento online, para você receber o mesmo valor da venda direta. Não inclui a mensalidade do iFood.
      </p>
    </div>
  );
}

/** Tela própria da receita (substitui a lista enquanto aberta). */
function RecipeDetail({
  recipe: r,
  calc: c,
  season,
  ingredients,
  allRecipes,
  onBack,
  onEdit,
  onScale,
  onDuplicate,
  onDelete,
  onPhotoChange,
  toast,
}: {
  recipe: Recipe;
  calc?: CalculationResult;
  season: Season | null;
  ingredients: Ingredient[];
  allRecipes: Recipe[];
  onBack: () => void;
  onEdit: () => void;
  onScale: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPhotoChange: (photoUrl: string) => Promise<void>;
  toast: ToastFn;
}) {
  const ingById = new Map(ingredients.map(i => [i.id, i]));
  // Fotos antigas do app eram caminhos locais (file://) que o navegador não abre.
  const [photoBroken, setPhotoBroken] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  useEffect(() => setPhotoBroken(false), [r.photoUrl]);
  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      await onPhotoChange(await imageFileToJpegDataUrl(file, 1000, 0.75));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  };
  const showPhoto = !!r.photoUrl && !photoBroken;
  const unitLabel = (unit: string, ing?: Ingredient) =>
    unit === 'unit' ? (ing?.purchaseUnitWeight && ing.unit !== 'unit' ? ing.purchaseUnitLabel || 'embalagem' : 'un') : unit;
  const safeCost = (fn: () => number) => { try { return fn(); } catch { return null; } };
  const card = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700';
  const th = 'px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400';
  const td = 'px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200';

  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
        <ArrowLeft size={16} /> Receitas
      </button>

      <div className="flex flex-wrap items-start gap-3 mb-5">
        <div className="relative group shrink-0">
          {showPhoto ? (
            <img src={r.photoUrl} alt="" onError={() => setPhotoBroken(true)} className="w-20 h-20 rounded-xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
              <ChefHat size={26} className="text-primary-400" />
            </div>
          )}
          <div className="mt-1 flex gap-2 text-[11px]">
            <label className="cursor-pointer font-semibold text-primary-600 hover:underline">
              {photoBusy ? 'Enviando…' : showPhoto ? 'Trocar foto' : 'Adicionar foto'}
              <input type="file" accept="image/*" className="hidden" disabled={photoBusy} onChange={pickPhoto} />
            </label>
            {r.photoUrl && !photoBusy && (
              <button type="button" onClick={() => onPhotoChange('')} className="text-gray-400 hover:text-red-500">Remover</button>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{r.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Rende {fmtQty(r.yield)} un · acréscimo {r.profitMargin}% · {r.ingredients.length} ingrediente{r.ingredients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-3 py-2 rounded-lg">
            <Pencil size={15} /> Editar
          </button>
          <button onClick={onScale} className={iconBtn} title="Escala e orçamento" disabled={!c}><Calculator size={16} /></button>
          <button onClick={onDuplicate} className={iconBtn} title="Duplicar"><Copy size={16} /></button>
          <button onClick={onDelete} className={iconBtnDanger} title="Excluir"><Trash2 size={16} /></button>
        </div>
      </div>

      {/* Preço */}
      <div className="rounded-xl p-5 bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm mb-4">
        <p className="text-xs text-white/80">Preço sugerido por unidade</p>
        <p className="text-3xl font-extrabold tracking-tight">{c ? formatBRL(c.suggestedPrice) : '—'}</p>
        {c && season && (
          <p className="inline-block mt-2 rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold">
            🎉 {season.name}: {formatBRL(c.suggestedPrice * season.multiplier)}
            {' '}({season.multiplier >= 1 ? '+' : ''}{Math.round((season.multiplier - 1) * 100)}%)
          </p>
        )}
        {c && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {([
              [`Total (${fmtQty(r.yield)} un)`, formatBRL(c.suggestedPrice * r.yield)],
              ['Custo / un', formatBRLUnit(c.costPerUnit)],
              ['Lucro da receita', formatBRL(c.estimatedProfit)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-white/15 px-3 py-2">
                <p className="text-base font-bold">{value}</p>
                <p className="text-[11px] text-white/80">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* Ingredientes */}
          <div className={card}>
            <p className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-sm text-gray-900 dark:text-white">Ingredientes</p>
            {r.ingredients.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum ingrediente.</p>
            ) : (
              <table className="w-full">
                <thead><tr><th className={th}>Ingrediente</th><th className={th}>Quantidade</th><th className={`${th} text-right`}>Custo</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {r.ingredients.map((row, idx) => {
                    const ing = ingById.get(row.ingredientId);
                    const cost = ing ? safeCost(() => getIngredientUsageCost(ing, row.quantityUsed, row.unit)) : null;
                    return (
                      <tr key={`${row.ingredientId}-${idx}`}>
                        <td className={td}>{ing?.name ?? row.ingredientName ?? 'Ingrediente removido'}</td>
                        <td className={td}>{fmtQty(row.quantityUsed)} {unitLabel(row.unit, ing)}</td>
                        <td className={`${td} text-right font-medium`}>{cost != null ? formatBRLUnit(cost) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {(r.subRecipes ?? []).length > 0 && (
            <div className={card}>
              <p className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-sm text-gray-900 dark:text-white">Sub-receitas</p>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {r.subRecipes.map((row, idx) => {
                  const sub = allRecipes.find(x => x.id === row.subRecipeId);
                  const cost = sub ? safeCost(() => getSubRecipeUsageCost(sub, ingredients, row.quantityUsed, row.unit)) : null;
                  return (
                    <div key={`${row.subRecipeId}-${idx}`} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-gray-700 dark:text-gray-200">{sub?.name ?? row.subRecipeName ?? 'Sub-receita removida'} · {fmtQty(row.quantityUsed)} {row.unit === 'unit' ? 'un' : row.unit}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{cost != null ? formatBRLUnit(cost) : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {r.additionalCosts.length > 0 && (
            <div className={card}>
              <p className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-sm text-gray-900 dark:text-white">Custos adicionais</p>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {r.additionalCosts.map((ac, idx) => (
                  <div key={`${ac.name}-${idx}`} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="text-gray-700 dark:text-gray-200">{ac.name}{ac.costType === 'unit' ? ' (por unidade)' : ''}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatBRL(ac.value)}{ac.costType === 'unit' ? ` × ${fmtQty(r.yield)} = ${formatBRL(ac.value * r.yield)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {c && (
            <div className={`${card} px-4 py-2 divide-y divide-gray-100 dark:divide-gray-700`}>
              {([
                ['Ingredientes', formatBRL(c.ingredientsCost)],
                ['Custos adicionais', formatBRL(c.additionalCostTotal)],
                ['Sub-receitas', formatBRL(c.subRecipesCost)],
                ['Custo total', formatBRL(c.totalCost)],
                ['Custo por unidade', formatBRLUnit(c.costPerUnit)],
                ['Margem sobre a venda', c.suggestedPrice > 0 ? `${((c.suggestedPrice - c.costPerUnit) / c.suggestedPrice * 100).toFixed(1)}%` : '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{value}</span>
                </div>
              ))}
            </div>
          )}
          {c && <IfoodPrices price={c.suggestedPrice} yieldQty={r.yield} />}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            O preço inclui o custo mais {r.profitMargin}% de acréscimo. Valores estimados antes do arredondamento do preço por unidade.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Personalização do PDF do orçamento (logo, cor, slogan, marca d'água) — Premium, igual ao app. */
function PdfSettingsModal({ isPaid, onClose, toast }: { isPaid: boolean; onClose: () => void; toast: ToastFn }) {
  const [settings, setSettings] = useState<PdfSettings>(() => getPdfSettings());
  const [showOffer, setShowOffer] = useState(false);

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const logoBase64 = await imageFileToJpegDataUrl(file, 300, 0.85);
      setSettings(s => ({ ...s, logoBase64 }));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const save = () => {
    savePdfSettings(settings);
    toast.success('Personalização do PDF salva neste navegador.');
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      {showOffer && createPortal(<SubscribeModal initialTier="premium" source="pdf_branding" onClose={() => setShowOffer(false)} toast={toast} />, document.body)}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
          <Palette size={18} className="text-primary-500" /> Personalizar PDF
        </h3>

        {!isPaid && (
          <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-3 text-sm text-primary-800 dark:text-primary-200">
            Seu logo, sua cor e sem a marca DocePreço no orçamento são recursos Premium.
            <button type="button" onClick={() => setShowOffer(true)} className="block mt-1 font-semibold underline">Conhecer o Premium</button>
          </div>
        )}

        <fieldset disabled={!isPaid} className="space-y-4 disabled:opacity-50">
          <FormField label="Logo">
            <div className="flex items-center gap-3">
              {settings.logoBase64 ? (
                <img src={settings.logoBase64} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><ImagePlus size={20} className="text-gray-400" /></div>
              )}
              <label className="cursor-pointer text-sm font-semibold text-primary-600 hover:underline">
                {settings.logoBase64 ? 'Trocar logo' : 'Enviar logo'}
                <input type="file" accept="image/*" className="hidden" onChange={pickLogo} />
              </label>
              {settings.logoBase64 && (
                <button type="button" onClick={() => setSettings(s => ({ ...s, logoBase64: undefined }))} className="text-sm text-gray-400 hover:text-red-500">Remover</button>
              )}
            </div>
          </FormField>

          <FormField label="Cor da marca">
            <div className="flex flex-wrap gap-2">
              {PDF_COLORS.map(c => (
                <button
                  key={c.color}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => setSettings(s => ({ ...s, brandColor: c.color }))}
                  className={`w-8 h-8 rounded-full border-2 ${settings.brandColor === c.color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.color }}
                />
              ))}
            </div>
          </FormField>

          <FormField label="Slogan (opcional)">
            <input
              value={settings.companySlogan ?? ''}
              onChange={e => setSettings(s => ({ ...s, companySlogan: e.target.value }))}
              maxLength={80}
              placeholder="Ex.: Doces feitos com amor"
              className={inputClass}
            />
          </FormField>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={settings.hideWatermark}
              onChange={e => setSettings(s => ({ ...s, hideWatermark: e.target.checked }))}
              className="w-4 h-4 accent-primary-500"
            />
            Ocultar "Orçamento gerado por DocePreço" no rodapé
          </label>
        </fieldset>

        <p className="text-[11px] text-gray-400">A personalização fica salva neste navegador.</p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
          <button type="button" onClick={save} disabled={!isPaid} className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white">Salvar</button>
        </div>
      </div>
    </ModalOverlay>
  );
}
