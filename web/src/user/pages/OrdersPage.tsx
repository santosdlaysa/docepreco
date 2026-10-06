import { useEffect, useState, useCallback, useMemo } from 'react';
import { Pencil, Trash2, ClipboardList, Phone, CalendarClock, MapPin, Plus, X, Wallet, Store, MessageCircle } from 'lucide-react';
import { userApi, Order, OrderStatus, OrderPayment, OrderPaymentMethod, OrderItem, CreateOrderDTO, Recipe, Client } from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatBRL, formatDate, todayISO } from '../format';
import { Header, EmptyState, FormField, FormActions, inputClass, iconBtn, iconBtnDanger } from './IngredientsPage';
import { parseLocaleNumber } from '../number';
import { maskPhone, isValidPhone } from '../phone';
import { deductStockForItems } from '../stockDeduction';

const STATUS: { value: OrderStatus; label: string; cls: string }[] = [
  { value: 'draft', label: 'Rascunho', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  { value: 'pending', label: 'Pendente', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'in_progress', label: 'Em produção', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'done', label: 'Pronto', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { value: 'delivered', label: 'Entregue', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'cancelled', label: 'Cancelado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
];
const statusInfo = (s: OrderStatus) => STATUS.find(x => x.value === s) ?? STATUS[0];

const PAYMENT_METHODS: { value: OrderPaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit', label: 'Crédito' },
  { value: 'debit', label: 'Débito' },
];
const PAYMENT_METHOD_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map(m => [m.value, m.label]));

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

const whatsappUrl = (phone: string, name: string) => {
  const digits = phone.replace(/\D/g, '');
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(`Olá, ${name.split(' ')[0]}! Sobre a sua encomenda:`)}`;
};

type SourceFilter = 'all' | 'online' | 'manual';

export function OrdersPage({ toast }: { toast: ToastFn }) {
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
    if (low.length > 0) toast.warning(`Estoque baixo: ${low.join(', ')}`);
  };

  const changeStatus = async (o: Order, status: OrderStatus) => {
    try {
      const updated = await userApi.updateOrder(o.id, { status });
      setOrders(prev => prev.map(x => (x.id === o.id ? { ...x, status } : x)));
      if (status === 'delivered' && o.status !== 'delivered') await deductForDelivery(o);
      if (updated?.saleRegistered) toast.success('Encomenda entregue — venda registrada automaticamente.');
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

  const onlineCount = orders.filter(o => o.source === 'online').length;
  const visible = orders.filter(o =>
    sourceFilter === 'all' ? true : sourceFilter === 'online' ? o.source === 'online' : o.source !== 'online'
  );
  const pending = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'draft').length;

  return (
    <div>
      <Header
        title="Encomendas"
        subtitle={`${orders.length} no total · ${pending} em aberto`}
        onAdd={() => setCreating(true)}
        addLabel="Nova encomenda"
      />

      {orders.length > 0 && (
        <div className="flex gap-1 mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 w-fit">
          {([
            ['all', 'Todas'],
            ['online', `Loja online${onlineCount ? ` (${onlineCount})` : ''}`],
            ['manual', 'Manuais'],
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
          text={orders.length === 0 ? 'Nenhuma encomenda ainda. Crie a primeira.' : 'Nenhuma encomenda neste filtro.'}
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
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${si.cls}`}>{si.label}</span>
                      {o.source === 'online' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                          <Store size={11} /> Loja online
                        </span>
                      )}
                      {fullyPaid ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          Pago
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                          {paidTotal > 0 ? `Falta ${formatBRL(remaining)}` : 'A receber'}
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
                      Total {formatBRL(o.totalPrice)}
                      {paidTotal > 0 && !fullyPaid ? ` · pago ${formatBRL(paidTotal)}` : ''}
                      {o.paymentMethod
                        ? ` · ${PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod}${o.paymentMethod === 'cash' && o.changeFor ? ` (troco p/ ${formatBRL(o.changeFor)})` : ''}`
                        : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <CalendarClock size={12} /> {formatDate(o.deliveryDate)}
                      {o.deliveryTime ? ` às ${o.deliveryTime}` : ''}
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
                  <button onClick={() => setEditing(o)} className={iconBtn} title="Editar">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setConfirmId(o.id)} className={iconBtnDanger} title="Excluir">
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
                  {!fullyPaid && (
                    <button
                      onClick={() => setPaying(o)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Wallet size={14} /> Adicionar pagamento
                    </button>
                  )}
                  {o.clientPhone && (
                    <a
                      href={whatsappUrl(o.clientPhone, o.clientName)}
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
        title="Excluir encomenda"
        message="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

/** Registra um pagamento (parcial ou o restante) numa encomenda. */
function PaymentModal({ order, toast, onClose, onSaved }: { order: Order; toast: ToastFn; onClose: () => void; onSaved: () => void }) {
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
    if (value <= 0) return toast.error('Informe o valor recebido.');
    setSaving(true);
    try {
      const payments = [...current, { id: newId(), amount: value, method, date }];
      const total = payments.reduce((s, p) => s + p.amount, 0);
      await userApi.updateOrder(order.id, {
        payments,
        paidAmount: total,
        paid: order.totalPrice > 0 && toCents(total) >= toCents(order.totalPrice),
      });
      toast.success('Pagamento registrado.');
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
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Adicionar pagamento</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {order.clientName} · total {formatBRL(order.totalPrice)} · pago {formatBRL(paidTotal)} · falta {formatBRL(remaining)}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Valor (R$)">
            <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} autoFocus />
          </FormField>
          <FormField label="Data">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </FormField>
        </div>
        <FormField label="Forma de pagamento">
          <select value={method} onChange={e => setMethod(e.target.value as OrderPaymentMethod)} className={inputClass}>
            {PAYMENT_METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </FormField>
        <FormActions saving={saving} onClose={onClose} saveLabel="Registrar" />
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
    if (amount <= 0) return toast.error('Informe o valor do pagamento.');
    setPayments(prev => [...prev, { id: newId(), amount, method: newPay.method, date: newPay.date }]);
    setNewPay(p => ({ ...p, amount: '' }));
  };

  // asDraft: salva como rascunho — encomenda incompleta para terminar depois.
  // Exige só o cliente; produto e data de entrega ficam opcionais.
  const save = async (asDraft: boolean) => {
    if (!clientName.trim()) return toast.error('Informe o nome do cliente.');
    if (clientPhone.trim() && !isValidPhone(clientPhone)) return toast.error('Telefone incompleto. Use DDD + número.');
    const filled = items.filter(i => i.recipeName.trim());
    if (!asDraft) {
      if (filled.length === 0) return toast.error('Adicione pelo menos um produto.');
      if (!deliveryDate) return toast.error('Informe a data de entrega.');
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
        toast.success(saved?.saleRegistered ? 'Encomenda salva · venda registrada!' : asDraft ? 'Rascunho salvo.' : 'Encomenda atualizada.');
      } else {
        saved = await userApi.createOrder(data);
        toast.success(saved?.saleRegistered ? 'Encomenda salva · venda registrada!' : asDraft ? 'Rascunho salvo.' : 'Encomenda criada.');
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
          {initial ? 'Editar encomenda' : 'Nova encomenda'}
        </h3>

        {/* Cliente */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Cliente">
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
          <FormField label="Telefone (opcional)">
            <input value={clientPhone ?? ''} onChange={e => setClientPhone(maskPhone(e.target.value))} className={inputClass} />
          </FormField>
        </div>

        {/* Itens */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Produtos</p>
          <div className="space-y-2">
            {items.map(it => (
              <div key={it.key} className="rounded-xl bg-gray-50 dark:bg-gray-700/40 p-3 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    {recipes.length > 0 && (
                      <select value={it.recipeId || '__free__'} onChange={e => pickRecipe(it.key, e.target.value)} className={inputClass}>
                        <option value="__free__">Outro (digitar)</option>
                        {recipes.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                    {(!it.recipeId || recipes.length === 0) && (
                      <input
                        value={it.recipeName}
                        onChange={e => patchItem(it.key, { recipeName: e.target.value })}
                        placeholder="Ex.: Bolo de Chocolate"
                        className={inputClass + (recipes.length > 0 ? ' mt-2' : '')}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() => setItems(prev => prev.filter(x => x.key !== it.key))}
                    className="h-10 px-1 text-red-500 disabled:opacity-30"
                    title="Remover produto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <FormField label="Qtd.">
                    <input type="text" inputMode="decimal" value={it.quantity} onChange={e => patchItem(it.key, { quantity: e.target.value })} className={inputClass} />
                  </FormField>
                  <FormField label="Preço un. (R$)">
                    <input type="text" inputMode="decimal" value={it.unitPrice} onChange={e => patchItem(it.key, { unitPrice: e.target.value })} className={inputClass} />
                  </FormField>
                  <FormField label="Desconto">
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
                        title="Alternar entre R$ e %"
                      >
                        {it.discountType === 'fixed' ? 'R$' : '%'}
                      </button>
                    </div>
                  </FormField>
                </div>
                {it.addons && it.addons.length > 0 && (
                  <p className="text-xs text-gray-500">Adicionais: {it.addons.map(a => a.name).join(', ')}</p>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setItems(prev => [...prev, emptyItem()])}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <Plus size={15} /> Adicionar produto
          </button>
        </div>

        <div className="bg-primary-50 dark:bg-primary-900/30 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-sm text-primary-700 dark:text-primary-300">Total</span>
          <span className="text-lg font-bold text-primary-700 dark:text-primary-200">{formatBRL(totalPrice)}</span>
        </div>

        {/* Entrega */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Data de entrega">
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Horário (opcional)">
            <input type="time" value={deliveryTime ?? ''} onChange={e => setDeliveryTime(e.target.value)} className={inputClass} />
          </FormField>
        </div>
        {initial?.deliveryAddress && (
          <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 px-3 py-2 text-sm text-sky-800 dark:text-sky-200 flex items-start gap-2">
            <MapPin size={15} className="mt-0.5 shrink-0" />
            <span><span className="font-semibold">Endereço de entrega:</span> {initial.deliveryAddress}</span>
          </div>
        )}

        {/* Pagamento */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Forma de pagamento combinada">
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as OrderPaymentMethod | '')} className={inputClass}>
              <option value="">Não informada</option>
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </FormField>
          {paymentMethod === 'cash' && (
            <FormField label="Troco para (R$)">
              <input type="text" inputMode="decimal" value={changeFor} onChange={e => setChangeFor(e.target.value)} placeholder="0,00" className={inputClass} />
            </FormField>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Pagamentos recebidos</p>
            <p className="text-xs text-gray-500">
              Pago {formatBRL(totalPaid)} · {remaining > 0 ? `falta ${formatBRL(remaining)}` : 'quitado'}
            </p>
          </div>
          {payments.map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                {formatBRL(p.amount)} · {PAYMENT_METHOD_LABEL[p.method] ?? p.method} · {formatDate(p.date)}
              </span>
              <button type="button" onClick={() => setPayments(prev => prev.filter(x => x.id !== p.id))} className="text-gray-400 hover:text-red-500" title="Remover">
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
              placeholder={remaining > 0 ? remaining.toFixed(2).replace('.', ',') : 'Valor'}
              className={inputClass + ' col-span-4'}
            />
            <select value={newPay.method} onChange={e => setNewPay(p => ({ ...p, method: e.target.value as OrderPaymentMethod }))} className={inputClass + ' col-span-3'}>
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <input type="date" value={newPay.date} onChange={e => setNewPay(p => ({ ...p, date: e.target.value }))} className={inputClass + ' col-span-3'} />
            <button
              type="button"
              onClick={addPayment}
              className="col-span-2 h-10 rounded-lg bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center"
              title="Adicionar pagamento"
            >
              <Plus size={16} />
            </button>
          </div>
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

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => void save(true)}
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Salvar como rascunho
          </button>
          <FormActions saving={saving} onClose={onClose} />
        </div>
      </form>
    </ModalOverlay>
  );
}
