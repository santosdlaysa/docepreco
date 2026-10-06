import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cake, Eye, EyeOff, Loader2, PlayCircle } from 'lucide-react';
import { wantsOpenRegister, clearOpenRegister } from './demo/demoMode';
import { useAuth } from './UserAuthContext';
import { userApi, ApiError } from './userApi';
import { LgpdModal } from './lgpd';
import { GoogleSignInButton, googleSignInEnabled } from './GoogleSignInButton';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

// Link de indicação: /app?ref=CODIGO abre direto no cadastro com o código preenchido.
const REF_FROM_URL = (() => {
  try { return new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase() ?? ''; } catch { return ''; }
})();

export function UserLoginPage() {
  const { login, register, startDemo } = useAuth();
  const { t } = useTranslation('account');
  // Vindo do "Criar conta grátis" da demonstração, abre direto no cadastro.
  const [mode, setMode] = useState<Mode>(() => (REF_FROM_URL || wantsOpenRegister() ? 'register' : 'login'));
  useEffect(() => { clearOpenRegister(); }, []);
  const [startingDemo, setStartingDemo] = useState(false);

  const tryDemo = async () => {
    setStartingDemo(true);
    try {
      await startDemo();
    } catch {
      setError(t('login.demoError'));
      setStartingDemo(false);
    }
  };
  const [referralCode, setReferralCode] = useState(REF_FROM_URL);

  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedLgpd, setAcceptedLgpd] = useState(false);
  const [showLgpd, setShowLgpd] = useState(false);

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
          setError(t('login.errCompany'));
          setLoading(false);
          return;
        }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10 || phoneDigits.length > 15) {
          setError(t('login.errPhone'));
          setLoading(false);
          return;
        }
        if (!acceptedLgpd) {
          setError(t('login.errLgpd'));
          setLoading(false);
          return;
        }
        await register(companyName.trim(), email.trim(), password, phone.trim(), instagramHandle.trim() || undefined, referralCode.trim() || undefined);
      } else if (mode === 'forgot') {
        await userApi.forgotPassword(email.trim());
        // O reset é por código: segue para a etapa de digitar o código e a nova senha.
        setMode('reset');
        setResetCode('');
        setPassword('');
        setInfo(t('login.codeSent'));
      } else {
        if (!resetCode.trim()) {
          setError(t('login.errCode'));
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError(t('login.errPasswordLength'));
          setLoading(false);
          return;
        }
        await userApi.resetPassword(email.trim(), resetCode.trim(), password);
        setMode('login');
        setPassword('');
        setInfo(t('login.passwordChanged'));
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('login.connectionError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === 'login' ? t('login.titleLogin') : mode === 'register' ? t('login.titleRegister') : mode === 'reset' ? t('login.titleReset') : t('login.titleForgot');

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
            <Field label={t('login.companyName')}>
              <input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder={t('login.companyPlaceholder')}
                className={inputClass}
                autoFocus
              />
            </Field>
          )}

          <Field label={t('login.email')}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              className={inputClass}
              autoFocus={mode !== 'register' && mode !== 'reset'}
            />
          </Field>

          {mode === 'register' && (
            <Field label={t('login.phone')}>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className={inputClass}
              />
            </Field>
          )}

          {mode === 'register' && (
            <Field label={t('login.instagram')}>
              <input
                value={instagramHandle}
                onChange={e => setInstagramHandle(e.target.value)}
                placeholder={t('login.instagramPlaceholder')}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={31}
                className={inputClass}
              />
            </Field>
          )}

          {mode === 'register' && (
            <Field label={t('login.referral')}>
              <input
                value={referralCode}
                onChange={e => setReferralCode(e.target.value.toUpperCase())}
                placeholder={t('login.referralPlaceholder')}
                autoCapitalize="characters"
                maxLength={20}
                className={inputClass}
              />
            </Field>
          )}

          {mode === 'reset' && (
            <Field label={t('login.resetCode')}>
              <input
                value={resetCode}
                onChange={e => setResetCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className={inputClass}
                autoFocus
              />
            </Field>
          )}

          {mode !== 'forgot' && (
            <Field label={mode === 'reset' ? t('login.newPassword') : t('login.password')}>
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

          {mode === 'register' && (
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedLgpd}
                onChange={e => setAcceptedLgpd(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-primary-500 shrink-0"
              />
              <span className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                {t('login.acceptPrefix')}{' '}
                <button type="button" onClick={() => setShowLgpd(true)} className={linkClass}>
                  {t('login.acceptLink')}
                </button>
                .
              </span>
            </label>
          )}

          {error && <p className="text-sm text-red-600 animate-fade-in">{error}</p>}
          {info && <p className="text-sm text-green-600 animate-fade-in">{info}</p>}

          <button
            type="submit"
            disabled={loading || (mode === 'register' && !acceptedLgpd)}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin-slow" />
                {t('login.wait')}
              </>
            ) : mode === 'login' ? (
              t('login.submitLogin')
            ) : mode === 'register' ? (
              t('login.submitRegister')
            ) : mode === 'reset' ? (
              t('login.submitReset')
            ) : (
              t('login.submitForgot')
            )}
          </button>
        </form>

        {googleSignInEnabled && (mode === 'login' || mode === 'register') && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /> {t('login.or')} <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
            <GoogleSignInButton onError={msg => setError(msg)} />
          </div>
        )}

        {mode === 'login' && (
          <button
            type="button"
            onClick={tryDemo}
            disabled={startingDemo}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary-300 dark:border-primary-700 py-2.5 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50"
          >
            {startingDemo ? <Loader2 size={16} className="animate-spin-slow" /> : <PlayCircle size={16} />}
            {t('login.tryDemo')}
          </button>
        )}

        <div className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
          {mode === 'login' && (
            <>
              <p>
                {t('login.noAccount')}{' '}
                <button onClick={() => switchMode('register')} className={linkClass}>
                  {t('login.createAccount')}
                </button>
              </p>
              <p>
                <button onClick={() => switchMode('forgot')} className={linkClass}>
                  {t('login.forgot')}
                </button>
              </p>
            </>
          )}
          {mode === 'reset' && (
            <p>
              <button onClick={() => switchMode('forgot')} className={linkClass}>
                {t('login.resend')}
              </button>
            </p>
          )}
          {mode !== 'login' && (
            <p>
              <button onClick={() => switchMode('login')} className={linkClass}>
                {t('login.backToLogin')}
              </button>
            </p>
          )}
        </div>
      </div>

      {showLgpd && (
        <LgpdModal
          onClose={() => setShowLgpd(false)}
          onAccept={() => { setAcceptedLgpd(true); setShowLgpd(false); }}
        />
      )}
    </div>
  );

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setInfo('');
    setAcceptedLgpd(false);
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
