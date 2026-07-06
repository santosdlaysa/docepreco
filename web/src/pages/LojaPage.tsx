import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// tipos
interface StoreProduct { id: string; name: string; description: string | null; photoUrl: string | null; price: number; }
interface StoreData { storeName: string; slug: string; description: string | null; acceptsDelivery: boolean; acceptsPickup: boolean; minOrderValue: number | null; products: StoreProduct[]; }

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/public/store/${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStore(json.data);
          // default deliveryType
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
        body: JSON.stringify({ clientName: form.clientName.trim(), clientPhone: form.clientPhone.trim() || undefined, items, deliveryType: form.deliveryType, notes: form.notes.trim() || undefined }),
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

  if (loading) return (
    <div className="min-h-screen bg-[#FFF6F0] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#EA4B92] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[#FFF6F0] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="text-6xl">🔍</span>
      <h1 className="text-2xl font-bold text-gray-800">Loja não encontrada</h1>
      <p className="text-gray-500">Verifique o link e tente novamente.</p>
    </div>
  );

  if (!store) return null;

  // ── Catálogo ──
  if (step === 'catalog') return (
    <div className="min-h-screen bg-[#FFF6F0]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] text-white px-5 py-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">{store.storeName}</h1>
          {store.description && <p className="mt-1 text-white/80 text-sm">{store.description}</p>}
          <div className="flex gap-2 mt-3 flex-wrap">
            {store.acceptsDelivery && <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">🛵 Entrega</span>}
            {store.acceptsPickup && <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">🏪 Retirada</span>}
            {store.minOrderValue && <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">Mínimo {fmt(store.minOrderValue)}</span>}
          </div>
        </div>
      </div>

      {/* Produtos */}
      <div className="max-w-lg mx-auto px-4 py-5 pb-32">
        {store.products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl">🛒</span>
            <p className="mt-3">Nenhum produto disponível no momento.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {store.products.map(p => {
              const qty = cart.get(p.id) ?? 0;
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-[#FFF6F0] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-3xl">🍬</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                    <p className="text-[#EA4B92] font-bold mt-1">{fmt(p.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {qty > 0 ? (
                      <>
                        <button onClick={() => setQty(p.id, -1)} className="w-8 h-8 rounded-full border-2 border-[#EA4B92] text-[#EA4B92] font-bold flex items-center justify-center">−</button>
                        <span className="w-5 text-center font-bold text-gray-800">{qty}</span>
                      </>
                    ) : null}
                    <button onClick={() => setQty(p.id, 1)} className="w-8 h-8 rounded-full bg-[#EA4B92] text-white font-bold flex items-center justify-center">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra flutuante */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg">
          <div className="max-w-lg mx-auto">
            <button onClick={() => setStep('checkout')} className="w-full bg-[#EA4B92] text-white font-bold py-4 rounded-2xl flex items-center justify-between px-5 text-sm">
              <span className="bg-white/20 px-2 py-0.5 rounded-lg">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
              <span>Fazer pedido</span>
              <span>{fmt(totalPrice)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Checkout ──
  if (step === 'checkout') return (
    <div className="min-h-screen bg-[#FFF6F0]">
      <div className="bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] text-white px-5 py-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => setStep('catalog')} className="text-white/80 hover:text-white text-xl">←</button>
          <h1 className="text-xl font-bold">Confirmar pedido</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4 pb-10">
        {/* Resumo */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-700 mb-3">Seu pedido</h2>
          {Array.from(cart.entries()).map(([id, qty]) => {
            const p = store.products.find(p => p.id === id);
            if (!p) return null;
            return (
              <div key={id} className="flex justify-between py-1.5 text-sm text-gray-700">
                <span>{qty}x {p.name}</span>
                <span className="font-semibold">{fmt(p.price * qty)}</span>
              </div>
            );
          })}
          <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between font-bold text-gray-800">
            <span>Total</span>
            <span className="text-[#EA4B92]">{fmt(totalPrice)}</span>
          </div>
          {store.minOrderValue && totalPrice < store.minOrderValue && (
            <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              ⚠️ Pedido mínimo de {fmt(store.minOrderValue)}. Faltam {fmt(store.minOrderValue - totalPrice)}.
            </p>
          )}
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
          <h2 className="font-bold text-gray-700">Seus dados</h2>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92]"
            placeholder="Seu nome *"
            value={form.clientName}
            onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
          />
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92]"
            placeholder="WhatsApp (opcional)"
            value={form.clientPhone}
            onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
          />
          {(store.acceptsDelivery && store.acceptsPickup) && (
            <div className="flex gap-2">
              {store.acceptsDelivery && (
                <button onClick={() => setForm(f => ({ ...f, deliveryType: 'delivery' }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${form.deliveryType === 'delivery' ? 'border-[#EA4B92] bg-[#FFF6F0] text-[#EA4B92]' : 'border-gray-200 text-gray-500'}`}>
                  🛵 Entrega
                </button>
              )}
              {store.acceptsPickup && (
                <button onClick={() => setForm(f => ({ ...f, deliveryType: 'pickup' }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${form.deliveryType === 'pickup' ? 'border-[#EA4B92] bg-[#FFF6F0] text-[#EA4B92]' : 'border-gray-200 text-gray-500'}`}>
                  🏪 Retirada
                </button>
              )}
            </div>
          )}
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] resize-none"
            placeholder="Observações (opcional)"
            rows={3}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#EA4B92] text-white font-bold py-4 rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {submitting ? 'Enviando...' : 'Confirmar pedido'}
        </button>
      </div>
    </div>
  );

  // ── Sucesso ──
  return (
    <div className="min-h-screen bg-[#FFF6F0] flex flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="text-7xl">✅</span>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Pedido recebido!</h1>
        <p className="text-gray-500 mt-2">Aguarde o contato de <strong>{store.storeName}</strong> para combinar os detalhes.</p>
      </div>
      <button
        onClick={() => { setCart(new Map()); setStep('catalog'); setForm({ clientName: '', clientPhone: '', deliveryType: store.acceptsDelivery ? 'delivery' : 'pickup', notes: '' }); }}
        className="bg-[#EA4B92] text-white font-bold py-3 px-8 rounded-2xl"
      >
        Fazer outro pedido
      </button>
    </div>
  );
}
