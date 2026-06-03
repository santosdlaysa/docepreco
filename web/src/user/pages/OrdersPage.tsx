import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, ClipboardList, Phone, CalendarClock, CheckCircle2, Circle } from 'lucide-react';
import { userApi, Order, OrderStatus, CreateOrderDTO, Recipe } from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatBRL, formatDate, todayISO } from '../format';
import { Header, EmptyState, FormField, FormActions, inputClass, iconBtn, iconBtnDanger } from './IngredientsPage';

const STATUS: { value: OrderStatus; label: string; cls: string }[] = [
  { value: 'pending', label: 'Pendente', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'in_progress', label: 'Em produção', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'done', label: 'Pronto', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { value: 'delivered', label: 'Entregue', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'cancelled', label: 'Cancelado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
];
const statusInfo = (s: OrderStatus) => STATUS.find(x => x.value === s) ?? STATUS[0];

export function OrdersPage({ toast }: { toast: ToastFn }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, r] = await Promise.all([userApi.listOrders(), userApi.listRecipes()]);
      setOrders(o);
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

  const changeStatus = async (o: Order, status: OrderStatus) => {
    try {
      await userApi.updateOrder(o.id, { status });
      setOrders(prev => prev.map(x => (x.id === o.id ? { ...x, status } : x)));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const togglePaid = async (o: Order) => {
    const paid = !o.paid;
    try {
      await userApi.updateOrder(o.id, { paid, paidAmount: paid ? o.totalPrice : 0 });
      setOrders(prev => prev.map(x => (x.id === o.id ? { ...x, paid, paidAmount: paid ? o.totalPrice : 0 } : x)));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await userApi.deleteOrder(confirmId);
      toast.success('Encomenda excluída.');
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const pending = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;

  return (
    <div>
      <Header
        title="Encomendas"
        subtitle={`${orders.length} no total · ${pending} em aberto`}
        onAdd={() => setCreating(true)}
        addLabel="Nova encomenda"
      />

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={5} cols={3} />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={ClipboardList} text="Nenhuma encomenda ainda. Crie a primeira." />
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const si = statusInfo(o.status);
            return (
              <div key={o.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{o.clientName}</p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${si.cls}`}>{si.label}</span>
                      {o.paid ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          Pago
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                          A receber
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {o.recipeName} · {o.quantity}× · {formatBRL(o.totalPrice)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                      <CalendarClock size={12} /> {formatDate(o.deliveryDate)}
                      {o.deliveryTime ? ` às ${o.deliveryTime}` : ''}
                      {o.clientPhone ? (
                        <>
                          <Phone size={12} className="ml-2" /> {o.clientPhone}
                        </>
                      ) : null}
                    </p>
                    {o.notes && <p className="text-xs text-gray-400 mt-1 italic">{o.notes}</p>}
                  </div>
                  <button onClick={() => setEditing(o)} className={iconBtn}>
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setConfirmId(o.id)} className={iconBtnDanger}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <select
                    value={o.status}
                    onChange={e => changeStatus(o, e.target.value as OrderStatus)}
                    className={inputClass + ' !w-auto text-xs py-1.5'}
                  >
                    {STATUS.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => togglePaid(o)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      o.paid
                        ? 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {o.paid ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {o.paid ? 'Pago' : 'Marcar pago'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <OrderForm
          initial={editing}
          recipes={recipes}
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
        title="Excluir encomenda"
        message="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function OrderForm({
  initial,
  recipes,
  onClose,
  onSaved,
  toast,
}: {
  initial: Order | null;
  recipes: Recipe[];
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? '');
  const [recipeId, setRecipeId] = useState(initial?.recipeId ?? '');
  const [recipeName, setRecipeName] = useState(initial?.recipeName ?? '');
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? '1'));
  const [unitPrice, setUnitPrice] = useState(String(initial?.unitPrice ?? ''));
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate?.slice(0, 10) ?? todayISO());
  const [deliveryTime, setDeliveryTime] = useState(initial?.deliveryTime ?? '');
  const [status, setStatus] = useState<OrderStatus>(initial?.status ?? 'pending');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const qtyN = parseFloat(quantity.replace(',', '.')) || 0;
  const priceN = parseFloat(unitPrice.replace(',', '.')) || 0;
  const totalPrice = qtyN * priceN;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return toast.error('Informe o nome do cliente.');
    if (!recipeName.trim()) return toast.error('Informe o produto / receita.');

    setSaving(true);
    const data: CreateOrderDTO = {
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      recipeId: recipeId || null,
      recipeName: recipeName.trim(),
      quantity: qtyN || 1,
      unitPrice: priceN,
      totalPrice,
      deliveryDate,
      deliveryTime: deliveryTime || undefined,
      status,
      notes: notes.trim() || undefined,
    };
    try {
      if (initial) {
        await userApi.updateOrder(initial.id, data);
        toast.success('Encomenda atualizada.');
      } else {
        await userApi.createOrder(data);
        toast.success('Encomenda criada.');
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
          {initial ? 'Editar encomenda' : 'Nova encomenda'}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Cliente">
            <input value={clientName} onChange={e => setClientName(e.target.value)} className={inputClass} autoFocus />
          </FormField>
          <FormField label="Telefone (opcional)">
            <input value={clientPhone ?? ''} onChange={e => setClientPhone(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Produto / receita">
          {recipes.length > 0 ? (
            <select
              value={recipeId || '__free__'}
              onChange={e => {
                if (e.target.value === '__free__') {
                  setRecipeId('');
                } else {
                  const r = recipes.find(x => x.id === e.target.value);
                  setRecipeId(e.target.value);
                  if (r) setRecipeName(r.name);
                }
              }}
              className={inputClass}
            >
              <option value="__free__">Outro (digitar)</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : null}
          {(!recipeId || recipes.length === 0) && (
            <input
              value={recipeName}
              onChange={e => setRecipeName(e.target.value)}
              placeholder="Ex.: Bolo de Chocolate"
              className={inputClass + ' mt-2'}
            />
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quantidade">
            <input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Preço unitário (R$)">
            <input type="number" step="any" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <div className="bg-primary-50 dark:bg-primary-900/30 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-sm text-primary-700 dark:text-primary-300">Total</span>
          <span className="text-lg font-bold text-primary-700 dark:text-primary-200">{formatBRL(totalPrice)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Data de entrega">
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Horário (opcional)">
            <input type="time" value={deliveryTime ?? ''} onChange={e => setDeliveryTime(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Situação">
          <select value={status} onChange={e => setStatus(e.target.value as OrderStatus)} className={inputClass}>
            {STATUS.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Observações (opcional)">
          <input value={notes ?? ''} onChange={e => setNotes(e.target.value)} className={inputClass} />
        </FormField>

        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}
