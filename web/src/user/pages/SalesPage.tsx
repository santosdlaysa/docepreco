import { useEffect, useState, useCallback } from 'react';
import { Trash2, ShoppingCart, Pencil } from 'lucide-react';
import { userApi, Sale, Recipe, CreateSaleDTO, UpdateSaleDTO } from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatBRL, formatDate, todayISO } from '../format';
import { Header, EmptyState, FormField, FormActions, inputClass, iconBtn, iconBtnDanger } from './IngredientsPage';
import { parseLocaleNumber } from '../number';
import { deductStockForItems, reverseStockForItems } from '../stockDeduction';
import { getCustomProducts, addCustomProduct, computeDiscountAmount, DiscountType } from '../customProducts';

const PAYMENT_LABEL: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', credito: 'Crédito', debito: 'Débito', cartao: 'Cartão' };

export function SalesPage({ toast }: { toast: ToastFn }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
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
                  {s.paymentMethod ? ` · ${PAYMENT_LABEL[s.paymentMethod] || s.paymentMethod}` : ''}
                  {s.clientName && !s.orderId ? ` · Vendido para ${s.clientName}` : ''}
                  {s.notes ? ` · ${s.notes}` : ''}
                </p>
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">{formatBRL(s.totalRevenue)}</span>
              <button onClick={() => setEditing(s)} className={iconBtn} title="Editar venda">
                <Pencil size={16} />
              </button>
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

      {editing && (
        <SaleForm
          recipes={recipes}
          sale={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
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
  sale,
  onClose,
  onSaved,
  toast,
}: {
  recipes: Recipe[];
  /** Quando presente, o formulário edita esta venda em vez de criar uma nova. */
  sale?: Sale;
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const editing = !!sale;
  // Venda nova: receita ou produto avulso (sem ficha técnica), igual ao app.
  // Venda existente sem receita: a identidade não é editável, preservamos productName.
  const [mode, setMode] = useState<'recipe' | 'custom'>(editing && !sale!.recipeId ? 'custom' : 'recipe');
  const isCustom = mode === 'custom';
  const [customName, setCustomName] = useState(editing && !sale!.recipeId ? sale!.recipeName : '');
  const [savedProducts] = useState(getCustomProducts);
  const [discountType, setDiscountType] = useState<DiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState(sale?.discount ? String(sale.discount).replace('.', ',') : '');
  const [recipeId, setRecipeId] = useState(sale?.recipeId || recipes[0]?.id || '');
  const [quantity, setQuantity] = useState(sale ? String(sale.quantitySold) : '1');
  const [price, setPrice] = useState(sale ? String(sale.salePrice) : '');
  const [date, setDate] = useState(sale?.saleDate ?? todayISO());
  const [clientName, setClientName] = useState(sale?.clientName ?? '');
  const [notes, setNotes] = useState(sale?.notes ?? '');
  const initialPayment = sale?.paymentMethod && sale.paymentMethod !== 'cartao' ? sale.paymentMethod : 'dinheiro';
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'credito' | 'debito' | 'pix'>(initialPayment);
  const [saving, setSaving] = useState(false);

  const warnLowStock = (names: string[]) => {
    if (names.length > 0) toast.warning(`Estoque baixo: ${names.join(', ')}`);
  };

  const qtyNum = parseLocaleNumber(quantity) || 1;
  const subtotal = qtyNum * parseLocaleNumber(price);
  const discountAmount = computeDiscountAmount(subtotal, discountType, parseLocaleNumber(discountValue));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCustom && !recipeId) return toast.error('Selecione uma receita.');
    if (isCustom && !customName.trim()) return toast.error('Informe o nome do produto.');
    setSaving(true);
    try {
      if (editing) {
        const data: UpdateSaleDTO = {
          recipeId: isCustom ? null : recipeId,
          productName: isCustom ? customName.trim() : undefined,
          quantitySold: qtyNum,
          salePrice: parseLocaleNumber(price),
          discount: discountAmount,
          saleDate: date,
          clientName: clientName.trim() || undefined,
          notes: notes.trim() || undefined,
          paymentMethod,
        };
        await userApi.updateSale(sale!.id, data);
        toast.success('Venda atualizada.');
        // Mudou receita ou quantidade: estorna a baixa antiga e aplica a nova (igual ao app).
        const newQty = data.quantitySold ?? 1;
        if (!isCustom && (sale!.recipeId !== recipeId || sale!.quantitySold !== newQty)) {
          if (sale!.recipeId) await reverseStockForItems([{ recipeId: sale!.recipeId, quantity: sale!.quantitySold }]);
          warnLowStock(await deductStockForItems([{ recipeId, quantity: newQty }]));
        }
      } else {
        const data: CreateSaleDTO = {
          recipeId: isCustom ? null : recipeId,
          productName: isCustom ? customName.trim() : undefined,
          discount: discountAmount || undefined,
          quantitySold: qtyNum,
          salePrice: parseLocaleNumber(price),
          saleDate: date,
          clientName: clientName.trim() || undefined,
          notes: notes.trim() || undefined,
          paymentMethod,
        };
        await userApi.createSale(data);
        toast.success('Venda registrada.');
        if (isCustom) addCustomProduct(customName);
        else warnLowStock(await deductStockForItems([{ recipeId, quantity: data.quantitySold }]));
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
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{editing ? 'Editar venda' : 'Registrar venda'}</h3>

        {!editing && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 dark:bg-gray-700/50 p-1">
            {([['recipe', 'Receita'], ['custom', 'Produto avulso']] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  mode === m ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {isCustom ? (
          <FormField label="Produto">
            {editing ? (
              <input value={sale!.recipeName} disabled className={`${inputClass} opacity-70`} />
            ) : (
              <>
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  list="custom-products"
                  placeholder="Ex.: Brigadeiro gourmet"
                  className={inputClass}
                  autoFocus
                />
                <datalist id="custom-products">
                  {savedProducts.map(n => <option key={n} value={n} />)}
                </datalist>
              </>
            )}
          </FormField>
        ) : recipes.length === 0 ? (
          <p className="text-sm text-gray-500">Cadastre uma receita antes de registrar vendas, ou use “Produto avulso”.</p>
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

        <FormField label="Desconto (opcional)">
          <div className="flex gap-2">
            <select value={discountType} onChange={e => setDiscountType(e.target.value as DiscountType)} className={`${inputClass} w-24 shrink-0`}>
              <option value="fixed">R$</option>
              <option value="percent">%</option>
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
        </FormField>
        {subtotal > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-300 -mt-2">
            Total: <span className="font-semibold text-gray-900 dark:text-white">{formatBRL(subtotal - discountAmount)}</span>
            {discountAmount > 0 && <span className="text-xs text-gray-500"> (desconto de {formatBRL(discountAmount)})</span>}
          </p>
        )}

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

        <FormField label="Vendido para (opcional)">
          <input
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="Ex: Dona Ana"
            className={inputClass}
          />
        </FormField>

        <FormField label="Observações (opcional)">
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
        </FormField>

        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}
