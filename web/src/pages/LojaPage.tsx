import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface StoreProduct { id: string; name: string; description: string | null; photoUrl: string | null; price: number; }
interface StoreData { storeName: string; slug: string; description: string | null; acceptsDelivery: boolean; acceptsPickup: boolean; minOrderValue: number | null; products: StoreProduct[]; }

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function ProductCard({ product, qty, onAdd, onRemove }: { product: StoreProduct; qty: number; onAdd: () => void; onRemove: () => void }) {
  const [bump, setBump] = useState(false);

  const handleAdd = () => {
    onAdd();
    setBump(true);
    setTimeout(() => setBump(false), 200);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Foto */}
      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-pink-50 to-purple-50 overflow-hidden">
        {product.photoUrl ? (
          <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <span className="text-5xl">🍬</span>
          </div>
        )}
        {qty > 0 && (
          <div className="absolute top-2 right-2 bg-[#EA4B92] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
            {qty}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{product.name}</p>
        {product.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[#EA4B92] font-bold text-sm">{fmt(product.price)}</span>
          <div className="flex items-center gap-1.5">
            {qty > 0 && (
              <button
                onClick={onRemove}
                className="w-7 h-7 rounded-full border-2 border-[#EA4B92] text-[#EA4B92] font-bold text-sm flex items-center justify-center transition-transform active:scale-90"
              >
                −
              </button>
            )}
            <button
              onClick={handleAdd}
              className={`w-7 h-7 rounded-full bg-[#EA4B92] text-white font-bold text-sm flex items-center justify-center transition-transform active:scale-90 ${bump ? 'scale-125' : 'scale-100'}`}
              style={{ transition: 'transform 0.15s ease' }}
            >
              +
            </button>
          </div>
        </div>
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
  const [form, setForm] = useState({ clientName: '', clientPhone: '', deliveryType: 'pickup' as 'delivery' | 'pickup', notes: '' });
  const [cartVisible, setCartVisible] = useState(false);
  const prevTotal = useRef(0);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/public/store/${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStore(json.data);
          setForm(f => ({ ...f, deliveryType: json.data.acceptsDelivery ? 'delivery' : 'pickup' }));
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const totalItems = Array.from(cart.values()).reduce((a, b) => a + b, 0);
  const totalPrice = store ? Array.from(cart.entries()).reduce((acc, [id, qty]) => {
    const p = store.products.find(p => p.id === id);
    return acc + (p ? p.price * qty : 0);
  }, 0) : 0;

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
      if (nxt <= 0) next.delete(id); else next.set(id, nxt);
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
  if (loading) return (
    <div className="min-h-screen bg-[#FFF6F0] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-[#EA4B92] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400 animate-pulse">Carregando cardápio...</p>
    </div>
  );

  // ── Not Found ──
  if (notFound) return (
    <div className="min-h-screen bg-[#FFF6F0] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center">
        <span className="text-4xl">🔍</span>
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Loja não encontrada</h1>
        <p className="text-gray-400 text-sm mt-1">Verifique o link e tente novamente.</p>
      </div>
    </div>
  );

  if (!store) return null;

  // ── Catálogo ──
  if (step === 'catalog') return (
    <div className="min-h-screen bg-[#FFF6F0]">

      {/* Header */}
      <div className="bg-gradient-to-br from-[#EA4B92] to-[#7C3AED] text-white relative">
        <div className="max-w-lg mx-auto px-5 pt-10 pb-8">
          {/* Avatar + Nome */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-2xl font-black text-white">{initials(store.storeName)}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{store.storeName}</h1>
              {store.description && (
                <p className="text-white/75 text-sm mt-0.5 line-clamp-2 leading-snug">{store.description}</p>
              )}
            </div>
          </div>

          {/* Pills de info */}
          <div className="flex gap-2 flex-wrap">
            {store.acceptsDelivery && (
              <span className="bg-white/15 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium border border-white/20 flex items-center gap-1">
                🛵 Entrega
              </span>
            )}
            {store.acceptsPickup && (
              <span className="bg-white/15 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium border border-white/20 flex items-center gap-1">
                🏪 Retirada
              </span>
            )}
            {store.minOrderValue && (
              <span className="bg-white/15 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium border border-white/20">
                Mínimo {fmt(store.minOrderValue)}
              </span>
            )}
          </div>
        </div>

        {/* Curva inferior */}
        <div className="h-6 bg-[#FFF6F0] rounded-t-[2rem]" />
      </div>

      {/* Corpo */}
      <div className="max-w-lg mx-auto px-4 pb-36">
        {store.products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🛒</span>
            </div>
            <p className="text-gray-400 text-sm">Nenhum produto disponível no momento.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-700 font-bold text-base">Cardápio</h2>
              <span className="text-xs text-gray-400">{store.products.length} {store.products.length === 1 ? 'item' : 'itens'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {store.products.map(p => (
                <ProductCard
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

        {/* Rodapé branding */}
        <div className="mt-10 flex flex-col items-center gap-1.5 opacity-50">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Loja criada com</span>
            <span className="text-xs font-bold text-[#EA4B92]">DocePreço</span>
          </div>
          <p className="text-[10px] text-gray-300">Gestão inteligente para confeiteiros</p>
        </div>
      </div>

      {/* Barra flutuante do carrinho */}
      <div
        className={`fixed bottom-0 left-0 right-0 transition-all duration-300 ease-out ${cartVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
      >
        <div className="px-4 pb-5 pt-2 bg-gradient-to-t from-[#FFF6F0] via-[#FFF6F0]/95 to-transparent">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setStep('checkout')}
              className="w-full bg-gradient-to-r from-[#EA4B92] to-[#c0356e] text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-300/40 flex items-center justify-between px-5 text-sm active:scale-[0.98] transition-transform"
            >
              <span className="bg-white/20 px-2.5 py-0.5 rounded-lg tabular-nums">
                {totalItems} {totalItems === 1 ? 'item' : 'itens'}
              </span>
              <span className="text-base">Ver pedido</span>
              <span className="tabular-nums">{fmt(totalPrice)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Checkout ──
  if (step === 'checkout') return (
    <div className="min-h-screen bg-[#FFF6F0]">
      <div className="bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] text-white px-5 py-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => setStep('catalog')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            ←
          </button>
          <h1 className="text-lg font-bold">Confirmar pedido</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4 pb-10">
        {/* Resumo */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Seu pedido</h2>
          {Array.from(cart.entries()).map(([id, qty]) => {
            const p = store.products.find(p => p.id === id);
            if (!p) return null;
            return (
              <div key={id} className="flex justify-between py-2 text-sm text-gray-700 border-b border-gray-50 last:border-0">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FFF6F0] text-[#EA4B92] text-xs font-bold flex items-center justify-center">{qty}</span>
                  {p.name}
                </span>
                <span className="font-semibold text-gray-800">{fmt(p.price * qty)}</span>
              </div>
            );
          })}
          <div className="flex justify-between font-bold text-gray-800 mt-3 pt-3 border-t border-gray-100">
            <span>Total</span>
            <span className="text-[#EA4B92] text-lg">{fmt(totalPrice)}</span>
          </div>
          {store.minOrderValue && totalPrice < store.minOrderValue && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
              ⚠️ Pedido mínimo de {fmt(store.minOrderValue)}. Faltam {fmt(store.minOrderValue - totalPrice)}.
            </p>
          )}
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Seus dados</h2>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all"
            placeholder="Seu nome *"
            value={form.clientName}
            onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
          />
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all"
            placeholder="WhatsApp (opcional)"
            type="tel"
            value={form.clientPhone}
            onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
          />
          {store.acceptsDelivery && store.acceptsPickup && (
            <div className="flex gap-2">
              <button
                onClick={() => setForm(f => ({ ...f, deliveryType: 'delivery' }))}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${form.deliveryType === 'delivery' ? 'border-[#EA4B92] bg-pink-50 text-[#EA4B92]' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
              >
                🛵 Entrega
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, deliveryType: 'pickup' }))}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${form.deliveryType === 'pickup' ? 'border-[#EA4B92] bg-pink-50 text-[#EA4B92]' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
              >
                🏪 Retirada
              </button>
            </div>
          )}
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all resize-none"
            placeholder="Observações (opcional)"
            rows={3}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-gradient-to-r from-[#EA4B92] to-[#c0356e] text-white font-bold py-4 rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-pink-300/30 active:scale-[0.98] transition-transform"
        >
          {submitting && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {submitting ? 'Enviando...' : 'Confirmar pedido'}
        </button>
      </div>
    </div>
  );

  // ── Sucesso ──
  return (
    <div className="min-h-screen bg-[#FFF6F0] flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
        <span className="text-5xl">✓</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Pedido recebido!</h1>
        <p className="text-gray-500 mt-2 text-sm max-w-xs mx-auto leading-relaxed">
          Aguarde o contato de <strong className="text-gray-700">{store.storeName}</strong> para combinar os detalhes.
        </p>
      </div>
      <button
        onClick={() => {
          setCart(new Map());
          setStep('catalog');
          setForm({ clientName: '', clientPhone: '', deliveryType: store.acceptsDelivery ? 'delivery' : 'pickup', notes: '' });
        }}
        className="bg-gradient-to-r from-[#EA4B92] to-[#c0356e] text-white font-bold py-3 px-8 rounded-2xl shadow-lg shadow-pink-300/30"
      >
        Fazer outro pedido
      </button>
      <p className="text-xs text-gray-300">Loja criada com <span className="text-[#EA4B92] font-semibold">DocePreço</span></p>
    </div>
  );
}
