import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, ShoppingBag, ChevronRight, ArrowLeft, Wallet } from 'lucide-react';
import { fmt, initials, STATUS_LABEL } from '../utils/format';
import { BottomNav } from '../components/BottomNav';
import { getCustomerProfile, saveCustomerProfile, clearCustomerProfile } from '../utils/customerProfile';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface CustomerOrderItem {
  productId?: string;
  recipeName: string;
  quantity: number;
  unitPrice: number;
  addons?: Array<{ id?: string; name: string; price: number }>;
}

interface CustomerOrder {
  orderId: string;
  orderNumber: number | null;
  status: string;
  totalPrice: number;
  items: CustomerOrderItem[];
  createdAt: string;
  deliveryAddress: string | null;
  paymentMethod: string | null;
  storeName: string;
  storeSlug: string;
  storeImageUrl: string | null;
}

const PAYMENT_LABEL: Record<string, string> = { pix: 'Pix', cash: 'Dinheiro', credit: 'Crédito', debit: 'Débito' };
const ACTIVE_STATUSES = new Set(['pending', 'in_progress', 'done']);

// "Pedir de novo": deixa os itens do pedido salvos para a página da loja
// remontar o carrinho ao abrir (casando por id ou, em pedidos antigos, por nome).
function saveReorder(order: CustomerOrder) {
  try {
    localStorage.setItem(
      `dpeco_reorder_${order.storeSlug}`,
      JSON.stringify({
        ts: Date.now(),
        items: order.items.map(i => ({
          productId: i.productId ?? null,
          name: i.recipeName,
          qty: i.quantity,
          addons: (i.addons ?? []).map(a => ({ id: a.id ?? null, name: a.name })),
        })),
      })
    );
  } catch {}
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const meta = STATUS_LABEL[order.status] ?? STATUS_LABEL.pending;
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isActive = ACTIVE_STATUSES.has(order.status);

  return (
    <div className={`bg-white rounded-3xl shadow-sm overflow-hidden ${isActive ? 'ring-2 ring-[#EA4B92]/15' : ''}`}>
      {/* Cabeçalho: loja + status */}
      <Link to={`/loja/${order.storeSlug}`} className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0 shadow-md shadow-pink-100">
          {order.storeImageUrl ? (
            <img
              src={order.storeImageUrl}
              alt={order.storeName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#EA4B92] to-[#7C3AED] flex items-center justify-center">
              <span className="text-white font-black text-xs tracking-tight">
                {initials(order.storeName)}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{order.storeName}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {order.orderNumber != null ? `Pedido #${order.orderNumber} · ` : ''}
            {dateStr} às {timeStr}
          </p>
        </div>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          {meta.label}
        </span>
      </Link>

      {/* Itens */}
      <div className="px-4 pb-3 divide-y divide-gray-50">
        {order.items.map((item, i) => (
          <div key={i} className="py-2">
            <div className="flex justify-between items-center text-sm text-gray-700">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-rose-50 text-[#EA4B92] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {item.quantity}
                </span>
                <span className="truncate">{item.recipeName}</span>
              </div>
              <span className="font-semibold text-gray-500 text-xs ml-2 flex-shrink-0">
                {fmt(item.unitPrice * item.quantity)}
              </span>
            </div>
            {(item.addons?.length ?? 0) > 0 && (
              <p className="text-[11px] text-gray-400 mt-0.5 ml-[30px]">
                + {item.addons!.map(a => a.name).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Rodapé: total + pagamento + ação */}
      <div className="bg-gray-50/80 px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-extrabold text-[#EA4B92]">{fmt(order.totalPrice)}</span>
          {order.paymentMethod && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 ml-2">
              <Wallet size={11} />
              {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
            </span>
          )}
        </div>
        <Link
          to={`/loja/${order.storeSlug}`}
          onClick={() => { if (!isActive) saveReorder(order); }}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#EA4B92] bg-white shadow-sm rounded-full px-3.5 py-2 flex-shrink-0 active:scale-95 transition-transform"
        >
          {isActive ? 'Acompanhar' : 'Pedir de novo'}
          <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export function MeusPedidosPage() {
  const [phone, setPhone] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = getCustomerProfile().phone;
    if (saved) {
      setPhone(saved);
      setPhoneInput(saved);
    }
  }, []);

  useEffect(() => {
    if (!phone) return;
    let first = true;
    const load = () => {
      if (first) setLoading(true);
      setError('');
      fetch(`${API_BASE}/public/customer/orders?phone=${encodeURIComponent(phone)}`)
        .then(r => r.json())
        .then(json => {
          if (json.success) setOrders(json.data);
          else if (first) setError('Não foi possível carregar seus pedidos');
        })
        .catch(() => { if (first) setError('Não foi possível carregar seus pedidos'); })
        .finally(() => { setLoading(false); first = false; });
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [phone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 8) {
      setError('Informe um telefone válido');
      return;
    }
    setError('');
    saveCustomerProfile({ phone: phoneInput.trim() });
    setPhone(phoneInput.trim());
  };

  const handleLogout = () => {
    clearCustomerProfile();
    setPhone('');
    setPhoneInput('');
    setOrders([]);
  };

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.has(o.status));
  const pastOrders = orders.filter(o => !ACTIVE_STATUSES.has(o.status));

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header em gradiente */}
      <div className="bg-gradient-to-br from-[#EA4B92] via-[#C654B8] to-[#7C3AED] pb-14">
        <div className="max-w-lg mx-auto px-5 pt-10">
          <Link
            to="/lojas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 bg-white/15 backdrop-blur rounded-full px-3 py-1.5 active:scale-95 transition-transform mb-4"
          >
            <ArrowLeft size={13} />
            Voltar às lojas
          </Link>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest">Histórico</p>
              <h1 className="text-white text-[22px] font-extrabold leading-tight mt-0.5">Meus pedidos</h1>
            </div>
            {phone && orders.length > 0 && (
              <span className="text-white/90 text-[11px] font-bold bg-white/15 backdrop-blur rounded-full px-3 py-1.5 tabular-nums flex-shrink-0">
                {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 pb-24">
        {/* Sem telefone: formulário */}
        {!phone && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg shadow-gray-200/60 p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={18} className="text-[#EA4B92]" />
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Informe seu WhatsApp para ver seus pedidos em todas as lojas.
              </p>
            </div>
            <div className="relative">
              <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
                placeholder="(00) 00000-0000"
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-center">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-pink-200/50 active:scale-[0.98] transition-transform"
            >
              Ver meus pedidos
            </button>
          </form>
        )}

        {phone && (
          <>
            {/* Telefone ativo */}
            <div className="flex items-center justify-between bg-white rounded-3xl shadow-lg shadow-gray-200/60 px-4 py-3.5 mb-5">
              <span className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <Phone size={14} className="text-[#EA4B92]" />
                </span>
                <span className="font-semibold text-gray-800 truncate">{phone}</span>
              </span>
              <button onClick={handleLogout} className="text-xs font-bold text-[#EA4B92] flex-shrink-0 ml-2">
                Trocar
              </button>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-[3px] border-[#EA4B92] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Buscando seus pedidos...</p>
              </div>
            )}

            {!loading && error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-center">
                {error}
              </p>
            )}

            {!loading && !error && orders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <ShoppingBag size={26} className="text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm">Nenhum pedido encontrado com esse telefone.</p>
                <Link
                  to="/lojas"
                  className="text-xs font-bold text-[#EA4B92] bg-white shadow-sm rounded-full px-4 py-2.5 active:scale-95 transition-transform"
                >
                  Explorar lojas
                </Link>
              </div>
            )}

            {/* Em andamento */}
            {activeOrders.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="w-2 h-2 bg-[#EA4B92] rounded-full animate-pulse" />
                  <h2 className="text-[13px] font-extrabold text-gray-700 uppercase tracking-wide">
                    Em andamento
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  {activeOrders.map(o => <OrderCard key={o.orderId} order={o} />)}
                </div>
              </div>
            )}

            {/* Anteriores */}
            {pastOrders.length > 0 && (
              <div>
                {activeOrders.length > 0 && (
                  <h2 className="text-[13px] font-extrabold text-gray-400 uppercase tracking-wide mb-3 px-1">
                    Anteriores
                  </h2>
                )}
                <div className="flex flex-col gap-3">
                  {pastOrders.map(o => <OrderCard key={o.orderId} order={o} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
