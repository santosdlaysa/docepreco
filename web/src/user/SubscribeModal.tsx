import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLang } from '../i18n';
import { Sparkles, Copy, Check, Clock, Loader2, ArrowUpCircle, CreditCard, QrCode } from 'lucide-react';
import { ModalOverlay, ToastFn } from '../components';
import { userApi, PixConfig, PixPlanConfig, PixRequestStatus, PlanTier, effectiveTier, PixSubscription } from './userApi';
import { useAuth } from './UserAuthContext';
import { TIER_META } from './plan';
import { inputClass } from './pages/IngredientsPage';

// Valor (centavos) do mensal legado de R$ 10,00 — quem já pagava mantém o preço.
const LEGACY_MONTHLY_CENTS = 1000;
const LEGACY_MONTHLY: PixPlanConfig = {
  amountCents: 1000,
  priceLabel: 'R$ 10,00',
  copyPaste: '00020126330014BR.GOV.BCB.PIX011103381053280520400005303986540510.005802BR5901N6001C62100506mensal63041609',
  qrImage: '/qrcode-pix-monthly-legacy.png',
};

// Fallbacks embutidos (usados quando o painel não tem config própria de PIX).
const DEFAULT_PIX: Required<PixConfig> = {
  monthly: {
    amountCents: 1490, priceLabel: 'R$ 14,90',
    copyPaste: '00020126330014BR.GOV.BCB.PIX011103381053280520400005303986540514.905802BR5901N6001C62150511mensalidade630450C7',
    qrImage: '/qrcode-pix-monthly.png',
  },
  annual: {
    amountCents: 12000, priceLabel: 'R$ 120,00',
    copyPaste: '00020126330014BR.GOV.BCB.PIX0111033810532805204000053039865406120.005802BR5901N6001C62090505ANUAL6304F5D2',
    qrImage: '/qrcode-pix-annual.png',
  },
  masterMonthly: {
    amountCents: 3000, priceLabel: 'R$ 30,00', copyPaste: '', qrImage: '',
  },
  masterAnnual: {
    amountCents: 30000, priceLabel: 'R$ 300,00', copyPaste: '', qrImage: '',
  },
};

function mergePlan(server: PixPlanConfig | undefined, fallback: PixPlanConfig): PixPlanConfig {
  if (!server || !server.copyPaste) return fallback;
  return {
    amountCents: server.amountCents || fallback.amountCents,
    priceLabel: server.priceLabel || fallback.priceLabel,
    copyPaste: server.copyPaste,
    qrImage: server.qrImage || fallback.qrImage,
  };
}

type Cycle = 'monthly' | 'annual';

