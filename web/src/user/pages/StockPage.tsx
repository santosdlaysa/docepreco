import { useEffect, useState, useCallback } from 'react';
import { Boxes, AlertTriangle, PlusCircle, PackageCheck } from 'lucide-react';
import { userApi, Ingredient, StockItem, StockMovement } from '../userApi';
import { ToastFn, ModalOverlay, TableSkeleton } from '../../components';
import { formatBRL, formatDate } from '../format';
import { EmptyState, FormField, inputClass } from './IngredientsPage';
import { parseLocaleNumber } from '../number';

/** Preço por unidade base do ingrediente (mesma regra da tela de Ingredientes). */
function unitPrice(i: Ingredient): number {
  const effectiveQty = i.purchaseUnitLabel && i.purchaseUnitWeight
    ? i.purchaseQuantity * i.purchaseUnitWeight
    : i.purchaseQuantity;
  return effectiveQty > 0 ? i.purchasePrice / effectiveQty : 0;
}

type Status = 'none' | 'ok' | 'low' | 'out';

const STATUS_META: Record<Status, { label: string; dot: string; text: string }> = {
  none: { label: 'Sem controle', dot: 'bg-gray-300 dark:bg-gray-600', text: 'text-gray-400' },
  ok: { label: 'Em estoque', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
  low: { label: 'Estoque baixo', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  out: { label: 'Em falta', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
};

export function StockPage({ toast }: { toast: ToastFn }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ingredient | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ings, stock] = await Promise.all([userApi.listIngredients(), userApi.getStock()]);
      setIngredients(ings);
      setItems(stock.items);
      setMovements(stock.movements);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const stockMap = new Map(items.map(it => [it.ingredientId, it]));

  const statusOf = (i: Ingredient): Status => {
    const it = stockMap.get(i.id);
    if (!it) return 'none';
    if (it.quantity <= 0) return 'out';
    if (it.quantity <= it.minQuantity) return 'low';
    return 'ok';
  };

  const totalValue = ingredients.reduce((sum, i) => {
    const it = stockMap.get(i.id);
    return it ? sum + it.quantity * unitPrice(i) : sum;
  }, 0);
  const trackedCount = items.length;
  const lowCount = ingredients.filter(i => ['low', 'out'].includes(statusOf(i))).length;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Estoque</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Controle de insumos e reposição</p>
      </div>

      {/* Hero */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800 shadow-sm mb-4">
        <p className="text-xs font-medium text-white/80">Valor em estoque</p>
        <p className="text-3xl font-extrabold text-white tracking-tight mt-1">{formatBRL(totalValue)}</p>
        <div className="flex gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 rounded-lg px-2.5 py-1.5">
            <PackageCheck size={13} /> {trackedCount} controlado{trackedCount !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 rounded-lg px-2.5 py-1.5">
            <AlertTriangle size={13} /> {lowCount} em falta/baixo
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={6} cols={2} />
        </div>
      ) : ingredients.length === 0 ? (
        <EmptyState icon={Boxes} text="Cadastre ingredientes para controlar o estoque deles." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {ingredients.map(i => {
            const it = stockMap.get(i.id);
            const status = statusOf(i);
            const meta = STATUS_META[status];
            return (
              <button
                key={i.id}
                onClick={() => setSelected(i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{i.name}</p>
                  <p className={`text-xs ${meta.text}`}>
                    {meta.label}
                    {it ? ` · ${it.quantity} ${i.unit}` : ''}
                  </p>
                </div>
                {it && (
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 shrink-0">
                    {formatBRL(it.quantity * unitPrice(i))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <StockModal
          ingredient={selected}
          item={stockMap.get(selected.id) ?? null}
          movements={movements.filter(m => m.ingredientId === selected.id)}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load(); }}
          toast={toast}
        />
      )}
    </div>
  );
}

function StockModal({
  ingredient,
  item,
  movements,
  onClose,
  onSaved,
  toast,
}: {
  ingredient: Ingredient;
  item: StockItem | null;
  movements: StockMovement[];
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const [qty, setQty] = useState(item ? String(item.quantity) : '');
  const [min, setMin] = useState(item ? String(item.minQuantity) : '');
  const [entry, setEntry] = useState('');
  const [saving, setSaving] = useState(false);

  const saveInventory = async () => {
    setSaving(true);
    try {
      await userApi.setStockQuantity(
        ingredient.id,
        parseLocaleNumber(qty),
        parseLocaleNumber(min),
        ingredient.unit
      );
      toast.success('Estoque atualizado.');
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addEntry = async () => {
    const q = parseLocaleNumber(entry);
    if (q <= 0) return toast.error('Informe a quantidade que chegou.');
    setSaving(true);
    try {
      await userApi.addStockEntry(ingredient.id, q, ingredient.unit, 'Reposição');
      toast.success('Reposição registrada.');
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const moveLabel = (m: StockMovement) => {
    if (m.type === 'set') return `Ajuste para ${m.balance} ${ingredient.unit}`;
    if (m.type === 'in') return `+${m.quantity} ${ingredient.unit} (reposição)`;
    return `−${m.quantity} ${ingredient.unit} (${m.reason || 'saída'})`;
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{ingredient.name}</h3>
          <p className="text-xs text-gray-400">Unidade: {ingredient.unit}</p>
        </div>

        {/* Inventário (saldo + mínimo) */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label={`Saldo atual (${ingredient.unit})`}>
            <input type="text" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className={inputClass} />
          </FormField>
          <FormField label={`Estoque mínimo (${ingredient.unit})`}>
            <input type="text" inputMode="decimal" value={min} onChange={e => setMin(e.target.value)} placeholder="0" className={inputClass} />
          </FormField>
        </div>
        <button
          onClick={saveInventory}
          disabled={saving}
          className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar inventário'}
        </button>

        {/* Entrada rápida */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Reposição rápida</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={entry}
              onChange={e => setEntry(e.target.value)}
              placeholder={`Quanto chegou (${ingredient.unit})`}
              className={inputClass}
            />
            <button
              onClick={addEntry}
              disabled={saving}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 transition-colors shrink-0"
            >
              <PlusCircle size={16} /> Somar
            </button>
          </div>
        </div>

        {/* Histórico */}
        {movements.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Movimentações recentes</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {movements.slice(0, 8).map(m => (
                <div key={m.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-300">{moveLabel(m)}</span>
                  <span className="text-gray-400">{formatDate(m.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
