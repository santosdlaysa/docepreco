import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Pencil } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { getCustomerProfile, saveCustomerProfile, clearCustomerProfile } from '../utils/customerProfile';

export function PerfilPage() {
  const [profile, setProfile] = useState(getCustomerProfile());
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const p = getCustomerProfile();
    setProfile(p);
    if (!p.phone) setEditing(true);
  }, []);

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
    const saved = saveCustomerProfile({
      name: nameInput.trim(),
      phone: phoneInput.trim(),
      address: addressInput.trim(),
    });
    setProfile(saved);
    setEditing(false);
    setError('');
  };

  const handleLogout = () => {
    clearCustomerProfile();
    setProfile(getCustomerProfile());
    setEditing(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
        <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight mb-1">Perfil</h1>
        <p className="text-gray-400 text-sm mb-5">
          {profile.phone && !editing
            ? 'Seus dados são usados para preencher o pedido automaticamente em qualquer loja.'
            : 'Preencha seus dados para pedir mais rápido e acompanhar seus pedidos.'}
        </p>

        {editing && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Seus dados</p>
            </div>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
              placeholder="Seu nome"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
            />
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
              placeholder="Seu WhatsApp *"
              type="tel"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
            />
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EA4B92] focus:ring-2 focus:ring-[#EA4B92]/10 transition-all placeholder:text-gray-300"
              placeholder="Endereço de entrega"
              value={addressInput}
              onChange={e => setAddressInput(e.target.value)}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              {profile.phone && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 text-center bg-gray-100 text-gray-500 font-bold py-3 rounded-xl active:scale-[0.98] transition-transform"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] text-white font-bold py-3 rounded-xl active:scale-[0.98] transition-transform"
              >
                Salvar
              </button>
            </div>
          </form>
        )}

        {!editing && profile.phone && (
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EA4B92] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{profile.name || 'Sem nome'}</p>
                  <p className="text-xs text-gray-400">{profile.phone}</p>
                </div>
              </div>
              <button
                onClick={startEditing}
                aria-label="Editar perfil"
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Pencil size={13} className="text-gray-500" />
              </button>
            </div>

            {profile.address && (
              <div className="text-sm text-gray-500 border-t border-gray-50 pt-3">
                <span className="text-xs text-gray-400 block mb-0.5">Endereço</span>
                {profile.address}
              </div>
            )}

            <Link
              to="/meus-pedidos"
              className="w-full text-center bg-gradient-to-r from-[#EA4B92] to-[#7C3AED] text-white font-bold py-3 rounded-xl active:scale-[0.98] transition-transform"
            >
              Ver meus pedidos
            </Link>

            <button
              onClick={handleLogout}
              className="w-full text-center text-sm font-semibold text-[#EA4B92] py-2"
            >
              Sair
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
