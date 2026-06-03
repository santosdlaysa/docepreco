import { useState } from 'react';
import { Cake, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from './UserAuthContext';
import { userApi, ApiError } from './userApi';

type Mode = 'login' | 'register' | 'forgot';

export function UserLoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else if (mode === 'register') {
        if (!companyName.trim()) {
          setError('Informe o nome da sua confeitaria.');
          setLoading(false);
          return;
        }
        await register(companyName.trim(), email.trim(), password, phone.trim() || undefined);
      } else {
        await userApi.forgotPassword(email.trim());
        setInfo('Se o e-mail existir, enviamos instruções de recuperação.');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro de conexão. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === 'login' ? 'Entrar na sua conta' : mode === 'register' ? 'Criar conta' : 'Recuperar senha';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-3 shadow-md">
            <Cake size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">DocePreço</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <Field label="Nome da confeitaria">
              <input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Doces da Maria"
                className={inputClass}
                autoFocus
              />
            </Field>
          )}

          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className={inputClass}
              autoFocus={mode !== 'register'}
            />
          </Field>

          {mode === 'register' && (
            <Field label="Telefone (opcional)">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className={inputClass}
              />
            </Field>
          )}

          {mode !== 'forgot' && (
            <Field label="Senha">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass + ' pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
          )}

          {error && <p className="text-sm text-red-600 animate-fade-in">{error}</p>}
          {info && <p className="text-sm text-green-600 animate-fade-in">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin-slow" />
                Aguarde...
              </>
            ) : mode === 'login' ? (
              'Entrar'
            ) : mode === 'register' ? (
              'Criar conta'
            ) : (
              'Enviar'
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
          {mode === 'login' && (
            <>
              <p>
                Não tem conta?{' '}
                <button onClick={() => switchMode('register')} className={linkClass}>
                  Criar conta
                </button>
              </p>
              <p>
                <button onClick={() => switchMode('forgot')} className={linkClass}>
                  Esqueci minha senha
                </button>
              </p>
            </>
          )}
          {mode !== 'login' && (
            <p>
              <button onClick={() => switchMode('login')} className={linkClass}>
                Voltar para o login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setInfo('');
  }
}

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';
const linkClass = 'text-primary-600 dark:text-primary-400 font-medium hover:underline';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</label>
      {children}
    </div>
  );
}
