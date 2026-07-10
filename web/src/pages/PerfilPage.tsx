import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Pencil,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  ChevronRight,
  LogOut,
  Check,
} from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { initials } from '../utils/format';
import { getCustomerProfile, saveCustomerProfile, clearCustomerProfile } from '../utils/customerProfile';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export function PerfilPage() {
  const [profile, setProfile] = useState(getCustomerProfile());
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [orderStats, setOrderStats] = useState<{ orders: number; stores: number } | null>(null);

  useEffect(() => {
    const p = getCustomerProfile();
    setProfile(p);
    if (!p.phone) setEditing(true);
  }, []);

  // Estatísticas leves do cliente (pedidos e lojas em que já comprou)
  useEffect(() => {
    if (!profile.phone) {
      setOrderStats(null);
      return;
    }
    fetch(`${API_BASE}/public/customer/orders?phone=${encodeURIComponent(profile.phone)}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          const stores = new Set(json.data.map((o: { storeSlug: string }) => o.storeSlug)).size;
          setOrderStats({ orders: json.data.length, stores });
        }
      })
      .catch(() => setOrderStats(null));
  }, [profile.phone]);

  const startEditing = () => {
    setNameInput(profile.name);
    setPhoneInput(profile.phone);
    setAddressInput(profile.address);
    setError('');
    setEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 8) {
      setError('Informe um telefone válido');
      return;
    }
    const savedProfile = saveCustomerProfile({
      name: nameInput.trim(),
      phone: phoneInput.trim(),
      address: addressInput.trim(),
    });
    setProfile(savedProfile);
    setEditing(false);
    setError('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    clearCustomerProfile();
    setProfile(getCustomerProfile());
    setOrderStats(null);
    setNameInput('');
    setPhoneInput('');
    setAddressInput('');
    setEditing(true);
  };

  const hasProfile = !!profile.phone;
  const firstName = profile.name.trim().split(' ')[0];

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header em gradiente */}
      <div className="bg-gradient-to-br from-[#EA4B92] via-[#C654B8] to-[#7C3AED] pb-16">
        <div className="max-w-lg mx-auto px-5 pt-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest">Perfil</p>
              <h1 className="text-white text-[22px] font-extrabold leading-tight mt-0.5">
                {hasProfile && firstName ? `Olá, ${firstName}! 👋` : 'Seu perfil'}
              </h1>
            </div>
            {hasProfile && !editing && (
              <button
                onClick={startEditing}
                aria-label="Editar perfil"
                className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
              >
                <Pencil size={15} className="text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-12 pb-24">
        {/* Cartão do usuário sobreposto ao header */}
        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/60 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EA4B92] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-lg shadow-pink-200/50">
              {hasProfile && profile.name ? (
                <span className="text-white font-black text-xl tracking-tight">
                  {initials(profile.name)}
                </span>
              ) : (
                <User size={26} className="text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-gray-900 text-[17px] leading-tight truncate">
                {hasProfile ? profile.name || 'Sem nome' : 'Bem-vindo(a)!'}
              </p>
              {hasProfile ? (
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Phone size={11} className="flex-shrink-0" />
                  {profile.phone}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Preencha seus dados para pedir mais rápido
                </p>
              )}
            </div>
            {saved && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 flex-shrink-0">
                <Check size={11} /> Salvo
              </span>
            )}
          </div>

          {/* Estatísticas do cliente */}
          {hasProfile && !editing && orderStats && orderStats.orders > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-rose-50 rounded-2xl px-4 py-3">
                <p className="text-[#EA4B92] font-extrabold text-xl leading-none tabular-nums">
                  {orderStats.orders}
                </p>
                <p className="text-[11px] font-semibold text-gray-500 mt-1">
                  {orderStats.orders === 1 ? 'pedido feito' : 'pedidos feitos'}
                </p>
              </div>
              <div className="bg-violet-50 rounded-2xl px-4 py-3">
                <p className="text-[#7C3AED] font-extrabold text-xl leading-none tabular-nums">
                  {orderStats.stores}
                </p>
                <p className="text-[11px] font-semibold text-gray-500 mt-1">
                  {orderStats.stores === 1 ? 'loja visitada' : 'lojas visitadas'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Formulário de edição */}
        {editing && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm p-5 mt-4 flex flex-col gap-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {hasProfile ? 'Editar dados' : 'Seus dados'}
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nome</label>
              <div className="relative">
                <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
                  placeholder="Como podemos te chamar?"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                WhatsApp <span className="text-[#EA4B92]">*</span>
              </label>
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
              <p className="text-[11px] text-gray-300 mt-1.5 ml-1">
                Usado para identificar seus pedidos nas lojas
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Endereço de entrega</label>
              <div className="relative">
                <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
                  placeholder="Rua, número, bairro"
                  value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-center">
                {error}
              </p>
            )}

            <div className="flex gap-2 mt-1">
              {hasProfile && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 text-center bg-gray-100 text-gray-500 font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-pink-200/50 active:scale-[0.98] transition-transform"
              >
                Salvar
              </button>
            </div>
          </form>
        )}

        {/* Menu */}
        {!editing && hasProfile && (
          <>
            <div className="bg-white rounded-3xl shadow-sm mt-4 overflow-hidden divide-y divide-gray-50">
              <Link
                to="/meus-pedidos"
                className="flex items-center gap-3.5 px-5 py-4 active:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={17} className="text-[#EA4B92]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">Meus pedidos</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {orderStats && orderStats.orders > 0
                      ? 'Acompanhe seus pedidos em tempo real'
                      : 'Você ainda não fez pedidos'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </Link>

              <Link
                to="/lojas"
                className="flex items-center gap-3.5 px-5 py-4 active:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Store size={17} className="text-[#7C3AED]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">Explorar lojas</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Descubra doceiras perto de você</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </Link>

              <button
                onClick={startEditing}
                className="w-full flex items-center gap-3.5 px-5 py-4 text-left active:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <MapPin size={17} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">Endereço de entrega</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {profile.address || 'Nenhum endereço cadastrado'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-4 px-6 leading-relaxed">
              Seus dados ficam salvos apenas neste aparelho e preenchem o pedido automaticamente em qualquer loja.
            </p>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-400 py-4 mt-2 active:scale-[0.98] transition-transform"
            >
              <LogOut size={15} />
              Limpar meus dados
            </button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
