import { useState, useEffect } from 'react';
import { Crown, Mail, AtSign, Phone, Building2, Sparkles, Copy, Check, Clock, Loader2 } from 'lucide-react';
import { userApi, PixConfig, PixRequestStatus } from '../userApi';
import { useAuth } from '../UserAuthContext';
import { ToastFn, ModalOverlay } from '../../components';
import { formatDate } from '../format';
import { Header, FormField, inputClass } from './IngredientsPage';

function remaining(iso: string): { big: string; bigUnit: string; expired: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { big: 'Expirado', bigUnit: '', expired: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return { big: String(days), bigUnit: days === 1 ? 'dia restante' : 'dias restantes', expired: false };
  if (hours >= 1) return { big: String(hours), bigUnit: hours === 1 ? 'hora restante' : 'horas restantes', expired: false };
  return { big: '< 1', bigUnit: 'hora restante', expired: false };
}

export function ProfilePage({ toast }: { toast: ToastFn }) {
  const { user, setUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [instagram, setInstagram] = useState(user?.instagramHandle ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [renewOpen, setRenewOpen] = useState(false);

  if (!user) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await userApi.updateProfile({
        phone: phone.trim() || null,
        instagramHandle: instagram.trim() || null,
      });
      setUser(updated);
      toast.success('Perfil atualizado.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('A nova senha deve ter ao menos 6 caracteres.');
    setSavingPassword(true);
    try {
      await userApi.changePassword(currentPassword, newPassword);
      toast.success('Senha alterada.');
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
      <Header title="Meu perfil" />

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
          {user.isPremium ? (
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Crown size={16} />
                <span className="font-semibold">Premium ativo</span>
              </div>
              {user.premiumUntil && (() => {
                const rem = remaining(user.premiumUntil);
                return (
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-3xl font-extrabold leading-none ${rem.expired ? 'text-red-500' : 'text-amber-600 dark:text-amber-300'}`}>
                        {rem.big}
                      </span>
                      <span className="text-sm font-medium text-amber-700/80 dark:text-amber-300/80">{rem.bigUnit}</span>
                    </div>
                    <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-1 flex items-center gap-1.5">
                      <Clock size={12} />
                      {rem.expired ? `Expirou em ${formatDate(user.premiumUntil)}` : `Expira em ${formatDate(user.premiumUntil)}`}
                    </p>
                  </div>
                );
              })()}
              <button
                onClick={() => setRenewOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-2 transition-colors"
              >
                <Sparkles size={14} /> Renovar premium
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Crown size={16} />
                <span className="font-semibold">Plano gratuito</span>
              </div>
              <p className="text-sm text-white/80 mt-1">Assine o premium para liberar todos os recursos.</p>
              <button
                onClick={() => setRenewOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold bg-white text-primary-600 rounded-lg px-3 py-2 hover:bg-primary-50 transition-colors"
              >
                <Sparkles size={14} /> Assinar premium
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editar contato */}
      <form
        onSubmit={saveProfile}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5 space-y-4"
      >
        <p className="font-semibold text-gray-900 dark:text-white">Contato</p>
        <FormField label="Telefone">
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
              placeholder="@suaconfeitaria"
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
            {savingProfile ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>

      {/* Trocar senha */}
      <form
        onSubmit={savePassword}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4"
      >
        <p className="font-semibold text-gray-900 dark:text-white">Alterar senha</p>
        <FormField label="Senha atual">
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Nova senha">
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPassword}
            className="text-sm px-4 py-2 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white"
          >
            {savingPassword ? 'Salvando...' : 'Alterar senha'}
          </button>
        </div>
      </form>

      {renewOpen && <RenewModal onClose={() => setRenewOpen(false)} toast={toast} />}
    </div>
  );
}

// Valor (centavos) do mensal legado de R$ 10,00. Quem já pagou esse valor mantém
// o preço antigo na renovação (mesma regra do app mobile).
const LEGACY_MONTHLY_CENTS = 1000;
const LEGACY_MONTHLY: PixConfig['monthly'] = {
  amountCents: 1000,
  priceLabel: 'R$ 10,00',
  copyPaste: '00020126330014BR.GOV.BCB.PIX011103381053280520400005303986540510.005802BR5901N6001C62100506mensal63041609',
  qrImage: '/qrcode-pix-monthly-legacy.png',
};

// Dados de PIX embutidos (fallback) — iguais aos do app mobile, usados quando
// o painel web ainda não tem uma config própria de PIX.
const DEFAULT_PIX: PixConfig = {
  monthly: {
    amountCents: 1490,
    priceLabel: 'R$ 14,90',
    copyPaste: '00020126330014BR.GOV.BCB.PIX011103381053280520400005303986540514.905802BR5901N6001C62150511mensalidade630450C7',
    qrImage: '/qrcode-pix-monthly.png',
  },
  annual: {
    amountCents: 12000,
    priceLabel: 'R$ 120,00',
    copyPaste: '00020126330014BR.GOV.BCB.PIX0111033810532805204000053039865406120.005802BR5901N6001C62090505ANUAL6304F5D2',
    qrImage: '/qrcode-pix-annual.png',
  },
};

/** Usa os valores do servidor quando existem; senão, o embutido. */
function mergePlan(server: PixConfig['monthly'] | undefined, fallback: PixConfig['monthly']) {
  if (!server || !server.copyPaste) return fallback;
  return {
    amountCents: server.amountCents || fallback.amountCents,
    priceLabel: server.priceLabel || fallback.priceLabel,
    copyPaste: server.copyPaste,
    qrImage: server.qrImage || fallback.qrImage,
  };
}

function RenewModal({ onClose, toast }: { onClose: () => void; toast: ToastFn }) {
  const [config, setConfig] = useState<PixConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [status, setStatus] = useState<PixRequestStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  // Assinante legado (já pagou o mensal de R$ 10,00) → mantém esse preço
  const [legacyMonthly, setLegacyMonthly] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cfg, st] = await Promise.all([
          userApi.getPlanConfig().catch(() => null),
          userApi.getPixStatus().catch(() => null),
        ]);
        if (!active) return;
        setConfig(cfg?.pix ?? null);
        if (st?.amount_cents === LEGACY_MONTHLY_CENTS) setLegacyMonthly(true);
        if (st && st.status === 'pending') setStatus(st);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Sempre há dados: servidor (se houver) ou o embutido.
  // Mensal legado (R$ 10,00) tem prioridade para quem já pagava esse valor.
  const effective: PixConfig = {
    monthly: legacyMonthly ? LEGACY_MONTHLY : mergePlan(config?.monthly, DEFAULT_PIX.monthly),
    annual: mergePlan(config?.annual, DEFAULT_PIX.annual),
  };
  const selected = effective[plan];

  const copyCode = async () => {
    if (!selected?.copyPaste) return;
    try {
      await navigator.clipboard.writeText(selected.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const confirmPaid = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const label = plan === 'monthly' ? 'Plano mensal' : 'Plano anual';
      const res = await userApi.createPixRequest(label, selected.amountCents);
      setStatus(res);
      toast.success('Solicitação enviada! Aguarde a confirmação do pagamento.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4 w-full sm:max-w-md mx-auto">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles size={18} className="text-primary-500" /> Renovar premium via PIX
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
              Recebemos sua solicitação. Assim que o PIX for confirmado, seu premium é liberado.
            </p>
          </div>
        ) : (
          <>
            {/* Seleção de plano */}
            <div className="grid grid-cols-2 gap-2">
              {(['monthly', 'annual'] as const).map(p => {
                const cfg = effective[p];
                const on = plan === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    className={`rounded-xl border-2 p-3 text-center transition-colors ${
                      on ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {p === 'monthly' ? 'Mensal' : 'Anual'}
                    </span>
                    <span className="block text-base font-bold text-gray-900 dark:text-white">{cfg.priceLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* QR */}
            {selected.qrImage ? (
              <img src={selected.qrImage} alt="QR Code PIX" className="w-44 h-44 mx-auto rounded-lg border border-gray-200 dark:border-gray-700" />
            ) : null}

            {/* Copia e cola */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">PIX copia e cola</p>
              <div className="flex items-center gap-2">
                <input readOnly value={selected.copyPaste} className={inputClass + ' text-xs'} />
                <button
                  type="button"
                  onClick={copyCode}
                  className="shrink-0 flex items-center gap-1 text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white rounded-lg px-3 py-2"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <ol className="text-xs text-gray-500 dark:text-gray-400 list-decimal list-inside space-y-0.5">
              <li>Abra o app do seu banco e pague o PIX ({selected.priceLabel}).</li>
              <li>Depois toque em "Já fiz o pagamento".</li>
              <li>Seu premium é liberado após a confirmação.</li>
            </ol>

            <button
              onClick={confirmPaid}
              disabled={submitting}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin-slow" /> : <Check size={16} />}
              Já fiz o pagamento
            </button>
          </>
        )}

        <button onClick={onClose} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline">
          Fechar
        </button>
      </div>
    </ModalOverlay>
  );
}
