import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Gift, Copy, Share2, Check, Hourglass, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ToastFn } from '../../components';
import { Header } from './IngredientsPage';
import { engagementApi, ReferralData, ReferralStatus } from '../engagementApi';

// Rótulo traduzido na renderização: t(`referral.status.${status}`).
const STATUS_META: Record<ReferralStatus, { cls: string; icon: typeof Gift }> = {
  pending: { cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', icon: Hourglass },
  valid: { cls: 'text-green-600 bg-green-50 dark:bg-green-900/30', icon: CheckCircle2 },
  rewarded: { cls: 'text-primary-600 bg-primary-50 dark:bg-primary-900/30', icon: Gift },
  invalid: { cls: 'text-gray-400 bg-gray-100 dark:bg-gray-700', icon: XCircle },
};

/** Indique e ganhe — mesma tela do app (ReferralScreen). */
export function ReferralPage({ toast }: { toast: ToastFn }) {
  const { t } = useTranslation('account');
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    engagementApi.getReferrals()
      .then(setData)
      .catch(() => toast.error(t('referral.loadError')))
      .finally(() => setLoading(false));
  }, [toast]);

  const code = data?.code ?? null;
  const link = code ? `${window.location.origin}/app?ref=${encodeURIComponent(code)}` : '';
  const message = code ? t('referral.shareMessage', { code, link }) : '';

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('referral.copyError'));
    }
  };

  const share = async () => {
    if (!code) return;
    if (navigator.share) {
      try { await navigator.share({ text: message }); return; } catch { /* cancelado → cai no WhatsApp */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  };

  if (loading) {
    return (
      <div>
        <Header title={t('referral.title')} />
        <div className="flex justify-center py-16"><Loader2 size={26} className="animate-spin text-primary-500" /></div>
      </div>
    );
  }

  const target = data?.target ?? 5;
  const cycle = data?.cycle ?? 0;
  const remaining = data?.remainingToReward ?? target;
  const card = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700';

  return (
    <div className="max-w-2xl">
      <Header title={t('referral.title')} subtitle={t('referral.subtitle')} />

      <div className="rounded-xl p-5 bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm mb-4">
        <div className="flex items-center gap-2"><Gift size={20} /><p className="font-bold">{t('referral.howItWorks')}</p></div>
        <p className="text-sm text-white/90 mt-1">
          <Trans t={t} i18nKey="referral.howItWorksText" values={{ target }} components={{ b: <b /> }} />
        </p>
      </div>

      <div className={`${card} p-5 mb-4 text-center`}>
        <p className="text-[11px] font-semibold tracking-widest text-gray-400">{t('referral.yourCode')}</p>
        <p className="text-3xl font-extrabold tracking-wider text-gray-900 dark:text-white my-2">{code ?? '—'}</p>
        <div className="flex justify-center gap-2">
          <button onClick={copy} disabled={!code}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 px-4 py-2 text-sm font-semibold text-primary-600 disabled:opacity-50">
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? t('referral.copied') : t('referral.copy')}
          </button>
          <button onClick={share} disabled={!code}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <Share2 size={15} /> {t('referral.share')}
          </button>
        </div>
        {link && <p className="mt-3 text-xs text-gray-400 break-all">{link}</p>}
      </div>

      <div className={`${card} p-5 mb-4`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('referral.progress')}</p>
          <p className="text-sm font-bold text-primary-600">{cycle}/{target}</p>
        </div>
        <div className="flex gap-2 mt-3">
          {Array.from({ length: target }).map((_, i) => (
            <span key={i} className={`flex-1 h-2.5 rounded-full ${i < cycle ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {remaining === target
            ? t('referral.remainingFull', { count: target })
            : t('referral.remaining', { count: remaining })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {([[t('referral.validCount'), data?.validCount ?? 0], [t('referral.pendingCount'), data?.pendingCount ?? 0], [t('referral.rewards'), data?.rewardsEarned ?? 0]] as const).map(([label, n]) => (
          <div key={label} className={`${card} p-3 text-center`}>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{n}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{t('referral.yourReferrals')}</p>
      {data && data.history.length > 0 ? (
        <div className={`${card} divide-y divide-gray-100 dark:divide-gray-700`}>
          {data.history.map((h, idx) => {
            const meta = STATUS_META[h.status];
            const Icon = meta.icon;
            return (
              <div key={idx} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.cls}`}><Icon size={16} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{h.companyName}</p>
                  <p className="text-xs text-gray-400 truncate">{h.emailMasked}</p>
                </div>
                <span className={`text-xs font-semibold ${meta.cls.split(' ')[0]}`}>{t(`referral.status.${h.status}`)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">{t('referral.empty')}</p>
      )}
    </div>
  );
}
