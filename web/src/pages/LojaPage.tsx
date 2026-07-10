import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fmt, initials } from '../utils/format';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  price: number;
  originalPrice?: number;
}
interface StoreData {
  storeName: string;
  slug: string;
  description: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue: number | null;
  phone: string | null;
  instagramHandle: string | null;
  deliveryFee: number | null;
  coverImageUrl: string | null;
  paymentMethods: string[];
  address: string | null;
  products: StoreProduct[];
}

const PAYMENT_METHODS: Array<{ key: string; label: string; emoji: string }> = [
  { key: 'pix', label: 'Pix', emoji: '💠' },
  { key: 'cash', label: 'Dinheiro', emoji: '💵' },
  { key: 'credit', label: 'Crédito', emoji: '💳' },
  { key: 'debit', label: 'Débito', emoji: '💳' },
];
const PAYMENT_LABEL: Record<string, string> = { pix: 'Pix', cash: 'Dinheiro', credit: 'Crédito', debit: 'Débito' };

function ProductInitial({ name }: { name: string }) {
  const colors = [
    ['#FDDDE6', '#EA4B92'],
    ['#EDE9FE', '#7C3AED'],
    ['#FCE7F3', '#DB2777'],
    ['#FEF3C7', '#D97706'],
    ['#D1FAE5', '#059669'],
  ];
  const idx = name.charCodeAt(0) % colors.length;
  const [bg, fg] = colors[idx];
  return (
    <div
      className="w-full h-full flex items-center justify-center rounded-full text-xl font-black"
      style={{ backgroundColor: bg, color: fg }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}

function ProductRow({
  product,
  qty,
  onAdd,
  onRemove,
}: {
  product: StoreProduct;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
      {/* Foto circular */}
      <div className="relative flex-shrink-0">
        <div className="w-[72px] h-[72px] rounded-full overflow-hidden shadow-md">
          {product.photoUrl ? (
            <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ProductInitial name={product.name} />
          )}
        </div>
        {qty > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#EA4B92] rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow ring-2 ring-white">
            {qty}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-1.5 mb-0.5">
          {product.originalPrice != null && (
            <span className="text-[11px] text-gray-400 line-through">{fmt(product.originalPrice)}</span>
          )}
          <span className="text-xs font-semibold text-[#EA4B92]">{fmt(product.price)}</span>
        </p>
        <p className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-2">
          {product.name}
        </p>
        {product.description && (
          <p className="text-[12px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {qty > 0 && (
          <>
            <button
              onClick={onRemove}
              className="w-8 h-8 rounded-full border-2 border-[#EA4B92] text-[#EA4B92] font-bold text-lg flex items-center justify-center leading-none active:scale-90 transition-transform"
            >
              −
            </button>
            <span className="w-4 text-center text-sm font-bold text-gray-800 tabular-nums">
              {qty}
            </span>
          </>
        )}
        <button
          onClick={onAdd}
          className="w-9 h-9 rounded-full bg-[#EA4B92] text-white font-bold text-xl flex items-center justify-center leading-none shadow-md shadow-pink-200 active:scale-90 transition-transform"
        >
          +
        </button>
      </div>
    </div>
  );
}

interface SavedOrder {
  orderId: string;
  orderNumber?: number | null;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  deliveryFee: number;
  paymentMethod?: string;
  changeFor?: number | null;
  createdAt: string;
}

const CUSTOMER_KEY = (slug: string) => `dpeco_customer_${slug}`;
const ORDERS_KEY   = (slug: string) => `dpeco_orders_${slug}`;

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Aguardando', color: '#D97706', bg: '#FEF3C7' },
  in_progress: { label: 'Em produção', color: '#7C3AED', bg: '#EDE9FE' },
  done:        { label: 'Saiu para entrega', color: '#7C3AED', bg: '#EDE9FE' },
  delivered:   { label: 'Entregue',   color: '#059669', bg: '#D1FAE5' },
  cancelled:   { label: 'Cancelado',  color: '#DC2626', bg: '#FEE2E2' },
};

export function LojaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [step, setStep] = useState<'catalog' | 'checkout' | 'success' | 'history'>('catalog');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('pending');
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  const [historyStatuses, setHistoryStatuses] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    deliveryType: 'pickup' as 'delivery' | 'pickup',
    deliveryAddress: '',
    notes: '',
    paymentMethod: '',
    changeFor: '',
  });
  const prevTotal = useRef(0);
  const [cartVisible, setCartVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: store?.storeName ?? 'Cardápio', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* usuário cancelou o compartilhamento */
    }
  };

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/public/store/${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStore(json.data);
          const defaultType = json.data.acceptsDelivery ? 'delivery' : 'pickup';
          const methods: string[] = json.data.paymentMethods ?? [];
          const defaultPayment = methods.length === 1 ? methods[0] : '';
          try {
            const saved = localStorage.getItem(CUSTOMER_KEY(slug!));
            const customer = saved ? JSON.parse(saved) : null;
            setForm(f => ({ ...f, deliveryType: defaultType, paymentMethod: defaultPayment, clientName: customer?.name ?? '', clientPhone: customer?.phone ?? '', deliveryAddress: customer?.address ?? '' }));
            const orders = JSON.parse(localStorage.getItem(ORDERS_KEY(slug!)) ?? '[]');
            setSavedOrders(orders);
          } catch {
            setForm(f => ({ ...f, deliveryType: defaultType, paymentMethod: defaultPayment }));
          }
        } else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const totalItems = Array.from(cart.values()).reduce((a, b) => a + b, 0);
  const subtotal = store
    ? Array.from(cart.entries()).reduce((acc, [id, qty]) => {
        const p = store.products.find(p => p.id === id);
        return acc + (p ? p.price * qty : 0);
      }, 0)
    : 0;
  const appliedFee =
    form.deliveryType === 'delivery' && store?.deliveryFee ? store.deliveryFee : 0;
  const totalPrice = subtotal + appliedFee;

  useEffect(() => {
    if (totalItems > 0 && prevTotal.current === 0) setCartVisible(true);
    if (totalItems === 0) setCartVisible(false);
    prevTotal.current = totalItems;
  }, [totalItems]);

  // Buscar status de todos os pedidos ao abrir histórico
  useEffect(() => {
    if (step !== 'history' || !slug || savedOrders.length === 0) return;
    savedOrders.forEach(async o => {
      try {
        const r = await fetch(`${API_BASE}/public/store/${slug}/orders/${o.orderId}`);
        const j = await r.json();
        if (j.success) {
          setHistoryStatuses(prev => ({ ...prev, [o.orderId]: j.data.status }));
          // Pedidos salvos antes do número existir ganham o número vindo da API
          if (j.data.orderNumber != null && o.orderNumber !== j.data.orderNumber) {
            setSavedOrders(prev => {
              const updated = prev.map(s => (s.orderId === o.orderId ? { ...s, orderNumber: j.data.orderNumber } : s));
              try { localStorage.setItem(ORDERS_KEY(slug!), JSON.stringify(updated)); } catch {}
              return updated;
            });
          }
        }
      } catch {}
    });
  }, [step, slug, savedOrders]);

  // Polling de status do pedido — deve estar aqui (antes de qualquer return condicional)
  useEffect(() => {
    if (step !== 'success' || !orderId || !slug) return;
    if (orderStatus === 'delivered' || orderStatus === 'cancelled') return;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/public/store/${slug}/orders/${orderId}`);
        const j = await r.json();
        if (j.success) {
          setOrderStatus(j.data.status);
          // Pedidos salvos antes do número existir ganham o número vindo da API
          if (j.data.orderNumber != null) {
            setSavedOrders(prev => {
              const cur = prev.find(o => o.orderId === orderId);
              if (!cur || cur.orderNumber === j.data.orderNumber) return prev;
              const updated = prev.map(o => (o.orderId === orderId ? { ...o, orderNumber: j.data.orderNumber } : o));
              try { localStorage.setItem(ORDERS_KEY(slug!), JSON.stringify(updated)); } catch {}
              return updated;
            });
          }
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 20000);
    return () => clearInterval(id);
  }, [step, orderId, slug, orderStatus]);

  const setQty = (id: string, delta: number) => {
    setCart(prev => {
      const next = new Map(prev);
      const cur = next.get(id) ?? 0;
      const nxt = cur + delta;
      if (nxt <= 0) next.delete(id);
      else next.set(id, nxt);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.clientName.trim()) { setError('Informe seu nome'); return; }
    if (!form.clientPhone.trim()) { setError('Informe seu WhatsApp'); return; }
    if (form.deliveryType === 'delivery' && !form.deliveryAddress.trim()) {
      setError('Informe o endereço de entrega'); return;
    }
    if ((store?.paymentMethods?.length ?? 0) > 0 && !form.paymentMethod) {
      setError('Escolha a forma de pagamento'); return;
    }
    if (store?.minOrderValue && subtotal < store.minOrderValue) {
      setError(`Pedido mínimo de ${fmt(store.minOrderValue)}`); return;
    }
    setError(null);
    setSubmitting(true);
    const changeForNum = form.paymentMethod === 'cash'
      ? parseFloat(form.changeFor.replace(/[^\d,.]/g, '').replace(',', '.'))
      : NaN;
    const changeFor = Number.isFinite(changeForNum) && changeForNum > 0 ? changeForNum : undefined;
    try {
      const items = Array.from(cart.entries()).map(([productId, quantity]) => ({ productId, quantity }));
      const res = await fetch(`${API_BASE}/public/store/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: form.clientName.trim(),
          clientPhone: form.clientPhone.trim(),
          items,
          deliveryType: form.deliveryType,
          deliveryAddress: form.deliveryType === 'delivery' ? form.deliveryAddress.trim() : undefined,
          notes: form.notes.trim() || undefined,
          paymentMethod: form.paymentMethod || undefined,
          changeFor,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erro ao enviar pedido');
      setOrderId(json.data.orderId);
      setOrderStatus('pending');
      // Salvar cliente e pedido no localStorage
      try {
        localStorage.setItem(CUSTOMER_KEY(slug!), JSON.stringify({ name: form.clientName.trim(), phone: form.clientPhone.trim(), address: form.deliveryAddress.trim() }));
        const newOrder: SavedOrder = {
          orderId: json.data.orderId,
          orderNumber: json.data.orderNumber ?? null,
          items: Array.from(cart.entries()).map(([id, qty]) => {
            const p = store!.products.find(p => p.id === id)!;
            return { name: p.name, qty, price: p.price };
          }),
          total: totalPrice,
          deliveryFee: appliedFee,
          paymentMethod: form.paymentMethod || undefined,
          changeFor: changeFor ?? null,
          createdAt: new Date().toISOString(),
        };
        const existing: SavedOrder[] = JSON.parse(localStorage.getItem(ORDERS_KEY(slug!)) ?? '[]');
        const updated = [newOrder, ...existing].slice(0, 20);
        localStorage.setItem(ORDERS_KEY(slug!), JSON.stringify(updated));
        setSavedOrders(updated);
      } catch {}
      setStep('success');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading)
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-[3px] border-[#EA4B92] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Carregando cardápio...</p>
      </div>
    );

  // ── Not found ──
  if (notFound)
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Loja não encontrada</h1>
          <p className="text-gray-400 text-sm mt-1">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );

  if (!store) return null;

  // Modos de entrega disponíveis (para o pill laranja)
  const modes: Array<'delivery' | 'pickup'> = [];
  if (store.acceptsDelivery) modes.push('delivery');
  if (store.acceptsPickup) modes.push('pickup');
  const modeLabel = (m: 'delivery' | 'pickup') => (m === 'delivery' ? 'Entrega' : 'Retirada');
  const cycleMode = () => {
    if (modes.length < 2) return;
    setForm(f => {
      const i = modes.indexOf(f.deliveryType);
      return { ...f, deliveryType: modes[(i + 1) % modes.length] };
    });
  };
  const serviceInfo =
    form.deliveryType === 'delivery'
      ? store.deliveryFee
        ? `Taxa de entrega ${fmt(store.deliveryFee)}`
        : 'Entrega grátis'
      : 'Retirar no local';
  const subtitle =
    store.description ||
    [store.acceptsDelivery && 'Entrega', store.acceptsPickup && 'Retirada']
      .filter(Boolean)
      .join(' • ');

  // ── Catálogo ──
  if (step === 'catalog')
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        {/* Header estilo delivery */}
        <div className="max-w-lg mx-auto">
          {/* Barra de volta ao diretório de lojas */}
          <div className="px-4 pt-3">
            <Link
              to="/lojas"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-white rounded-full px-3 py-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Ver todas as lojas
            </Link>
          </div>
          {/* Banner */}
          <div className="relative h-40 bg-gradient-to-br from-[#EA4B92] to-[#7C3AED] overflow-hidden">
            {store.coverImageUrl ? (
              <>
                {/* Imagem de capa da loja */}
                <img
                  src={store.coverImageUrl}
                  alt={store.storeName}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* escurecimento p/ legibilidade dos botões */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-black/10" />
              </>
            ) : (
              <>
                {/* brilho decorativo (sem imagem) */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
                <div className="absolute top-16 -left-8 w-28 h-28 bg-white/10 rounded-full" />
              </>
            )}

            {/* Botões flutuantes */}
            <div className="absolute top-0 left-0 right-0 pt-11 px-4 flex items-center justify-end gap-2">
              {store.phone && (
                <a
                  href={`https://wa.me/${store.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
              )}
              {store.instagramHandle && (
                <a
                  href={`https://instagram.com/${store.instagramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              )}
              <button
                onClick={handleShare}
                aria-label="Compartilhar"
                className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center text-white active:scale-90 transition-transform"
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0L8 8m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
                </svg>
              </button>
            </div>

            {copied && (
              <div className="absolute top-11 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
                Link copiado!
              </div>
            )}
          </div>

          {/* Card sobreposto */}
          <div className="relative -mt-6 bg-white rounded-t-[28px] px-5 pt-5 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight">
                  {store.storeName}
                </h1>
                {subtitle && (
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">{subtitle}</p>
                )}
                {store.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[#EA4B92] text-xs font-medium mt-1.5"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="line-clamp-1">{store.address}</span>
                  </a>
                )}
              </div>
              {/* Logo circular */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EA4B92] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-white -mt-12">
                <span className="text-white font-black text-lg tracking-tight">
                  {initials(store.storeName)}
                </span>
              </div>
            </div>

            {/* Barra de serviço */}
            <div className="mt-4 flex items-center gap-2 bg-[#F5F5F7] rounded-2xl p-1.5">
              <button
                onClick={cycleMode}
                disabled={modes.length < 2}
                className="flex items-center gap-1.5 bg-[#EA4B92] text-white font-bold text-sm pl-4 pr-3 py-2.5 rounded-xl shadow-sm shadow-pink-200 disabled:pr-4 active:scale-95 transition-transform"
              >
                {modeLabel(form.deliveryType)}
                {modes.length >= 2 && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              <div className="flex-1 text-center text-[13px] text-gray-500 font-medium leading-tight">
                {serviceInfo}
                {store.minOrderValue && (
                  <span className="text-gray-400"> • Mín. {fmt(store.minOrderValue)}</span>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-300 flex-shrink-0 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Banner de histórico */}
        {savedOrders.length > 0 && (
          <div className="max-w-lg mx-auto px-4 pt-4">
            <button
              onClick={() => setStep('history')}
              className="w-full bg-white rounded-2xl shadow-sm px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#EA4B92]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-gray-800">Meus pedidos</p>
                <p className="text-xs text-gray-400">{savedOrders.length} {savedOrders.length === 1 ? 'pedido anterior' : 'pedidos anteriores'}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Produtos */}
        <div className="max-w-lg mx-auto px-4 pt-5 pb-40">
          {store.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 7h13" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Nenhum produto disponível no momento.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-bold text-gray-900">Cardápio</h2>
                <span className="text-xs text-gray-400 font-medium">
                  {store.products.length} {store.products.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {store.products.map(p => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    qty={cart.get(p.id) ?? 0}
                    onAdd={() => setQty(p.id, 1)}
                    onRemove={() => setQty(p.id, -1)}
                  />
                ))}
              </div>
            </>
          )}

          <div className="mt-12 flex items-center justify-center gap-1 opacity-40">
            <span className="text-[11px] text-gray-400">Criado com</span>
            <span className="text-[11px] font-bold text-[#EA4B92]">DocePreço</span>
          </div>
        </div>

        {/* Carrinho flutuante */}
        <div className={`fixed bottom-0 left-0 right-0 transition-all duration-300 ease-out ${cartVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
          <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/95 to-transparent">
            <div className="max-w-lg mx-auto">
              <button
                onClick={() => setStep('checkout')}
                className="w-full bg-[#EA4B92] text-white font-bold py-[15px] rounded-2xl shadow-xl shadow-pink-300/40 flex items-center justify-between px-5 text-sm active:scale-[0.98] transition-transform"
              >
                <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-xs tabular-nums">
                  {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                </span>
                <span className="text-[15px] font-bold">Ver pedido</span>
                <span className="tabular-nums font-bold">{fmt(totalPrice)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );

  // ── Histórico ──
  if (step === 'history')
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <div className="bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] text-white px-5 py-5">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => setStep('catalog')}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold">Meus pedidos</h1>
              <p className="text-white/60 text-xs">{store.storeName}</p>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-3">
          {savedOrders.map(o => {
            const st = historyStatuses[o.orderId];
            const badge = st ? STATUS_LABEL[st] : null;
            const date = new Date(o.createdAt);
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={o.orderId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      {o.orderNumber != null && (
                        <p className="text-sm font-bold text-gray-700">Pedido #{o.orderNumber}</p>
                      )}
                      <p className="text-xs text-gray-400">{dateStr} às {timeStr}</p>
                    </div>
                    {badge ? (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color: badge.color, backgroundColor: badge.bg }}>
                        {badge.label}
                      </span>
                    ) : (
                      <span className="w-16 h-5 bg-gray-100 rounded-full animate-pulse" />
                    )}
                  </div>
                  {o.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rose-50 text-[#EA4B92] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{item.qty}</span>
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium text-gray-600">{fmt(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">
                    Total: <span className="text-[#EA4B92]">{fmt(o.total)}</span>
                    {o.paymentMethod && (
                      <span className="text-xs font-medium text-gray-400"> · {PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</span>
                    )}
                  </span>
                  {st !== 'delivered' && st !== 'cancelled' && (
                    <button
                      onClick={() => { setOrderId(o.orderId); setOrderStatus(st ?? 'pending'); setStep('success'); }}
                      className="text-xs font-bold text-[#EA4B92] bg-rose-50 px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
                    >
                      Acompanhar
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button
            onClick={() => setStep('catalog')}
            className="w-full bg-[#EA4B92] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-pink-200/60 active:scale-[0.98] transition-transform mt-2"
          >
            Fazer novo pedido
          </button>
        </div>
      </div>
    );

  // ── Checkout ──
  if (step === 'checkout')
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <div className="bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] text-white px-5 py-5">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => setStep('catalog')}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold">Confirmar pedido</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4 pb-10">
          {/* Resumo */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Seu pedido</p>
              {Array.from(cart.entries()).map(([id, qty]) => {
                const p = store.products.find(p => p.id === id);
                if (!p) return null;
                return (
                  <div key={id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-rose-50 text-[#EA4B92] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {qty}
                      </span>
                      <span className="line-clamp-1">{p.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800 text-sm ml-2 flex-shrink-0">
                      {fmt(p.price * qty)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="bg-gray-50 px-4 divide-y divide-gray-100">
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-gray-500">Subtotal</span>
                <span className="text-sm text-gray-700">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-gray-500">Taxa de entrega</span>
                <span className="text-sm text-gray-700">{fmt(appliedFee)}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm font-bold text-gray-700">Total</span>
                <span className="text-[#EA4B92] font-bold text-lg">{fmt(totalPrice)}</span>
              </div>
            </div>
            {store.minOrderValue && subtotal < store.minOrderValue && (
              <div className="px-4 pb-3">
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                  Pedido mínimo de {fmt(store.minOrderValue)}. Faltam {fmt(store.minOrderValue - subtotal)}.
                </p>
              </div>
            )}
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Seus dados</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
              placeholder="Seu nome *"
              value={form.clientName}
              onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
            />
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
              placeholder="WhatsApp *"
              type="tel"
              value={form.clientPhone}
              onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
            />
            {store.acceptsDelivery && store.acceptsPickup && (
              <div className="flex gap-2">
                <button
                  onClick={() => setForm(f => ({ ...f, deliveryType: 'delivery' }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${form.deliveryType === 'delivery' ? 'border-[#EA4B92] bg-rose-50 text-[#EA4B92]' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                >
                  Entrega
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, deliveryType: 'pickup' }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${form.deliveryType === 'pickup' ? 'border-[#EA4B92] bg-rose-50 text-[#EA4B92]' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                >
                  Retirada
                </button>
              </div>
            )}
            {form.deliveryType === 'delivery' && (
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
                placeholder="Endereço de entrega *"
                value={form.deliveryAddress}
                onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
              />
            )}
            {form.deliveryType === 'pickup' && store.address && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                📍 Retirada em: <span className="font-semibold">{store.address}</span>
              </p>
            )}
            {(store.paymentMethods?.length ?? 0) > 0 && (
              <>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2">Forma de pagamento</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.filter(m => store.paymentMethods.includes(m.key)).map(m => (
                    <button
                      key={m.key}
                      onClick={() => setForm(f => ({ ...f, paymentMethod: m.key }))}
                      className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-1.5 ${form.paymentMethod === m.key ? 'border-[#EA4B92] bg-rose-50 text-[#EA4B92]' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                    >
                      <span>{m.emoji}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
                {form.paymentMethod === 'cash' && (
                  <input
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
                    placeholder="Troco para quanto? (opcional)"
                    type="text"
                    inputMode="decimal"
                    value={form.changeFor}
                    onChange={e => setForm(f => ({ ...f, changeFor: e.target.value }))}
                  />
                )}
              </>
            )}
            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all resize-none placeholder:text-gray-300"
              placeholder="Observações (opcional)"
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-500 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#EA4B92] text-white font-bold py-4 rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-pink-200/60 active:scale-[0.98] transition-transform"
          >
            {submitting && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {submitting ? 'Enviando...' : 'Confirmar pedido'}
          </button>
        </div>
      </div>
    );

  // ── Sucesso / Acompanhamento ──
  const STATUS_STEPS: Array<{ key: string; label: string; sub: string; icon: JSX.Element }> = [
    {
      key: 'pending',
      label: 'Aguardando confirmação',
      sub: 'Seu pedido foi recebido pela loja',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: 'in_progress',
      label: 'Em produção',
      sub: 'A loja está preparando seu pedido',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      key: 'done',
      label: 'Saiu para entrega',
      sub: 'Seu pedido está a caminho!',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
    },
    {
      key: 'delivered',
      label: 'Entregue 🎉',
      sub: 'Pedido entregue com sucesso!',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
  ];
  const cancelledStatus = orderStatus === 'cancelled';
  const currentIdx = cancelledStatus ? -1 : STATUS_STEPS.findIndex(s => s.key === orderStatus);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;

  // Ao acompanhar pelo histórico o carrinho já foi limpo,
  // então o resumo sai do pedido salvo no localStorage.
  const trackedOrder = orderId ? savedOrders.find(o => o.orderId === orderId) ?? null : null;
  const summaryItems: Array<{ name: string; qty: number; price: number }> = trackedOrder
    ? trackedOrder.items ?? []
    : Array.from(cart.entries()).flatMap(([id, qty]) => {
        const p = store.products.find(p => p.id === id);
        return p ? [{ name: p.name, qty, price: p.price }] : [];
      });
  const summaryFee = trackedOrder ? trackedOrder.deliveryFee : appliedFee;
  const summaryTotal = trackedOrder ? trackedOrder.total : totalPrice;
  const summaryPayment = trackedOrder ? trackedOrder.paymentMethod ?? '' : form.paymentMethod;
  const summaryChange = trackedOrder
    ? trackedOrder.changeFor
      ? fmt(trackedOrder.changeFor)
      : ''
    : form.changeFor;
  const summaryNumber = trackedOrder?.orderNumber ?? null;

  const sendOrderWhatsApp = () => {
    if (!store.phone) return;
    const summary = summaryItems
      .map(item => `• ${item.qty}x ${item.name} — ${fmt(item.price * item.qty)}`)
      .join('\n');
    const msg = [
      `Olá, *${store.storeName}*! Segue meu pedido${summaryNumber != null ? ` *#${summaryNumber}*` : ''}:`,
      '',
      summary,
      '',
      `Taxa de entrega: ${fmt(summaryFee)}`,
      `*Total: ${fmt(summaryTotal)}*`,
      '',
      `Nome: ${form.clientName}`,
      form.deliveryType === 'delivery' ? `Endereço: ${form.deliveryAddress}` : 'Retirada no local',
      ...(summaryPayment ? [`Pagamento: ${PAYMENT_LABEL[summaryPayment] ?? summaryPayment}${summaryPayment === 'cash' && summaryChange ? ` (troco para ${summaryChange})` : ''}`] : []),
      ...(form.notes ? [`Obs.: ${form.notes}`] : []),
    ].join('\n');
    const url = `https://wa.me/${store.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] px-5 pt-12 pb-8 text-white">
        <div className="max-w-lg mx-auto">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">{store.storeName}</p>
          <h1 className="text-2xl font-bold">
            {cancelledStatus ? 'Pedido cancelado' : orderStatus === 'delivered' ? 'Pedido entregue! 🎉' : 'Acompanhar pedido'}
            {summaryNumber != null && <span className="ml-2 text-white/80 text-xl font-semibold">#{summaryNumber}</span>}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            {cancelledStatus
              ? 'Entre em contato com a loja.'
              : orderStatus === 'delivered'
              ? `Obrigada pela preferência, ${form.clientName.split(' ')[0]}!`
              : `Olá, ${form.clientName.split(' ')[0]}! Seu pedido está a caminho.`}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-10 flex flex-col gap-4">

        {/* Timeline vertical */}
        {!cancelledStatus && (
          <div className="bg-white rounded-2xl shadow-sm px-5 pt-5 pb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">Status do pedido</p>
            <div className="flex flex-col">
              {STATUS_STEPS.map((s, i) => {
                const done = i < activeIdx;
                const active = i === activeIdx;
                const pending = i > activeIdx;
                const isLast = i === STATUS_STEPS.length - 1;
                return (
                  <div key={s.key} className="flex gap-4">
                    {/* Coluna esquerda: ícone + linha */}
                    <div className="flex flex-col items-center">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                        done    ? 'bg-[#EA4B92] text-white shadow-md shadow-pink-200' :
                        active  ? 'bg-[#EA4B92] text-white shadow-lg shadow-pink-300 ring-4 ring-pink-100' :
                                  'bg-gray-100 text-gray-300'
                      }`}>
                        {done ? (
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : s.icon}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 my-1 min-h-[28px] rounded-full transition-colors duration-500 ${done ? 'bg-[#EA4B92]' : 'bg-gray-100'}`} />
                      )}
                    </div>
                    {/* Coluna direita: texto */}
                    <div className={`pb-6 pt-2 ${isLast ? 'pb-1' : ''}`}>
                      <p className={`font-bold text-[15px] leading-tight transition-colors duration-300 ${active ? 'text-[#EA4B92]' : done ? 'text-gray-700' : 'text-gray-300'}`}>
                        {s.label}
                        {active && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold bg-pink-50 text-[#EA4B92] px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-[#EA4B92] rounded-full animate-pulse" />
                            agora
                          </span>
                        )}
                      </p>
                      <p className={`text-xs mt-0.5 leading-relaxed ${active ? 'text-gray-500' : done ? 'text-gray-400' : 'text-gray-200'}`}>
                        {s.sub}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 pt-3 border-t border-gray-50 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" />
              <p className="text-[11px] text-gray-300">Atualiza a cada 20 segundos</p>
            </div>
          </div>
        )}

        {cancelledStatus && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 text-xl">❌</div>
            <div>
              <p className="font-bold text-red-700">Pedido cancelado</p>
              <p className="text-sm text-red-400 mt-0.5">Entre em contato com {store.storeName} para mais informações.</p>
            </div>
          </div>
        )}

        {/* Resumo do pedido */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Resumo do pedido{summaryNumber != null ? ` #${summaryNumber}` : ''}
            </p>
            {summaryItems.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0 text-sm text-gray-700">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-rose-50 text-[#EA4B92] text-[11px] font-bold flex items-center justify-center flex-shrink-0">{item.qty}</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-semibold ml-2 text-gray-800">{fmt(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 flex justify-between text-sm text-gray-400 border-t border-gray-50">
            <span>Taxa de entrega</span>
            <span>{fmt(summaryFee)}</span>
          </div>
          {summaryPayment && (
            <div className="px-4 py-2 flex justify-between text-sm text-gray-400 border-t border-gray-50">
              <span>Pagamento</span>
              <span>
                {PAYMENT_LABEL[summaryPayment] ?? summaryPayment}
                {summaryPayment === 'cash' && summaryChange ? ` · troco p/ ${summaryChange}` : ''}
              </span>
            </div>
          )}
          <div className="bg-gray-50 px-4 py-3.5 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-700">Total</span>
            <span className="text-[#EA4B92] font-bold text-lg">{fmt(summaryTotal)}</span>
          </div>
        </div>

        {store.phone && summaryItems.length > 0 && (
          <button
            onClick={sendOrderWhatsApp}
            className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-2xl shadow-md shadow-green-200/60 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Enviar pedido no WhatsApp
          </button>
        )}

        <button
          onClick={() => {
            setCart(new Map());
            setStep('catalog');
            setOrderId(null);
            let customer: { name?: string; phone?: string; address?: string } | null = null;
            try { customer = JSON.parse(localStorage.getItem(CUSTOMER_KEY(slug!)) ?? 'null'); } catch { /* ignore */ }
            setForm({
              clientName: customer?.name ?? '',
              clientPhone: customer?.phone ?? '',
              deliveryType: store.acceptsDelivery ? 'delivery' : 'pickup',
              deliveryAddress: customer?.address ?? '',
              notes: '',
              paymentMethod: store.paymentMethods?.length === 1 ? store.paymentMethods[0] : '',
              changeFor: '',
            });
          }}
          className="w-full bg-white border-2 border-[#EA4B92] text-[#EA4B92] font-bold py-3.5 rounded-2xl shadow-sm active:scale-[0.98] transition-transform"
        >
          Fazer outro pedido
        </button>

        <p className="text-center text-[11px] text-gray-300 pb-2">
          Criado com <span className="text-[#EA4B92] font-semibold">DocePreço</span>
        </p>
      </div>
    </div>
  );
}
