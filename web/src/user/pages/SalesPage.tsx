import { useEffect, useState, useCallback } from 'react';
import { Trash2, ShoppingCart } from 'lucide-react';
import { userApi, Sale, Recipe, CreateSaleDTO } from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatBRL, formatDate, todayISO } from '../format';
import { Header, EmptyState, FormField, FormActions, inputClass, iconBtnDanger } from './IngredientsPage';
import { parseLocaleNumber } from '../number';

export function SalesPage({ toast }: { toast: ToastFn }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([userApi.listSales(), userApi.listRecipes()]);
      setSales(s);
      setRecipes(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const total = sales.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await userApi.deleteSale(confirmId);
      toast.success('Venda excluída.');
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <Header
        title="Vendas"
        subtitle={`${sales.length} venda${sales.length !== 1 ? 's' : ''} · ${formatBRL(total)}`}
        onAdd={() => setCreating(true)}
        addLabel="Registrar venda"
      />

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={6} cols={3} />
        </div>
      ) : sales.length === 0 ? (
        <EmptyState icon={ShoppingCart} text="Nenhuma venda registrada ainda." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {sales.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {s.recipeName}
                  {s.orderId && (
                    <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                      Encomenda
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {s.quantitySold}× · {formatDate(s.saleDate)}
                  {s.notes ? ` · ${s.notes}` : ''}
                </p>
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">{formatBRL(s.totalRevenue)}</span>
              <button onClick={() => setConfirmId(s.id)} className={iconBtnDanger}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <SaleForm
          recipes={recipes}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
          toast={toast}
        />
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Excluir venda"
        message="Tem certeza?"
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

export function SaleForm({
  recipes,
  onClose,
  onSaved,
  toast,
}: {
  recipes: Recipe[];
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? '');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'credito' | 'debito' | 'pix'>('dinheiro');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeId) return toast.error('Selecione uma receita.');
    setSaving(true);
    const data: CreateSaleDTO = {
      recipeId,
      quantitySold: parseLocaleNumber(quantity) || 1,
      salePrice: parseLocaleNumber(price),
      saleDate: date,
      notes: notes.trim() || undefined,
      paymentMethod,
    };
    try {
      await userApi.createSale(data);
      toast.success('Venda registrada.');
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
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Registrar venda</h3>

        {recipes.length === 0 ? (
          <p className="text-sm text-gray-500">Cadastre uma receita antes de registrar vendas.</p>
        ) : (
          <FormField label="Receita">
            <select value={recipeId} onChange={e => setRecipeId(e.target.value)} className={inputClass}>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quantidade">
            <input
              type="text"
              inputMode="numeric"
              step="any"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Preço unitário (R$)">
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Data">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Pagamento">
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as 'dinheiro' | 'credito' | 'debito' | 'pix')} className={inputClass}>
              <option value="dinheiro">Dinheiro</option>
              <option value="credito">Crédito</option>
              <option value="debito">Débito</option>
              <option value="pix">PIX</option>
            </select>
          </FormField>
        </div>

        <FormField label="Observações (opcional)">
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
        </FormField>

        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}
