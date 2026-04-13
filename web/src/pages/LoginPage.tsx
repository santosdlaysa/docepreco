import { useState } from 'react';
import { api, saveSecret } from '../lib/api';

interface Props {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: Props) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setError('');
    const ok = await api.verify(secret.trim());
    setLoading(false);
    if (ok) {
      saveSecret(secret.trim());
      onLogin();
    } else {
      setError('Senha incorreta.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center mb-3">
            <span className="text-2xl">🍰</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">DocePreço Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Acesso restrito</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha de administrador
            </label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !secret.trim()}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold rounded-lg py-2 text-sm transition-colors"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
