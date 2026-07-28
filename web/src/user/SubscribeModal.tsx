import { useEffect, useState } from 'react';
import { Sparkles, Copy, Check, Clock, Loader2, ArrowUpCircle } from 'lucide-react';
import { ModalOverlay, ToastFn } from '../components';
import { userApi, PixConfig, PixPlanConfig, PixRequestStatus, PlanTier, effectiveTier } from './userApi';
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
  onClose,
  toast,
}: {
  initialTier: PlanTier;
  onClose: () => void;
  toast: ToastFn;
}) {
  const { user } = useAuth();
  const currentTier = effectiveTier(user);

  const [config, setConfig] = useState<PixConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<'premium' | 'master'>(initialTier === 'master' ? 'master' : 'premium');
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [status, setStatus] = useState<PixRequestStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [legacyMonthly, setLegacyMonthly] = useState(false);

  // Upgrade Premium→Master (paga só a diferença)
  const [upgradeDiff, setUpgradeDiff] = useState<number | null>(null);
  const [upgradeQr, setUpgradeQr] = useState<{ base64?: string; copyPaste?: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cfg, st, up] = await Promise.all([
          userApi.getPlanConfig().catch(() => null),
          userApi.getPixStatus().catch(() => null),
          currentTier === 'premium' ? userApi.previewUpgrade().catch(() => null) : Promise.resolve(null),
        ]);
        if (!active) return;
        setConfig(cfg?.pix ?? null);
        if (st?.amount_cents === LEGACY_MONTHLY_CENTS && st?.plan_tier !== 'master') setLegacyMonthly(true);
        if (st && st.status === 'pending') setStatus(st);
        if (up?.eligible && up.diffCents && up.diffCents > 0) setUpgradeDiff(up.diffCents);
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

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const confirmPaid = async () => {
    setSubmitting(true);
    try {
      const cycleLabel = effectiveCycle === 'monthly' ? 'mensal' : 'anual';
      const label = `Plano ${TIER_META[tier].label} ${cycleLabel}`;
      const res = await userApi.createPixRequest(label, selected.amountCents, tier);
      setStatus(res);
      toast.success('Solicitação enviada! Aguarde a confirmação do pagamento.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const startUpgrade = async () => {
    setSubmitting(true);
    try {
      const res = await userApi.upgradeToMaster();
      setUpgradeQr({ base64: res.mp_qr_code_base64, copyPaste: res.mp_qr_code });
      setStatus(res.status === 'pending' ? res : null);
      toast.success('PIX da diferença gerado! Pague e aguarde a confirmação.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const meta = TIER_META[tier];

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4 w-full sm:max-w-md mx-auto">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles size={18} className="text-primary-500" /> Assinar via PIX
        </h3>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 size={24} className="animate-spin-slow text-primary-500" />
          </div>
        ) : status && status.status === 'pending' ? (
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
            <Clock size={28} className="mx-auto text-amber-500 mb-2" />
            <p className="font-semibold text-amber-700 dark:text-amber-300">Pagamento em análise</p>
            <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mt-1">
              Recebemos sua solicitação. Assim que o PIX for confirmado, seu plano é liberado.
            </p>
          </div>
        ) : (
          <>
            {/* Abas de tier */}
            <div className="grid grid-cols-2 gap-2">
              {(['premium', 'master'] as const).map(t => {
                const on = tier === t;
                const m = TIER_META[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTier(t); setUpgradeQr(null); }}
                    className={`rounded-xl border-2 p-3 text-center transition-colors ${
                      on ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{m.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {plans[t].monthly.priceLabel}/mês
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
                    Você já é Premium — migre para o Master pagando só a diferença de{' '}
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
                    hint="Pague o PIX da diferença e aguarde a confirmação. Seu plano Master é liberado automaticamente."
                  />
                ) : (
                  <button
                    onClick={startUpgrade}
                    disabled={submitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin-slow" /> : <ArrowUpCircle size={16} />}
                    Gerar PIX da diferença
                  </button>
                )}
                <p className="text-[11px] text-purple-700/70 dark:text-purple-300/70 text-center">
                  Ou assine o Master cheio abaixo.
                </p>
              </div>
            ) : null}

            {/* Assinatura normal */}
            {!upgradeQr && (
              <>
                {showAnnual && (
                  <div className="grid grid-cols-2 gap-2">
                    {(['monthly', 'annual'] as const).map(c => {
                      const on = cycle === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCycle(c)}
                          className={`rounded-xl border-2 p-3 text-center transition-colors ${
                            on ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{c === 'monthly' ? 'Mensal' : 'Anual'}</span>
                          <span className="block text-base font-bold text-gray-900 dark:text-white">
                            {plans[tier][c].priceLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selected.copyPaste ? (
                  <PixPayBlock
                    qrImage={selected.qrImage}
                    copyPaste={selected.copyPaste}
                    priceLabel={selected.priceLabel}
                    copied={copied}
                    onCopy={() => copy(selected.copyPaste)}
                    hint={`Pague o PIX (${selected.priceLabel}) e toque em "Já fiz o pagamento". Seu plano é liberado após a confirmação.`}
                  />
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Este plano ainda não tem PIX configurado. Fale com o suporte.
                  </p>
                )}

                {selected.copyPaste && (
                  <button
                    onClick={confirmPaid}
                    disabled={submitting}
                    className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin-slow" /> : <Check size={16} />}
                    Já fiz o pagamento
                  </button>
                )}
              </>
            )}
          </>
        )}

        <button onClick={onClose} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline">
          Fechar
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
  const imgSrc = qrBase64 ? `data:image/png;base64,${qrBase64}` : qrImage || '';
  return (
    <div className="space-y-3">
      {imgSrc ? (
        <img src={imgSrc} alt="QR Code PIX" className="w-44 h-44 mx-auto rounded-lg border border-gray-200 dark:border-gray-700" />
      ) : null}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">PIX copia e cola ({priceLabel})</p>
        <div className="flex items-center gap-2">
          <input readOnly value={copyPaste} className={inputClass + ' text-xs'} />
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 flex items-center gap-1 text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white rounded-lg px-3 py-2"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
    </div>
  );
}
