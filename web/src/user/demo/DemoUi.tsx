import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { PlayCircle, Sparkles, X } from 'lucide-react';
import { ModalOverlay } from '../../components';
import { DEMO_BLOCKED_EVENT } from './demoMode';

/** Faixa fixa no topo enquanto a pessoa explora a demonstração. */
export function DemoBanner({ onCreateAccount, onExit }: { onCreateAccount: () => void; onExit: () => void }) {
  const { t } = useTranslation('app');
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm text-white">
      <PlayCircle size={16} className="shrink-0" />
      <span className="flex-1 min-w-0">
        <Trans t={t} i18nKey="demo.banner" components={{ b: <b /> }} />
      </span>
      <button onClick={onCreateAccount} className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-primary-600 hover:bg-primary-50">
        {t('demo.createAccount')}
      </button>
      <button onClick={onExit} className="text-xs text-white/80 hover:text-white hover:underline">
        {t('demo.exit')}
      </button>
    </div>
  );
}

/**
 * Convite para criar a conta quando uma ação não existe na demonstração
 * (pagamento, envio, dados da conta) — o mesmo papel do useDemoGuard do app.
 */
export function DemoBlockedModal({ onCreateAccount }: { onCreateAccount: () => void }) {
  const { t } = useTranslation('app');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(DEMO_BLOCKED_EVENT, show);
    return () => window.removeEventListener(DEMO_BLOCKED_EVENT, show);
  }, []);

  if (!open) return null;
  return (
    <ModalOverlay onClose={() => setOpen(false)}>
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center space-y-3 w-full sm:max-w-sm mx-auto">
        <button onClick={() => setOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600" aria-label={t('demo.close')}>
          <X size={18} />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto">
          <Sparkles size={22} className="text-primary-500" />
        </div>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('demo.blockedTitle')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t('demo.blockedText')}
        </p>
        <button onClick={onCreateAccount} className="w-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg py-2.5">
          {t('demo.createAccount')}
        </button>
        <button onClick={() => setOpen(false)} className="w-full text-sm text-gray-500 hover:underline">
          {t('demo.keepExploring')}
        </button>
      </div>
    </ModalOverlay>
  );
}
