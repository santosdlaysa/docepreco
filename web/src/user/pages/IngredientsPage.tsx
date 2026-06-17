import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Package, Info, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { userApi, Ingredient, CreateIngredientDTO, Unit } from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatBRL } from '../format';
import { PRICING_TUTORIAL } from '../pricingTutorial';
import { parseLocaleNumber } from '../number';

const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: 'unit', label: 'un' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'l' },
];
const PKG_TYPES = ['Lata', 'Pacote', 'Saco', 'Caixa', 'Garrafa', 'Pote'];

const PER_PAGE = 10;

export function IngredientsPage({ toast }: { toast: ToastFn }) {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await userApi.listIngredients());
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
      await userApi.deleteIngredient(confirmId);
      toast.success('Ingrediente excluído.');
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const filtered = search.trim()
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div>
      <Header
        title="Ingredientes"
        subtitle={`${items.length} cadastrado${items.length !== 1 ? 's' : ''}`}
        onAdd={() => setCreating(true)}
      />

      {!loading && items.length > 0 && (
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar ingrediente..."
            className={inputClass + ' pl-9'}
          />
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={6} cols={3} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Package} text="Nenhum ingrediente ainda. Adicione o primeiro." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} text="Nenhum ingrediente encontrado para essa busca." />
      ) : (
        <>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {pageItems.map(i => (
            <div key={i.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{i.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {i.purchaseUnitLabel
                    ? `${i.purchaseQuantity} ${i.purchaseUnitLabel}${i.purchaseUnitWeight ? ` (${i.purchaseQuantity * i.purchaseUnitWeight} ${i.unit})` : ''}`
                    : `${i.purchaseQuantity} ${i.unit}`}{' '}
                  · {formatBRL(i.purchasePrice)}
                </p>
              </div>
              <button onClick={() => setEditing(i)} className={iconBtn}>
                <Pencil size={16} />
              </button>
              <button onClick={() => setConfirmId(i.id)} className={iconBtnDanger}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        )}
        </>
      )}

      {(creating || editing) && (
        <IngredientForm
          initial={editing}
          existingNames={items.map(i => i.name)}
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
        title="Excluir ingrediente"
        message="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function IngredientForm({
  initial,
  existingNames,
  onClose,
  onSaved,
  toast,
}: {
  initial: Ingredient | null;
  existingNames: string[];
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const editingId = initial?.id ?? null;
  const [name, setName] = useState(initial?.name ?? '');
  const [quantity, setQuantity] = useState(String(initial?.purchaseQuantity ?? ''));
  const [price, setPrice] = useState(initial ? Number(initial.purchasePrice).toFixed(2) : '');
  const [unit, setUnit] = useState<Unit | ''>(initial?.unit ?? '');
  const [pkgLabel, setPkgLabel] = useState(initial?.purchaseUnitLabel ?? '');
  const [pkgWeight, setPkgWeight] = useState(String(initial?.purchaseUnitWeight ?? ''));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const useCustom = !!pkgLabel;
  const suggestions =
    name.trim().length >= 2
      ? existingNames.filter(n => n.toLowerCase().includes(name.toLowerCase()) && n !== name).slice(0, 5)
      : [];

  // ── Preview do preço por unidade ──
  const qtyN = parseLocaleNumber(quantity);
  const priceN = parseLocaleNumber(price);
  const weightN = parseLocaleNumber(pkgWeight);
  const effectiveQty = useCustom && weightN > 0 ? qtyN * weightN : qtyN;
  const pricePerUnit = effectiveQty > 0 ? priceN / effectiveQty : 0;
  const pricePerPkg = qtyN > 0 ? priceN / qtyN : 0;
  const showPreview = qtyN > 0 && priceN > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe o nome.');
    if (qtyN <= 0) return toast.error('Informe a quantidade.');
    if (priceN <= 0) return toast.error('Informe o preço pago.');
    if (!unit) return toast.error('Escolha a unidade de medida.');
    if (useCustom && weightN <= 0) return toast.error('Informe o peso por embalagem.');

    setSaving(true);
    const data: CreateIngredientDTO = {
      name: name.trim(),
      purchaseQuantity: qtyN,
      purchasePrice: priceN,
      unit,
      purchaseUnitLabel: useCustom ? pkgLabel : undefined,
      purchaseUnitWeight: useCustom ? weightN : undefined,
    };
    try {
      if (editingId) {
        await userApi.updateIngredient(editingId, data);
        // Registra no histórico de preço se preço/quantidade mudaram
        if (initial && (priceN !== initial.purchasePrice || qtyN !== initial.purchaseQuantity)) {
          await userApi
            .addPriceHistory(editingId, { price: priceN, purchaseQuantity: qtyN, unit })
            .catch(() => {});
        }
        toast.success('Ingrediente atualizado.');
      } else {
        await userApi.createIngredient(data);
        toast.success('Ingrediente criado.');
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
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
          {editingId ? 'Editar ingrediente' : 'Novo ingrediente'}
        </h3>

        {/* Banner */}
        <div className="flex items-center gap-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/40 rounded-xl p-3">
          <Info size={18} className="text-sky-500 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-sky-800 dark:text-sky-200">
              Informe a quantidade total comprada e o valor total pago. Não use aqui a quantidade da receita nem o preço por g/ml/un.
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

        {/* Nome com autocomplete */}
        <div className="relative">
          <FormField label="Nome do ingrediente">
            <input
              value={name}
              onChange={e => {
                setName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Ex.: Leite condensado"
              className={inputClass}
              autoFocus
            />
          </FormField>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setName(s);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tipo de embalagem */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Tipo de embalagem
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Selecione se o ingrediente vem em embalagem (lata, pacote, etc.).
          </p>
          <div className="flex flex-wrap gap-2">
            {PKG_TYPES.map(pkg => {
              const on = pkgLabel === pkg;
              return (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => {
                    if (on) {
                      setPkgLabel('');
                      setPkgWeight('');
                    } else {
                      setPkgLabel(pkg);
                    }
                  }}
                  className={chipClass(on)}
                >
                  {pkg}
                </button>
              );
            })}
          </div>
        </div>

        {/* Peso por embalagem (quando custom) */}
        {useCustom && (
          <FormField label="Peso por embalagem">
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={pkgWeight}
                onChange={e => setPkgWeight(e.target.value)}
                placeholder="330"
                className={inputClass + ' pr-28'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {unit || 'g'} por {pkgLabel}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Ex.: uma lata de leite condensado tem 330g.</p>
          </FormField>
        )}

        {/* Quantidade + Preço */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label={useCustom ? `Quantidade comprada (${pkgLabel}s)` : 'Quantidade comprada'}>
            <input
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder={useCustom ? '2' : '1000'}
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">
              Total comprado/embalagem. Ex.: pacote de 1kg = 1000 g.
            </p>
          </FormField>
          <FormField label="Valor total pago (R$)">
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="14,00"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">
              Valor da compra inteira, não preço por g/ml/un.
            </p>
          </FormField>
        </div>

        {/* Unidade de medida (chips) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Unidade de medida
          </label>
          <p className="text-xs text-gray-400 mb-2">Em qual unidade você usa esse ingrediente nas receitas?</p>
          <div className="flex flex-wrap gap-2">
            {UNIT_OPTIONS.map(u => (
              <button
                key={u.value}
                type="button"
                onClick={() => setUnit(u.value)}
                className={chipClass(unit === u.value)}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview do preço por unidade */}
        {showPreview && (
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <p className="text-xs font-medium text-white/80">Preço por unidade</p>
            <p className="text-2xl font-bold tracking-tight">
              {formatBRL(pricePerUnit)}
              <span className="text-sm font-medium"> /{unit || 'un'}</span>
            </p>
            {useCustom && weightN > 0 && (
              <p className="text-xs text-white/80 mt-1">
                Embalagem: {formatBRL(pricePerPkg)} · {weightN}{unit} cada
              </p>
            )}
          </div>
        )}

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
      </form>
    </ModalOverlay>
  );
}

function chipClass(on: boolean): string {
  return `h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
    on
      ? 'bg-primary-500 text-white'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
  }`;
}

/* ── Pequenos componentes compartilhados entre as páginas ──────────────── */

export const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';
export const iconBtn =
  'p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';
export const iconBtnDanger =
  'p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';

export function Header({
  title,
  subtitle,
  onAdd,
  addLabel = 'Adicionar',
}: {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3.5 py-2 transition-colors"
        >
          <Plus size={16} />
          {addLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-16 flex flex-col items-center text-center">
      <Icon size={36} className="text-gray-300 dark:text-gray-600 mb-3" />
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{text}</p>
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</label>
      {children}
    </div>
  );
}

export function FormActions({ saving, onClose, saveLabel = 'Salvar' }: { saving: boolean; onClose: () => void; saveLabel?: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        className="text-sm px-4 py-2 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white"
      >
        {saving ? 'Salvando...' : saveLabel}
      </button>
    </div>
  );
}