export function SubscribeModal({
  initialTier,
  source = 'manual',
  onClose,
  toast,
}: {
  initialTier: PlanTier;
  source?: string;
  onClose: () => void;
  toast: ToastFn;
}) {
  const { user, refresh } = useAuth();
  const { t } = useTranslation('account');
  const currentTier = effectiveTier(user);
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    const target = initialTier === 'master' ? 'master' : 'premium';
    userApi.trackConversion('offer_viewed', source, target);
  }, [source, initialTier]);

  const [config, setConfig] = useState<PixConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tier, setTier] = useState<'premium' | 'master'>(initialTier === 'master' ? 'master' : 'premium');
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [status, setStatus] = useState<PixRequestStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [legacyMonthly, setLegacyMonthly] = useState(false);
  const [offer, setOffer] = useState<{ discountPercent: number; expiresAt: string } | null>(null);
  const [offerQr, setOfferQr] = useState<PixRequestStatus | null>(null);
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  // PIX: 'once' = QR avulso (padrão atual); 'auto' = Pix Automático (renova sozinho, igual ao app)
  const [pixMode, setPixMode] = useState<'once' | 'auto'>('once');
  const [pixSub, setPixSub] = useState<PixSubscription | null>(null);
  const [subWaiting, setSubWaiting] = useState(false);
  // Cupom (só no PIX avulso). O servidor reaplica o desconto ao gerar o QR.
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponQr, setCouponQr] = useState<PixRequestStatus | null>(null);

  useEffect(() => {
    userApi.getPixSubscription()
      .then(sub => { if (sub && (sub.status === 'authorized' || sub.status === 'pending')) setPixSub(sub); })
      .catch(() => {});
  }, []);

  // Enquanto o link de autorização do Mercado Pago está aberto, confere a cada 5s.
  useEffect(() => {
    if (!subWaiting) return;
    const id = setInterval(async () => {
      try {
        const sub = await userApi.getPixSubscription();
        if (sub?.status === 'authorized') {
          clearInterval(id);
          setPixSub(sub);
          setSubWaiting(false);
          toast.success(t('subscribe.autoActivated'));
          await refresh();
        }
      } catch { /* tenta de novo */ }
    }, 5000);
    return () => clearInterval(id);
  }, [subWaiting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Upgrade Premium→Master (paga só a diferença)
  const [upgradeDiff, setUpgradeDiff] = useState<number | null>(null);
  const [upgradeQr, setUpgradeQr] = useState<{ base64?: string; copyPaste?: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cfg, st, up, discountOffer] = await Promise.all([
          userApi.getPlanConfig().catch(() => null),
          userApi.getPixStatus().catch(() => null),
          currentTier === 'premium' ? userApi.previewUpgrade().catch(() => null) : Promise.resolve(null),
          userApi.getDiscountOffer(),
        ]);
        if (!active) return;
        setConfig(cfg?.pix ?? null);
        setOffer(discountOffer);
        if (st?.amount_cents === LEGACY_MONTHLY_CENTS && st?.plan_tier !== 'master') setLegacyMonthly(true);
        if (st && st.status === 'pending' && !discountOffer) setStatus(st);
        if (up?.eligible && up.diffCents && up.diffCents > 0) setUpgradeDiff(up.diffCents);
      } catch {
        if (active) setLoadError(true);
        toast.error(t('subscribe.loadError'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [currentTier]);

  // Master é só mensal (mesma regra do app). Ao trocar para master, volta ao mensal.
  const showAnnual = tier === 'premium';
  const effectiveCycle: Cycle = showAnnual ? cycle : 'monthly';

  const plans = {
    premium: {
      monthly: legacyMonthly ? LEGACY_MONTHLY : mergePlan(config?.monthly, DEFAULT_PIX.monthly),
      annual: mergePlan(config?.annual, DEFAULT_PIX.annual),
    },
    master: {
      monthly: mergePlan(config?.masterMonthly, DEFAULT_PIX.masterMonthly),
      annual: mergePlan(config?.masterAnnual, DEFAULT_PIX.masterAnnual),
    },
  };
  const selected = plans[tier][effectiveCycle];

  const canUpgrade = tier === 'master' && currentTier === 'premium' && upgradeDiff != null;
  const fmtCents = (c: number) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;

  const trackCheckout = () => {
    userApi.trackConversion('offer_clicked', source, tier);
    userApi.trackConversion('checkout_started', source, tier);
  };

  const copy = async (text: string) => {
    trackCheckout();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('subscribe.copyError'));
    }
  };

  const confirmPaid = async () => {
    trackCheckout();
    setSubmitting(true);
    try {
      const cycleLabel = effectiveCycle === 'monthly' ? 'mensal' : 'anual';
      const label = `Plano ${TIER_META[tier].label} ${cycleLabel}`;
      const res = await userApi.createPixRequest(label, selected.amountCents, tier);
      setStatus(res);
      toast.success(t('subscribe.requestSent'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const generateOfferPix = async () => {
    trackCheckout();
    setSubmitting(true);
    try {
      const result = await userApi.createPixRequest(`Plano ${TIER_META[tier].label} ${effectiveCycle === 'monthly' ? 'mensal' : 'anual'}`, selected.amountCents, tier);
      if (!result.mp_qr_code) throw new Error(t('subscribe.discountPixError'));
      setOfferQr(result);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const startUpgrade = async () => {
    trackCheckout();
    setSubmitting(true);
    try {
      const res = await userApi.upgradeToMaster();
      setUpgradeQr({ base64: res.mp_qr_code_base64, copyPaste: res.mp_qr_code });
      setStatus(res.status === 'pending' ? res : null);
      toast.success(t('subscribe.upgradePixGenerated'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setSubmitting(true);
    setCouponError(null);
    const result = await userApi.validateCoupon(code);
    if (result) {
      setCoupon({ code, discountPercent: result.discountPercent });
      setCouponInput(code);
    } else {
      setCoupon(null);
      setCouponError(t('subscribe.couponInvalid'));
    }
    setSubmitting(false);
  };
  const removeCoupon = () => { setCoupon(null); setCouponInput(''); setCouponError(null); setCouponQr(null); };

  const generateCouponPix = async () => {
    if (!coupon) return;
    trackCheckout();
    setSubmitting(true);
    try {
      const label = `Plano ${TIER_META[tier].label} ${effectiveCycle === 'monthly' ? 'mensal' : 'anual'}`;
      const result = await userApi.createPixRequest(label, selected.amountCents, tier, coupon.code);
      if (!result.mp_qr_code) throw new Error(t('subscribe.discountPixError'));
      setCouponQr(result);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Pix Automático: cria a assinatura e abre o Mercado Pago para autorizar uma única vez.
  const subscribeAuto = async () => {
    trackCheckout();
    setSubmitting(true);
    try {
      const label = `Plano ${TIER_META[tier].label} ${effectiveCycle === 'monthly' ? 'mensal' : 'anual'}`;
      const sub = await userApi.subscribePix(label, selected.amountCents, tier, effectiveCycle === 'annual' ? 12 : 1);
      setPixSub(sub);
      if (sub.status === 'authorized') {
        toast.success(t('subscribe.autoAlreadyActive'));
        await refresh();
      } else if (sub.initPoint) {
        window.open(sub.initPoint, '_blank', 'noopener');
        setSubWaiting(true);
      } else {
        toast.error(t('subscribe.authLinkError'));
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const couponCents = coupon ? Math.max(0, Math.round(selected.amountCents * (100 - coupon.discountPercent) / 100)) : null;

  // Cartão: redireciona para o checkout do Stripe; na volta a UserApp acompanha a liberação.
  const payWithCard = async () => {
    trackCheckout();
    setSubmitting(true);
    try {
      const returnUrl = window.location.origin + window.location.pathname;
      const { url } = await userApi.createCardCheckout(effectiveCycle, tier, returnUrl);
      window.location.href = url;
    } catch (err) {
      toast.error((err as Error).message || t('subscribe.cardError'));
      setSubmitting(false);
    }
  };

  const meta = TIER_META[tier];

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4 w-full sm:max-w-md mx-auto">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles size={18} className="text-primary-500" /> {t('subscribe.title')}
        </h3>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 size={24} className="animate-spin-slow text-primary-500" />
          </div>
        ) : loadError ? (
          <p role="alert" className="text-sm text-red-500">{t('subscribe.loadErrorInline')}</p>
        ) : status && status.status === 'pending' ? (
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
            <Clock size={28} className="mx-auto text-amber-500 mb-2" />
            <p className="font-semibold text-amber-700 dark:text-amber-300">{t('subscribe.pendingTitle')}</p>
            <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mt-1">
              {t('subscribe.pendingText')}
            </p>
          </div>
        ) : (
          <>
            {/* Abas de tier */}
            <div className="grid grid-cols-2 gap-2">
              {(['premium', 'master'] as const).map(tk => {
                const on = tier === tk;
                const m = TIER_META[tk];
                return (
                  <button
                    key={tk}
                    type="button"
                    disabled={submitting}
                    onClick={() => { setTier(tk); setUpgradeQr(null); setOfferQr(null); }}
                    className={`rounded-xl border-2 p-3 text-center transition-colors ${
                      on ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{m.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {t('subscribe.perMonth', { price: plans[tk].monthly.priceLabel })}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Lista do que o plano inclui */}
            <ul className="space-y-1">
              {meta.features.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Check size={15} className={`${meta.color} shrink-0 mt-0.5`} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Fluxo de UPGRADE (premium ativo migrando para master) */}
            {canUpgrade ? (
              <div className="rounded-xl border-2 border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ArrowUpCircle size={18} className="text-purple-600 dark:text-purple-300 shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    {t('subscribe.upgradeText')}{' '}
                    <span className="font-bold">{fmtCents(upgradeDiff!)}</span>.
                  </p>
                </div>

                {upgradeQr ? (
                  <PixPayBlock
                    qrBase64={upgradeQr.base64}
                    copyPaste={upgradeQr.copyPaste ?? ''}
                    priceLabel={fmtCents(upgradeDiff!)}
                    copied={copied}
                    onCopy={() => copy(upgradeQr.copyPaste ?? '')}
                    hint={t('subscribe.upgradeHint')}
                  />
                ) : (
                  <button
                    onClick={startUpgrade}
                    disabled={submitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin-slow" /> : <ArrowUpCircle size={16} />}
                    {t('subscribe.generateUpgradePix')}
                  </button>
                )}
                <p className="text-[11px] text-purple-700/70 dark:text-purple-300/70 text-center">
                  {t('subscribe.orFullMaster')}
                </p>
              </div>
            ) : null}

            {/* Assinatura normal */}
            {!upgradeQr && (
              <>
                {/* Forma de pagamento */}
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 dark:bg-gray-700/50 p-1">
                  {([['pix', t('subscribe.methodPix'), QrCode], ['card', t('subscribe.methodCard'), CreditCard]] as const).map(([m, label, Icon]) => (
                    <button
                      key={m}
                      type="button"
                      disabled={submitting}
                      onClick={() => setMethod(m)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
                        method === m ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
                {showAnnual && (
                  <div className="grid grid-cols-2 gap-2">
                    {(['monthly', 'annual'] as const).map(c => {
                      const on = cycle === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          disabled={submitting}
                          onClick={() => { setCycle(c); setOfferQr(null); }}
                          className={`rounded-xl border-2 p-3 text-center transition-colors ${
                            on ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{c === 'monthly' ? t('subscribe.monthly') : t('subscribe.annual')}</span>
                          <span className="block text-base font-bold text-gray-900 dark:text-white">
                            {plans[tier][c].priceLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {method === 'pix' && !offer && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {([['once', t('subscribe.pixOnce'), t('subscribe.pixOnceHint')], ['auto', t('subscribe.pixAuto'), t('subscribe.pixAutoHint')]] as const).map(([m, title, sub]) => (
                        <button
                          key={m}
                          type="button"
                          disabled={submitting}
                          onClick={() => { setPixMode(m); setCouponQr(null); }}
                          className={`rounded-xl border-2 p-2.5 text-left transition-colors ${
                            pixMode === m ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <span className="block text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
                          <span className="block text-[11px] text-gray-500 dark:text-gray-400">{sub}</span>
                        </button>
                      ))}
                    </div>

                    {pixMode === 'once' && !couponQr && (
                      coupon ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm">
                          <span className="text-green-700 dark:text-green-300 font-medium">
                            {t('subscribe.couponApplied', { code: coupon.code, percent: coupon.discountPercent })}{' '}
                            <s className="text-gray-400 font-normal">{selected.priceLabel}</s> {fmtCents(couponCents!)}
                          </span>
                          <button type="button" onClick={removeCoupon} className="text-xs text-gray-500 hover:underline">{t('subscribe.remove')}</button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex gap-2">
                            <input
                              value={couponInput}
                              onChange={e => { setCouponInput(e.target.value); setCouponError(null); }}
                              placeholder={t('subscribe.couponPlaceholder')}
                              className={inputClass}
                            />
                            <button type="button" onClick={applyCoupon} disabled={submitting || !couponInput.trim()}
                              className="shrink-0 rounded-lg border border-primary-300 px-3 text-sm font-semibold text-primary-600 disabled:opacity-50">
                              {t('subscribe.apply')}
                            </button>
                          </div>
                          {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                        </div>
                      )
                    )}
                  </div>
                )}

                {method === 'card' ? (
                  <div className="space-y-2">
                    <button
                      onClick={payWithCard}
                      disabled={submitting}
                      className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin-slow" /> : <CreditCard size={16} />}
                      {effectiveCycle === 'monthly' ? t('subscribe.payCardMonthly') : t('subscribe.payCardAnnual')}
                    </button>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
                      {t('subscribe.cardHint')}
                      {offer ? t('subscribe.offerPixOnly') : ''}
                    </p>
                  </div>
                ) : offer ? (
                  <div className="space-y-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 p-4">
                    <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">{t('subscribe.offerTitle', { percent: offer.discountPercent })}</p>
                    <p className="text-xs text-gray-500">{t('subscribe.offerValid', { date: new Date(offer.expiresAt).toLocaleString(getLang() === 'en' ? 'en-US' : 'pt-BR') })}</p>
                    {offerQr?.mp_qr_code ? <PixPayBlock
                      qrBase64={offerQr.mp_qr_code_base64} copyPaste={offerQr.mp_qr_code}
                      priceLabel={fmtCents(offerQr.amount_cents!)} copied={copied}
                      onCopy={() => copy(offerQr.mp_qr_code!)} hint={t('subscribe.payThisPix')} />
                      : <button onClick={generateOfferPix} disabled={submitting}
                        className="w-full rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                        {submitting ? t('subscribe.generatingPix') : t('subscribe.generateDiscountPix')}
                      </button>}
                  </div>
                ) : pixMode === 'auto' ? (
                  pixSub?.status === 'authorized' ? (
                    <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 text-center">
                      <Check size={22} className="mx-auto text-green-600 mb-1" />
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300">{t('subscribe.autoActiveTitle')}</p>
                      <p className="text-xs text-green-700/80 dark:text-green-300/80 mt-1">{t('subscribe.autoActiveHint', { plan: pixSub.planLabel })}</p>
                    </div>
                  ) : subWaiting || pixSub?.status === 'pending' ? (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 p-4 text-center space-y-2">
                      <Loader2 size={22} className="mx-auto text-amber-500 animate-spin-slow" />
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{t('subscribe.waitingAuth')}</p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/80">{t('subscribe.waitingAuthHint')}</p>
                      {pixSub?.initPoint && (
                        <a href={pixSub.initPoint} target="_blank" rel="noopener noreferrer" onClick={() => setSubWaiting(true)}
                          className="inline-block text-sm font-semibold text-primary-600 hover:underline">
                          {t('subscribe.openAuth')}
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ol className="text-xs text-gray-600 dark:text-gray-300 space-y-1 list-decimal pl-4">
                        <li>{t('subscribe.autoStep1')}</li>
                        <li>{t(effectiveCycle === 'monthly' ? 'subscribe.autoStep2Monthly' : 'subscribe.autoStep2Annual', { price: selected.priceLabel })}</li>
                        <li>{t('subscribe.autoStep3')}</li>
                      </ol>
                      <button onClick={subscribeAuto} disabled={submitting}
                        className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2">
                        {submitting ? <Loader2 size={16} className="animate-spin-slow" /> : <Check size={16} />}
                        {t('subscribe.activateAuto')}
                      </button>
                    </div>
                  )
                ) : coupon ? (
                  couponQr?.mp_qr_code ? (
                    <PixPayBlock
                      qrBase64={couponQr.mp_qr_code_base64}
                      copyPaste={couponQr.mp_qr_code}
                      priceLabel={fmtCents(couponQr.amount_cents ?? couponCents!)}
                      copied={copied}
                      onCopy={() => copy(couponQr.mp_qr_code!)}
                      hint={t('subscribe.payAutoConfirm')}
                    />
                  ) : (
                    <button onClick={generateCouponPix} disabled={submitting}
                      className="w-full rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      {submitting ? t('subscribe.generatingPix') : t('subscribe.generatePixOf', { price: fmtCents(couponCents!) })}
                    </button>
                  )
                ) : selected.copyPaste ? (
                  <PixPayBlock
                    qrImage={selected.qrImage}
                    copyPaste={selected.copyPaste}
                    priceLabel={selected.priceLabel}
                    copied={copied}
                    onCopy={() => copy(selected.copyPaste)}
                    hint={t('subscribe.staticHint', { price: selected.priceLabel })}
                  />
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    {t('subscribe.noPix')}
                  </p>
                )}

                {method === 'pix' && pixMode === 'once' && !coupon && !offer && selected.copyPaste && (
                  <button
                    onClick={confirmPaid}
                    disabled={submitting}
                    className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin-slow" /> : <Check size={16} />}
                    {t('subscribe.alreadyPaid')}
                  </button>
                )}
              </>
            )}
          </>
        )}

        <button onClick={onClose} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline">
          {t('subscribe.close')}
        </button>
      </div>
    </ModalOverlay>
  );
}

function PixPayBlock({
  qrImage,
  qrBase64,
  copyPaste,
  priceLabel,
  copied,
  onCopy,
  hint,
}: {
  qrImage?: string;
  qrBase64?: string;
  copyPaste: string;
  priceLabel: string;
  copied: boolean;
  onCopy: () => void;
  hint: string;
}) {
  const { t } = useTranslation('account');
  const imgSrc = qrBase64 ? `data:image/png;base64,${qrBase64}` : qrImage || '';
  return (
    <div className="space-y-3">
      {imgSrc ? (
        <img src={imgSrc} alt={t('subscribe.qrAlt')} className="w-44 h-44 mx-auto rounded-lg border border-gray-200 dark:border-gray-700" />
      ) : null}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('subscribe.copyPaste', { price: priceLabel })}</p>
        <div className="flex items-center gap-2">
          <input readOnly value={copyPaste} className={inputClass + ' text-xs'} />
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 flex items-center gap-1 text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white rounded-lg px-3 py-2"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? t('subscribe.copied') : t('subscribe.copy')}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
    </div>
  );
}
