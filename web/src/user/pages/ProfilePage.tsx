import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { getLang } from '../../i18n';
import { Crown, Mail, AtSign, Phone, Building2, Sparkles, Clock, ArrowUpCircle, CreditCard, QrCode, Smartphone, Gift, Trash2, ExternalLink, MessageCircle, Send } from 'lucide-react';
import { userApi, effectiveTier, PlanTier, PixSubscription } from '../userApi';
import { engagementApi, SUPPORT_WHATSAPP } from '../engagementApi';
import { useAuth } from '../UserAuthContext';
import { ToastFn, ConfirmModal } from '../../components';
import { Header, FormField, inputClass } from './IngredientsPage';
import { SubscribeModal } from '../SubscribeModal';
import { TIER_META } from '../plan';
import { CurrencySettings } from '../CurrencySettings';
import { WebPushSettings } from '../WebPushSettings';
import { isDemoMode } from '../demo/demoMode';

function remaining(iso: string, t: TFunction): { big: string; bigUnit: string; expired: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { big: t('profile.expired'), bigUnit: '', expired: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return { big: String(days), bigUnit: t('profile.daysLeft', { count: days }), expired: false };
  if (hours >= 1) return { big: String(hours), bigUnit: t('profile.hoursLeft', { count: hours }), expired: false };
  return { big: '< 1', bigUnit: t('profile.hoursLeft', { count: 1 }), expired: false };
}

/** Data curta no idioma da interface. */
function fmtDay(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString(getLang() === 'en' ? 'en-US' : 'pt-BR');
}

export function ProfilePage({ toast }: { toast: ToastFn }) {
  const { user, setUser, logout, refresh } = useAuth();
  const { t } = useTranslation('account');
  const [companyName, setCompanyName] = useState(user?.companyName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [instagram, setInstagram] = useState(user?.instagramHandle ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Tier no qual abrir o modal de assinatura (null = fechado).
  const [subscribeTier, setSubscribeTier] = useState<PlanTier | null>(null);

  // Gerenciar assinatura (mesmas opções da tela Meu Plano do app)
  const [pixSub, setPixSub] = useState<PixSubscription | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [confirmCancelPix, setConfirmCancelPix] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const platform = user?.premiumPlatform ?? null;
  useEffect(() => {
    if (platform !== 'pix') return;
    userApi.getPixSubscription().then(setPixSub).catch(() => setPixSub(null));
  }, [platform]);

  if (!user) return null;
  const tier = effectiveTier(user);

  const openPortal = async () => {
    setPlanBusy(true);
    try {
      const { url } = await userApi.openStripePortal(window.location.origin + window.location.pathname);
      window.location.href = url;
    } catch (err) {
      toast.error((err as Error).message || t('profile.portalError'));
      setPlanBusy(false);
    }
  };

  const cancelPix = async () => {
    setConfirmCancelPix(false);
    setPlanBusy(true);
    try {
      await userApi.cancelPixSubscription();
      setPixSub(null);
      await refresh();
      toast.success(t('profile.pixCancelled'));
    } catch (err) {
      toast.error((err as Error).message || t('profile.cancelError'));
    } finally {
      setPlanBusy(false);
    }
  };

  const sendSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return toast.error(t('profile.suggestionEmpty'));
    setSendingSuggestion(true);
    try {
      await engagementApi.sendSuggestion(suggestion.trim());
      toast.success(t('profile.suggestionSent'));
      setSuggestion('');
    } catch (err) {
      toast.error((err as Error).message || t('profile.sendError'));
    } finally {
      setSendingSuggestion(false);
    }
  };

  const deleteAccount = async () => {
    setConfirmDelete(false);
    try {
      await userApi.deleteAccount();
      toast.success(t('profile.accountDeleted'));
      logout();
    } catch (err) {
      toast.error((err as Error).message || t('profile.deleteError'));
    }
  };

  const ORIGIN: Record<string, { label: string; icon: typeof CreditCard }> = {
    card: { label: t('profile.origin.card'), icon: CreditCard },
    pix: { label: t('profile.origin.pix'), icon: QrCode },
    ios: { label: t('profile.origin.ios'), icon: Smartphone },
    android: { label: t('profile.origin.android'), icon: Smartphone },
    manual: { label: t('profile.origin.manual'), icon: Gift },
  };
  const origin = platform ? ORIGIN[platform] : null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return toast.error(t('profile.errStoreName'));
    setSavingProfile(true);
    try {
      const updated = await userApi.updateProfile({
        companyName: companyName.trim(),
        phone: phone.trim() || null,
        instagramHandle: instagram.trim() || null,
      });
      setUser(updated);
      setCompanyName(updated.companyName);
      toast.success(t('profile.profileUpdated'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error(t('profile.errPasswordLength'));
    setSavingPassword(true);
    try {
      await userApi.changePassword(currentPassword, newPassword);
      toast.success(t('profile.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Header title={t('profile.title')} />

      {/* Cartão de identidade */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Building2 size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white truncate">{user.companyName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Mail size={13} /> {user.email}
            </p>
          </div>
        </div>

        <div className="mt-4">
          {tier === 'free' ? (
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Crown size={16} />
                <span className="font-semibold">{t('profile.freePlan')}</span>
              </div>
              <p className="text-sm text-white/80 mt-1">{t('profile.freePlanHint')}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setSubscribeTier('premium')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white text-primary-600 rounded-lg px-3 py-2 hover:bg-primary-50 transition-colors"
                >
                  <Sparkles size={14} /> {t('profile.subscribeTier', { tier: 'Premium' })}
                </button>
                <button
                  onClick={() => setSubscribeTier('master')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold bg-purple-700/90 text-white rounded-lg px-3 py-2 hover:bg-purple-800 transition-colors"
                >
                  <Crown size={14} /> {t('profile.subscribeTier', { tier: 'Master' })}
                </button>
              </div>
            </div>
          ) : (
            <div className={`rounded-lg px-4 py-3 ${tier === 'master' ? 'bg-purple-50 dark:bg-purple-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
              <div className={`flex items-center gap-2 ${TIER_META[tier].color}`}>
                <Crown size={16} />
                <span className="font-semibold">{t('profile.tierActive', { tier: TIER_META[tier].label })}</span>
              </div>
              {user.premiumUntil && (() => {
                const rem = remaining(user.premiumUntil, t);
                const accent = tier === 'master' ? 'text-purple-600 dark:text-purple-300' : 'text-amber-600 dark:text-amber-300';
                return (
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-3xl font-extrabold leading-none ${rem.expired ? 'text-red-500' : accent}`}>{rem.big}</span>
                      <span className={`text-sm font-medium ${accent}/80`}>{rem.bigUnit}</span>
                    </div>
                    <p className={`text-xs ${accent}/70 mt-1 flex items-center gap-1.5`}>
                      <Clock size={12} />
                      {rem.expired ? t('profile.expiredOn', { date: fmtDay(user.premiumUntil) }) : t('profile.expiresOn', { date: fmtDay(user.premiumUntil) })}
                    </p>
                  </div>
                );
              })()}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setSubscribeTier(tier)}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-white transition-colors ${tier === 'master' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                >
                  <Sparkles size={14} /> {t('profile.renewTier', { tier: TIER_META[tier].label })}
                </button>
                {tier === 'premium' && (
                  <button
                    onClick={() => setSubscribeTier('master')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-2 transition-colors"
                  >
                    <ArrowUpCircle size={14} /> {t('profile.upgradeMaster')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gerenciar assinatura */}
      {tier !== 'free' && origin && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5 space-y-3">
          <p className="font-semibold text-gray-900 dark:text-white">{t('profile.manage')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
            <origin.icon size={15} className="text-gray-400" /> {t('profile.paymentMethod')} <span className="font-medium">{origin.label}</span>
          </p>

          {platform === 'card' && (
            <>
              <button
                onClick={openPortal}
                disabled={planBusy}
                className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ExternalLink size={14} /> {t('profile.changeCard')}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.portalHint')}</p>
            </>
          )}

          {platform === 'pix' && (pixSub && pixSub.status === 'authorized' ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('profile.autoRenewActive', { plan: pixSub.planLabel })}
                {pixSub.nextPaymentDate ? t('profile.nextCharge', { date: fmtDay(pixSub.nextPaymentDate) }) : ''}
              </p>
              <button
                onClick={() => setConfirmCancelPix(true)}
                disabled={planBusy}
                className="text-sm font-semibold rounded-lg px-3 py-2 border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                {t('profile.cancelAutoRenew')}
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.oneTimeHint')}</p>
          ))}

          {(platform === 'ios' || platform === 'android') && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('profile.mobileSubPrefix')}{' '}
              <a
                href={platform === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions'}
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 font-medium hover:underline"
              >
                {platform === 'ios' ? 'App Store' : 'Google Play'}
              </a>.
            </p>
          )}
        </div>
      )}

      {/* Editar perfil */}
      <form
        onSubmit={saveProfile}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5 space-y-4"
      >
        <p className="font-semibold text-gray-900 dark:text-white">{t('profile.storeData')}</p>
        <FormField label={t('profile.storeName')}>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} maxLength={255} required disabled={savingProfile} className={inputClass} />
        </FormField>
        <FormField label={t('profile.phone')}>
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass + ' pl-9'} />
          </div>
        </FormField>
        <FormField label="Instagram">
          <div className="relative">
            <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              placeholder={t('profile.instagramPlaceholder')}
              className={inputClass + ' pl-9'}
            />
          </div>
        </FormField>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="text-sm px-4 py-2 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white"
          >
            {savingProfile ? t('profile.saving') : t('profile.save')}
          </button>
        </div>
      </form>

      {/* Trocar senha */}
      <form
        onSubmit={savePassword}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4"
      >
        <p className="font-semibold text-gray-900 dark:text-white">{t('profile.changePassword')}</p>
        <FormField label={t('profile.currentPassword')}>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} />
        </FormField>
        <FormField label={t('profile.newPassword')}>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
        </FormField>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPassword}
            className="text-sm px-4 py-2 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white"
          >
            {savingPassword ? t('profile.saving') : t('profile.changePassword')}
          </button>
        </div>
      </form>

      {/* Ajuda e sugestões (iguais ao app) */}
      <form
        onSubmit={sendSuggestion}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mt-5 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-gray-900 dark:text-white">{t('profile.help')}</p>
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(t('profile.whatsappMessage', { name: user.companyName }))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 hover:underline"
          >
            <MessageCircle size={15} /> {t('profile.whatsapp')}
          </a>
        </div>
        <textarea
          value={suggestion}
          onChange={e => setSuggestion(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={t('profile.suggestionPlaceholder')}
          className={inputClass}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sendingSuggestion || !suggestion.trim()}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white"
          >
            <Send size={14} /> {sendingSuggestion ? t('profile.sending') : t('profile.sendSuggestion')}
          </button>
        </div>
      </form>

      {!isDemoMode() && <WebPushSettings toast={toast} />}

      <CurrencySettings />

      {/* Excluir conta (LGPD) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/50 p-5 mt-5">
        <p className="font-semibold text-red-600 dark:text-red-400">{t('profile.deleteTitle')}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {t('profile.deleteHint')}
          {tier !== 'free' && platform && platform !== 'manual' ? t('profile.deleteCancelFirst') : ''}
        </p>
        <button
          onClick={() => setConfirmDelete(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-red-500 hover:bg-red-600 text-white"
        >
          <Trash2 size={14} /> {t('profile.deleteButton')}
        </button>
      </div>

      <ConfirmModal
        open={confirmCancelPix}
        title={t('profile.confirmCancelTitle')}
        message={t('profile.confirmCancelMessage')}
        confirmLabel={t('profile.confirmCancelLabel')}
        onConfirm={cancelPix}
        onCancel={() => setConfirmCancelPix(false)}
      />
      <ConfirmModal
        open={confirmDelete}
        title={t('profile.confirmDeleteTitle')}
        message={t('profile.confirmDeleteMessage')}
        confirmLabel={t('profile.confirmDeleteLabel')}
        onConfirm={deleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />

      {subscribeTier && (
        <SubscribeModal initialTier={subscribeTier} onClose={() => setSubscribeTier(null)} toast={toast} />
      )}
    </div>
  );
}
