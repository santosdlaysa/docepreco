import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fmt, STATUS_LABEL } from '../utils/format';
import { BottomNav } from '../components/BottomNav';
import { getCustomerProfile, saveCustomerProfile, clearCustomerProfile } from '../utils/customerProfile';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface CustomerOrderItem {
  recipeName: string;
  quantity: number;
  unitPrice: number;
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
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/public/customer/orders?phone=${encodeURIComponent(phone)}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setOrders(json.data);
        else setError('Não foi possível carregar seus pedidos');
      })
      .catch(() => setError('Não foi possível carregar seus pedidos'))
      .finally(() => setLoading(false));
  }, [phone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 8) {
      setError('Informe um telefone válido');
      return;
    }
    saveCustomerProfile({ phone: phoneInput.trim() });
    setPhone(phoneInput.trim());
  };

  const handleLogout = () => {
    clearCustomerProfile();
    setPhone('');
    setPhoneInput('');
    setOrders([]);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
        <Link
          to="/lojas"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-white rounded-full px-3 py-1.5 shadow-sm active:scale-95 transition-transform mb-5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar às lojas
        </Link>

        <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight mb-1">Meus pedidos</h1>
        <p className="text-gray-400 text-sm mb-5">
          {phone ? 'Histórico de pedidos feito com este telefone, em todas as lojas.' : 'Informe seu telefone para ver seu histórico de pedidos.'}
        </p>

        {!phone && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
              placeholder="Seu WhatsApp"
              type="tel"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] text-white font-bold py-3 rounded-xl active:scale-[0.98] transition-transform"
            >
              Ver meus pedidos
            </button>
          </form>
        )}

        {phone && (
          <>
            <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 mb-4">
              <span className="text-sm text-gray-500">
                Telefone: <span className="font-semibold text-gray-800">{phone}</span>
              </span>
              <button onClick={handleLogout} className="text-xs font-semibold text-[#EA4B92]">
                Sair
              </button>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-[3px] border-[#EA4B92] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && error && <p className="text-sm text-red-500 text-center py-8">{error}</p>}

            {!loading && !error && orders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <p className="text-gray-400 text-sm">Nenhum pedido encontrado com esse telefone.</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {orders.map(o => {
                const meta = STATUS_LABEL[o.status] ?? STATUS_LABEL.pending;
                return (
                  <div key={o.orderId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                      <div>
                        <Link to={`/loja/${o.storeSlug}`} className="font-bold text-gray-900 text-sm hover:underline">
                          {o.storeName}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {o.orderNumber != null ? `Pedido #${o.orderNumber} · ` : ''}
                          {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ color: meta.color, backgroundColor: meta.bg }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="px-4 pb-3 divide-y divide-gray-50">
                      {o.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center py-1.5 text-sm text-gray-600">
                          <span>{item.quantity}x {item.recipeName}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50 px-4 py-2.5 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700">Total</span>
                      <span className="text-[#EA4B92] font-bold">{fmt(o.totalPrice)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
