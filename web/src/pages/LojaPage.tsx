import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  price: number;
}
interface StoreData {
  storeName: string;
  slug: string;
  description: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue: number | null;
  products: StoreProduct[];
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

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
        <p className="text-xs font-semibold text-[#EA4B92] mb-0.5">{fmt(product.price)}</p>
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

export function LojaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [step, setStep] = useState<'catalog' | 'checkout' | 'success'>('catalog');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    deliveryType: 'pickup' as 'delivery' | 'pickup',
    notes: '',
  });
  const prevTotal = useRef(0);
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/public/store/${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStore(json.data);
          setForm(f => ({ ...f, deliveryType: json.data.acceptsDelivery ? 'delivery' : 'pickup' }));
        } else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const totalItems = Array.from(cart.values()).reduce((a, b) => a + b, 0);
  const totalPrice = store
    ? Array.from(cart.entries()).reduce((acc, [id, qty]) => {
        const p = store.products.find(p => p.id === id);
        return acc + (p ? p.price * qty : 0);
      }, 0)
    : 0;

  useEffect(() => {
    if (totalItems > 0 && prevTotal.current === 0) setCartVisible(true);
    if (totalItems === 0) setCartVisible(false);
    prevTotal.current = totalItems;
  }, [totalItems]);

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
    if (store?.minOrderValue && totalPrice < store.minOrderValue) {
      setError(`Pedido mínimo de ${fmt(store.minOrderValue)}`); return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const items = Array.from(cart.entries()).map(([productId, quantity]) => ({ productId, quantity }));
      const res = await fetch(`${API_BASE}/public/store/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: form.clientName.trim(),
          clientPhone: form.clientPhone.trim() || undefined,
          items,
          deliveryType: form.deliveryType,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erro ao enviar pedido');
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

  // ── Catálogo ──
  if (step === 'catalog')
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#EA4B92] to-[#7C3AED]">
          <div className="max-w-lg mx-auto px-5 pt-10 pb-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 shadow-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-black text-white tracking-tight">
                  {initials(store.storeName)}
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="text-[20px] font-bold text-white leading-tight">{store.storeName}</h1>
                {store.description && (
                  <p className="text-white/65 text-[13px] mt-0.5 line-clamp-1">{store.description}</p>
                )}
              </div>
            </div>

            {/* Pills sem emoji */}
            <div className="flex gap-2 flex-wrap">
              {store.acceptsDelivery && (
                <span className="bg-white/15 border border-white/25 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Entrega
                </span>
              )}
              {store.acceptsPickup && (
                <span className="bg-white/15 border border-white/25 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Retirada
                </span>
              )}
              {store.minOrderValue && (
                <span className="bg-white/15 border border-white/25 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Mínimo {fmt(store.minOrderValue)}
                </span>
              )}
            </div>
          </div>
          <div className="h-6 bg-[#F5F5F7] rounded-t-[2rem]" />
        </div>

        {/* Produtos */}
        <div className="max-w-lg mx-auto px-4 pb-40">
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
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-500">Total</span>
              <span className="text-[#EA4B92] font-bold text-lg">{fmt(totalPrice)}</span>
            </div>
            {store.minOrderValue && totalPrice < store.minOrderValue && (
              <div className="px-4 pb-3">
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                  Pedido mínimo de {fmt(store.minOrderValue)}. Faltam {fmt(store.minOrderValue - totalPrice)}.
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
              placeholder="WhatsApp (opcional)"
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

  // ── Sucesso ──
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-200">
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pedido recebido!</h1>
        <p className="text-gray-400 mt-2 text-sm max-w-xs mx-auto leading-relaxed">
          Aguarde o contato de <strong className="text-gray-700">{store.storeName}</strong> para combinar os detalhes.
        </p>
      </div>
      <button
        onClick={() => {
          setCart(new Map());
          setStep('catalog');
          setForm({ clientName: '', clientPhone: '', deliveryType: store.acceptsDelivery ? 'delivery' : 'pickup', notes: '' });
        }}
        className="bg-[#EA4B92] text-white font-bold py-3 px-8 rounded-2xl shadow-lg shadow-pink-200/60 active:scale-[0.98] transition-transform"
      >
        Fazer outro pedido
      </button>
      <p className="text-[11px] text-gray-300">
        Criado com <span className="text-[#EA4B92] font-semibold">DocePreço</span>
      </p>
    </div>
  );
}
