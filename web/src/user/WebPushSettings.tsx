import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { ToastFn } from '../components';
import { currentSubscription, disableWebPush, enableWebPush, webPushSupport } from './webPush';

/** Liga/desliga as notificações do Doce Preço neste navegador (igual ao toggle do app). */
export function WebPushSettings({ toast }: { toast: ToastFn }) {
  const { t } = useTranslation('account');
  const support = webPushSupport();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void currentSubscription().then(sub => setEnabled(!!sub));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) {
        await disableWebPush();
        setEnabled(false);
        toast.success(t('webPush.disabled'));
      } else {
        await enableWebPush();
        setEnabled(true);
        toast.success(t('webPush.enabled'));
      }
    } catch (err) {
      toast.error((err as Error).message || t('webPush.toggleError'));
    } finally {
      setBusy(false);
    }
  };

  const hint =
    support === 'ios-needs-install'
      ? t('webPush.hintIos')
      : support === 'unsupported'
        ? t('webPush.hintUnsupported')
        : support === 'insecure'
          ? t('webPush.hintInsecure')
          : t('webPush.hintDefault');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {enabled ? <Bell size={16} className="text-primary-500" /> : <BellOff size={16} className="text-gray-400" />}
            {t('webPush.title')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t('webPush.title')}
          onClick={toggle}
          disabled={busy || support !== 'supported'}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          {busy
            ? <Loader2 size={14} className="absolute top-1 left-1/2 -translate-x-1/2 animate-spin text-white" />
            : <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />}
        </button>
      </div>
    </div>
  );
}
