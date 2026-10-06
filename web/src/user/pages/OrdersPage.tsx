import { useEffect, useState, useCallback, useMemo } from 'react';
import { Pencil, Trash2, ClipboardList, Phone, CalendarClock, MapPin, Plus, X, Wallet, Store, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { userApi, Order, OrderStatus, OrderPayment, OrderPaymentMethod, OrderItem, CreateOrderDTO, Recipe, Client } from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatBRL, formatDate, todayISO } from '../format';
import { Header, EmptyState, FormField, FormActions, inputClass, iconBtn, iconBtnDanger } from './IngredientsPage';
import { parseLocaleNumber } from '../number';
import { maskPhone, isValidPhone } from '../phone';
import { deductStockForItems } from '../stockDeduction';

// Rótulos vêm do i18n (orders:status.* e orders:paymentMethod.*) na renderização.
const STATUS: { value: OrderStatus; cls: string }[] = [
  { value: 'draft', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  { value: 'pending', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'in_progress', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'done', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { value: 'delivered', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'cancelled', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
];
const statusInfo = (s: OrderStatus) => STATUS.find(x => x.value === s) ?? STATUS[0];

const PAYMENT_METHODS: OrderPaymentMethod[] = ['pix', 'cash', 'credit', 'debit'];
const paymentMethodLabel = (t: TFunction, m: string) =>
  (PAYMENT_METHODS as string[]).includes(m) ? t(`orders:paymentMethod.${m}`) : m;

const toCents = (v: number) => Math.round(v * 100);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Itens da encomenda (encomendas antigas de item único viram uma lista de 1). */
function orderItems(o: Order): OrderItem[] {
  if (o.items && o.items.length > 0) return o.items;
  return [{ recipeId: o.recipeId, recipeName: o.recipeName, quantity: o.quantity, unitPrice: o.unitPrice }];
}

/** Pagamentos registrados (migra o antigo paidAmount sem lista, igual ao app). */
function orderPayments(o: Order): OrderPayment[] {
  if (o.payments && o.payments.length > 0) return o.payments;
  return o.paidAmount > 0 ? [{ id: 'migrated', amount: o.paidAmount, method: 'cash', date: o.createdAt.slice(0, 10) }] : [];
}

const whatsappUrl = (phone: string, message: string) => {
  const digits = phone.replace(/\D/g, '');
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
};

type SourceFilter = 'all' | 'online' | 'manual';

export function OrdersPage({ toast }: { toast: ToastFn }) {
  const { t } = useTranslation('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, r, c] = await Promise.all([
        userApi.listOrders(),
        userApi.listRecipes(),
        userApi.listClients().catch(() => [] as Client[]),
      ]);
      setOrders(o);
      setRecipes(r);
      setClients(c);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  /** Baixa de estoque da entrega — best-effort, nunca bloqueia o fluxo (igual ao app). */
  const deductForDelivery = async (o: Order) => {
    const low = await deductStockForItems(
      orderItems(o).map(i => ({ recipeId: i.recipeId, recipeName: i.recipeName, quantity: i.quantity })),
      'Encomenda',
    );
    if (low.length > 0) toast.warning(t('lowStock', { items: low.join(', ') }));
  };

  const changeStatus = async (o: Order, status: OrderStatus) => {
    try {
      const updated = await userApi.updateOrder(o.id, { status });
      setOrders(prev => prev.map(x => (x.id === o.id ? { ...x, status } : x)));
      if (status === 'delivered' && o.status !== 'delivered') await deductForDelivery(o);
      if (updated?.saleRegistered) toast.success(t('deliveredSaleRegistered'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await userApi.deleteOrder(confirmId);
      toast.success(t('deleted'));
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onlineCount = orders.filter(o => o.source === 'online').length;
  const visible = orders.filter(o =>
    sourceFilter === 'all' ? true : sourceFilter === 'online' ? o.source === 'online' : o.source !== 'online'
  );
  const pending = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'draft').length;

  return (
    <div>
      <Header
        title={t('title')}
        subtitle={t('subtitle', { total: orders.length, open: pending })}
        onAdd={() => setCreating(true)}
        addLabel={t('newOrder')}
      />

      {orders.length > 0 && (
        <div className="flex gap-1 mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 w-fit">
          {([
            ['all', t('filter.all')],
            ['online', `${t('filter.online')}${onlineCount ? ` (${onlineCount})` : ''}`],
            ['manual', t('filter.manual')],
          ] as [SourceFilter, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setSourceFilter(v)}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                sourceFilter === v ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={5} cols={3} />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          text={orders.length === 0 ? t('emptyAll') : t('emptyFilter')}
        />
      ) : (
        <div className="space-y-3">
          {visible.map(o => {
            const si = statusInfo(o.status);
            const items = orderItems(o);
            const paidTotal = orderPayments(o).reduce((s, p) => s + p.amount, 0);
            const remaining = Math.max(o.totalPrice - paidTotal, 0);
            const fullyPaid = o.paid || (o.totalPrice > 0 && toCents(paidTotal) >= toCents(o.totalPrice));
            return (
              <div key={o.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {o.orderNumber ? <span className="text-gray-400 font-normal">#{o.orderNumber} </span> : null}
                        {o.clientName}
                      </p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${si.cls}`}>{t(`status.${si.value}`)}</span>
                      {o.source === 'online' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                          <Store size={11} /> {t('onlineBadge')}
                        </span>
                      )}
                      {fullyPaid ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          {t('paidBadge')}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                          {paidTotal > 0 ? t('remainingBadge', { amount: formatBRL(remaining) }) : t('toReceive')}
                        </span>
                      )}
                    </div>

                    <ul className="mt-1 space-y-0.5">
                      {items.map((it, idx) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-300">
                          {it.quantity}× {it.recipeName} · {formatBRL(it.unitPrice)}
                          {it.discount ? <span className="text-green-600"> (−{formatBRL(it.discount)})</span> : null}
                          {it.addons && it.addons.length > 0 && (
                            <span className="text-gray-400"> + {it.addons.map(a => a.name).join(', ')}</span>
                          )}
                        </li>
                      ))}
                    </ul>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('totalLine', { amount: formatBRL(o.totalPrice) })}
                      {paidTotal > 0 && !fullyPaid ? ` · ${t('paidLine', { amount: formatBRL(paidTotal) })}` : ''}
                      {o.paymentMethod
                        ? ` · ${paymentMethodLabel(t, o.paymentMethod)}${o.paymentMethod === 'cash' && o.changeFor ? ` (${t('changeForLine', { amount: formatBRL(o.changeFor) })})` : ''}`
                        : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <CalendarClock size={12} /> {formatDate(o.deliveryDate)}
                      {o.deliveryTime ? ` ${t('atTime', { time: o.deliveryTime })}` : ''}
                      {o.clientPhone ? (
                        <>
                          <Phone size={12} className="ml-2" /> {o.clientPhone}
                        </>
                      ) : null}
                    </p>
                    {o.deliveryAddress && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-start gap-1.5">
                        <MapPin size={12} className="mt-0.5 shrink-0" /> {o.deliveryAddress}
                      </p>
                    )}
                    {o.notes && <p className="text-xs text-gray-400 mt-1 italic">{o.notes}</p>}
                  </div>
                  <button onClick={() => setEditing(o)} className={iconBtn} title={t('edit')}>
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setConfirmId(o.id)} className={iconBtnDanger} title={t('delete')}>
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
                        {t(`status.${s.value}`)}
                      </option>
                    ))}
                  </select>
                  {!fullyPaid && (
                    <button
                      onClick={() => setPaying(o)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Wallet size={14} /> {t('addPayment')}
                    </button>
                  )}
                  {o.clientPhone && (
                    <a
                      href={whatsappUrl(o.clientPhone, t('whatsappMessage', { name: o.clientName.split(' ')[0] }))}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
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
          clients={clients}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async (saved, prevStatus) => {
            setCreating(false);
            setEditing(null);
            if (saved.status === 'delivered' && prevStatus !== 'delivered') await deductForDelivery(saved);
            load();
          }}
          toast={toast}
        />
      )}

      {paying && (
        <PaymentModal
          order={paying}
          toast={toast}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            load();
          }}
        />
      )}

      <ConfirmModal
        open={!!confirmId}
        title={t('deleteTitle')}
        message={t('deleteMessage')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

/** Registra um pagamento (parcial ou o restante) numa encomenda. */
function PaymentModal({ order, toast, onClose, onSaved }: { order: Order; toast: ToastFn; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation('orders');
  const current = orderPayments(order);
  const paidTotal = current.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(order.totalPrice - paidTotal, 0);
  const [amount, setAmount] = useState(remaining > 0 ? remaining.toFixed(2).replace('.', ',') : '');
  const [method, setMethod] = useState<OrderPaymentMethod>(order.paymentMethod ?? 'pix');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseLocaleNumber(amount);
    if (value <= 0) return toast.error(t('payment.enterAmount'));
    setSaving(true);
    try {
      const payments = [...current, { id: newId(), amount: value, method, date }];
      const total = payments.reduce((s, p) => s + p.amount, 0);
      await userApi.updateOrder(order.id, {
        payments,
        paidAmount: total,
        paid: order.totalPrice > 0 && toCents(total) >= toCents(order.totalPrice),
      });
      toast.success(t('payment.registered'));
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
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('addPayment')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('payment.summary', { name: order.clientName, total: formatBRL(order.totalPrice), paid: formatBRL(paidTotal), remaining: formatBRL(remaining) })}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('payment.amount')}>
            <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} autoFocus />
          </FormField>
          <FormField label={t('payment.date')}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </FormField>
        </div>
        <FormField label={t('payment.method')}>
          <select value={method} onChange={e => setMethod(e.target.value as OrderPaymentMethod)} className={inputClass}>
            {PAYMENT_METHODS.map(m => (
              <option key={m} value={m}>{paymentMethodLabel(t, m)}</option>
            ))}
          </select>
        </FormField>
        <FormActions saving={saving} onClose={onClose} saveLabel={t('payment.register')} />
      </form>
    </ModalOverlay>
  );
}

type DiscountType = 'fixed' | 'percent';
interface ItemDraft {
  key: string;
  recipeId: string;
  recipeName: string;
  quantity: string;
  unitPrice: string;
  discountType: DiscountType;
  discountValue: string;
  addons?: { name: string; price: number }[];
}

const fmtInput = (n: number) => (n ? String(n).replace('.', ',') : '');

function itemDiscount(it: ItemDraft): number {
  const subtotal = parseLocaleNumber(it.quantity) * parseLocaleNumber(it.unitPrice);
  const v = parseLocaleNumber(it.discountValue);
  if (!v) return 0;
  const amount = it.discountType === 'percent' ? (subtotal * v) / 100 : v;
  return Math.max(0, Math.min(amount, subtotal));
}

const emptyItem = (): ItemDraft => ({
  key: newId(), recipeId: '', recipeName: '', quantity: '1', unitPrice: '', discountType: 'fixed', discountValue: '',
});

function OrderForm({
  initial,
  recipes,
  clients,
  onClose,
  onSaved,
  toast,
}: {
  initial: Order | null;
  recipes: Recipe[];
  clients: Client[];
  onClose: () => void;
  onSaved: (saved: Order, prevStatus: OrderStatus | null) => void;
  toast: ToastFn;
}) {
  const { t } = useTranslation('orders');
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [clientPhone, setClientPhone] = useState(maskPhone(initial?.clientPhone ?? ''));
  const [items, setItems] = useState<ItemDraft[]>(() =>
    initial
      ? orderItems(initial).map(i => ({
          key: newId(),
          recipeId: i.recipeId ?? '',
          recipeName: i.recipeName,
          quantity: String(i.quantity),
          unitPrice: fmtInput(i.unitPrice),
          discountType: 'fixed' as DiscountType,
          discountValue: fmtInput(i.discount ?? 0),
          addons: i.addons,
        }))
      : [emptyItem()]
  );
  const [payments, setPayments] = useState<OrderPayment[]>(initial ? orderPayments(initial) : []);
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod | ''>(initial?.paymentMethod ?? '');
  const [changeFor, setChangeFor] = useState(fmtInput(initial?.changeFor ?? 0));
  const [deliveryDate, setDeliveryDate] = useState(initial ? (initial.deliveryDate?.slice(0, 10) ?? '') : todayISO());
  const [deliveryTime, setDeliveryTime] = useState(initial?.deliveryTime ?? '');
  const [status, setStatus] = useState<OrderStatus>(initial?.status ?? 'pending');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [newPay, setNewPay] = useState({ amount: '', method: 'pix' as OrderPaymentMethod, date: todayISO() });

  const totalPrice = items.reduce(
    (s, i) => s + parseLocaleNumber(i.quantity) * parseLocaleNumber(i.unitPrice) - itemDiscount(i),
    0
  );
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(totalPrice - totalPaid, 0);

  // Sugestões de cliente do cadastro (por nome ou telefone).
  const clientSuggestions = useMemo(() => {
    const q = clientName.trim().toLowerCase();
    if (q.length < 2) return [];
    return clients
      .filter(c => c.name.toLowerCase().includes(q) && c.name.toLowerCase() !== q)
      .slice(0, 5);
  }, [clientName, clients]);

  const patchItem = (key: string, patch: Partial<ItemDraft>) =>
    setItems(prev => prev.map(it => (it.key === key ? { ...it, ...patch } : it)));

  const pickRecipe = (key: string, value: string) => {
    if (value === '__free__') return patchItem(key, { recipeId: '' });
    const r = recipes.find(x => x.id === value);
    patchItem(key, { recipeId: value, recipeName: r?.name ?? '' });
  };

  const addPayment = () => {
    const amount = parseLocaleNumber(newPay.amount);
    if (amount <= 0) return toast.error(t('form.enterPaymentAmount'));
    setPayments(prev => [...prev, { id: newId(), amount, method: newPay.method, date: newPay.date }]);
    setNewPay(p => ({ ...p, amount: '' }));
  };

  // asDraft: salva como rascunho — encomenda incompleta para terminar depois.
  // Exige só o cliente; produto e data de entrega ficam opcionais.
  const save = async (asDraft: boolean) => {
    if (!clientName.trim()) return toast.error(t('form.enterClient'));
    if (clientPhone.trim() && !isValidPhone(clientPhone)) return toast.error(t('form.invalidPhone'));
    const filled = items.filter(i => i.recipeName.trim());
    if (!asDraft) {
      if (filled.length === 0) return toast.error(t('form.addProduct'));
      if (!deliveryDate) return toast.error(t('form.enterDeliveryDate'));
    }

    const outItems: OrderItem[] = filled.map(i => ({
      recipeId: i.recipeId || undefined,
      recipeName: i.recipeName.trim(),
      quantity: parseLocaleNumber(i.quantity) || 1,
      unitPrice: parseLocaleNumber(i.unitPrice),
      discount: itemDiscount(i),
      ...(i.addons && i.addons.length > 0 ? { addons: i.addons } : {}),
    }));
    const first = outItems[0];
    const finalStatus = asDraft ? 'draft' : status;
    const data: CreateOrderDTO = {
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      // Campos de topo espelham o 1º item (compatibilidade com encomendas antigas).
      recipeId: first?.recipeId || null,
      recipeName: first?.recipeName ?? '',
      quantity: first?.quantity || 1,
      unitPrice: first?.unitPrice ?? 0,
      totalPrice,
      items: outItems,
      deliveryDate: deliveryDate || null,
      deliveryTime: deliveryTime || undefined,
      status: finalStatus,
      paid: totalPrice > 0 && toCents(totalPaid) >= toCents(totalPrice),
      paidAmount: totalPaid,
      payments,
      paymentMethod: paymentMethod || null,
      changeFor: paymentMethod === 'cash' && parseLocaleNumber(changeFor) > 0 ? parseLocaleNumber(changeFor) : null,
      notes: notes.trim() || undefined,
    };

    setSaving(true);
    try {
      let saved: Order;
      if (initial) {
        saved = await userApi.updateOrder(initial.id, data);
        toast.success(saved?.saleRegistered ? t('form.savedSaleRegistered') : asDraft ? t('form.draftSaved') : t('form.updated'));
      } else {
        saved = await userApi.createOrder(data);
        toast.success(saved?.saleRegistered ? t('form.savedSaleRegistered') : asDraft ? t('form.draftSaved') : t('form.created'));
      }
      onSaved(saved ?? ({ ...(initial as Order), ...data } as Order), initial?.status ?? null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void save(false);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
          {initial ? t('form.editTitle') : t('newOrder')}
        </h3>

        {/* Cliente */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('form.client')}>
            <div className="relative">
              <input value={clientName} onChange={e => setClientName(e.target.value)} className={inputClass} autoFocus />
              {clientSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  {clientSuggestions.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setClientName(c.name);
                        if (c.phone) setClientPhone(maskPhone(c.phone));
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <span className="text-gray-900 dark:text-white">{c.name}</span>
                      {c.phone && <span className="text-xs text-gray-400 ml-2">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>
          <FormField label={t('form.phone')}>
            <input value={clientPhone ?? ''} onChange={e => setClientPhone(maskPhone(e.target.value))} className={inputClass} />
          </FormField>
        </div>

        {/* Itens */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{t('form.products')}</p>
          <div className="space-y-2">
            {items.map(it => (
              <div key={it.key} className="rounded-xl bg-gray-50 dark:bg-gray-700/40 p-3 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    {recipes.length > 0 && (
                      <select value={it.recipeId || '__free__'} onChange={e => pickRecipe(it.key, e.target.value)} className={inputClass}>
                        <option value="__free__">{t('form.otherProduct')}</option>
                        {recipes.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                    {(!it.recipeId || recipes.length === 0) && (
                      <input
                        value={it.recipeName}
                        onChange={e => patchItem(it.key, { recipeName: e.target.value })}
                        placeholder={t('form.productPlaceholder')}
                        className={inputClass + (recipes.length > 0 ? ' mt-2' : '')}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() => setItems(prev => prev.filter(x => x.key !== it.key))}
                    className="h-10 px-1 text-red-500 disabled:opacity-30"
                    title={t('form.removeProduct')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <FormField label={t('form.qty')}>
                    <input type="text" inputMode="decimal" value={it.quantity} onChange={e => patchItem(it.key, { quantity: e.target.value })} className={inputClass} />
                  </FormField>
                  <FormField label={t('form.unitPrice')}>
                    <input type="text" inputMode="decimal" value={it.unitPrice} onChange={e => patchItem(it.key, { unitPrice: e.target.value })} className={inputClass} />
                  </FormField>
                  <FormField label={t('form.discount')}>
                    <div className="flex">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={it.discountValue}
                        onChange={e => patchItem(it.key, { discountValue: e.target.value })}
                        placeholder="0"
                        className={inputClass + ' rounded-r-none'}
                      />
                      <button
                        type="button"
                        onClick={() => patchItem(it.key, { discountType: it.discountType === 'fixed' ? 'percent' : 'fixed' })}
                        className="px-2 text-xs font-semibold border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg text-gray-600 dark:text-gray-300"
                        title={t('form.toggleDiscount')}
                      >
                        {it.discountType === 'fixed' ? 'R$' : '%'}
                      </button>
                    </div>
                  </FormField>
                </div>
                {it.addons && it.addons.length > 0 && (
                  <p className="text-xs text-gray-500">{t('form.addons', { items: it.addons.map(a => a.name).join(', ') })}</p>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setItems(prev => [...prev, emptyItem()])}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <Plus size={15} /> {t('form.addProductButton')}
          </button>
        </div>

        <div className="bg-primary-50 dark:bg-primary-900/30 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-sm text-primary-700 dark:text-primary-300">{t('form.total')}</span>
          <span className="text-lg font-bold text-primary-700 dark:text-primary-200">{formatBRL(totalPrice)}</span>
        </div>

        {/* Entrega */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('form.deliveryDate')}>
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label={t('form.deliveryTime')}>
            <input type="time" value={deliveryTime ?? ''} onChange={e => setDeliveryTime(e.target.value)} className={inputClass} />
          </FormField>
        </div>
        {initial?.deliveryAddress && (
          <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 px-3 py-2 text-sm text-sky-800 dark:text-sky-200 flex items-start gap-2">
            <MapPin size={15} className="mt-0.5 shrink-0" />
            <span><span className="font-semibold">{t('form.deliveryAddress')}</span> {initial.deliveryAddress}</span>
          </div>
        )}

        {/* Pagamento */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('form.agreedMethod')}>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as OrderPaymentMethod | '')} className={inputClass}>
              <option value="">{t('form.notInformed')}</option>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{paymentMethodLabel(t, m)}</option>
              ))}
            </select>
          </FormField>
          {paymentMethod === 'cash' && (
            <FormField label={t('form.changeFor')}>
              <input type="text" inputMode="decimal" value={changeFor} onChange={e => setChangeFor(e.target.value)} placeholder="0,00" className={inputClass} />
            </FormField>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('form.paymentsReceived')}</p>
            <p className="text-xs text-gray-500">
              {t('form.paidSummary', { amount: formatBRL(totalPaid) })} · {remaining > 0 ? t('form.remaining', { amount: formatBRL(remaining) }) : t('form.settled')}
            </p>
          </div>
          {payments.map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                {formatBRL(p.amount)} · {paymentMethodLabel(t, p.method)} · {formatDate(p.date)}
              </span>
              <button type="button" onClick={() => setPayments(prev => prev.filter(x => x.id !== p.id))} className="text-gray-400 hover:text-red-500" title={t('form.remove')}>
                <X size={15} />
              </button>
            </div>
          ))}
          <div className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              inputMode="decimal"
              value={newPay.amount}
              onChange={e => setNewPay(p => ({ ...p, amount: e.target.value }))}
              placeholder={remaining > 0 ? remaining.toFixed(2).replace('.', ',') : t('form.amountPlaceholder')}
              className={inputClass + ' col-span-4'}
            />
            <select value={newPay.method} onChange={e => setNewPay(p => ({ ...p, method: e.target.value as OrderPaymentMethod }))} className={inputClass + ' col-span-3'}>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{paymentMethodLabel(t, m)}</option>
              ))}
            </select>
            <input type="date" value={newPay.date} onChange={e => setNewPay(p => ({ ...p, date: e.target.value }))} className={inputClass + ' col-span-3'} />
            <button
              type="button"
              onClick={addPayment}
              className="col-span-2 h-10 rounded-lg bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center"
              title={t('addPayment')}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <FormField label={t('form.status')}>
          <select value={status} onChange={e => setStatus(e.target.value as OrderStatus)} className={inputClass}>
            {STATUS.map(s => (
              <option key={s.value} value={s.value}>
                {t(`status.${s.value}`)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t('form.notes')}>
          <input value={notes ?? ''} onChange={e => setNotes(e.target.value)} className={inputClass} />
        </FormField>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => void save(true)}
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {t('form.saveDraft')}
          </button>
          <FormActions saving={saving} onClose={onClose} />
        </div>
      </form>
    </ModalOverlay>
  );
}
