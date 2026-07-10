import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

const PHONE_KEY = 'dpeco_customer_phone';

export function PerfilPage() {
  const [phone, setPhone] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(PHONE_KEY);
    if (saved) {
      setPhone(saved);
      setPhoneInput(saved);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 8) {
      setError('Informe um telefone válido');
      return;
    }
    localStorage.setItem(PHONE_KEY, phoneInput.trim());
    setPhone(phoneInput.trim());
    setError('');
  };

  const handleLogout = () => {
    localStorage.removeItem(PHONE_KEY);
    setPhone('');
    setPhoneInput('');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
        <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight mb-1">Perfil</h1>
        <p className="text-gray-400 text-sm mb-5">
          {phone ? 'Sua identidade nas lojas do DocePreço.' : 'Entre com seu telefone para acompanhar seus pedidos.'}
        </p>

        {!phone && (
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Você ainda não entrou com seu telefone</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
                Entrar
              </button>
            </form>
          </div>
        )}

        {phone && (
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EA4B92] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-white" />
              </div>
              <span className="text-sm text-gray-500">
                Telefone: <span className="font-semibold text-gray-800">{phone}</span>
              </span>
            </div>

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
