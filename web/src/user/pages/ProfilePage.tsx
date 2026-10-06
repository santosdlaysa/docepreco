import { useEffect, useState } from 'react';
import { Crown, Mail, AtSign, Phone, Building2, Sparkles, Clock, ArrowUpCircle, CreditCard, QrCode, Smartphone, Gift, Trash2, ExternalLink, MessageCircle, Send } from 'lucide-react';
import { userApi, effectiveTier, PlanTier, PixSubscription } from '../userApi';
import { engagementApi, SUPPORT_WHATSAPP } from '../engagementApi';
import { useAuth } from '../UserAuthContext';
import { ToastFn, ConfirmModal } from '../../components';
import { formatDate } from '../format';
import { Header, FormField, inputClass } from './IngredientsPage';
import { SubscribeModal } from '../SubscribeModal';
import { TIER_META } from '../plan';
import { CurrencySettings } from '../CurrencySettings';

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
  const { user, setUser, logout, refresh } = useAuth();
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
      toast.error((err as Error).message || 'Não foi possível abrir o gerenciamento da assinatura.');
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
      toast.success('Renovação automática cancelada.');
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível cancelar. Tente novamente.');
    } finally {
      setPlanBusy(false);
    }
  };

  const sendSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return toast.error('Escreva sua sugestão.');
    setSendingSuggestion(true);
    try {
      await engagementApi.sendSuggestion(suggestion.trim());
      toast.success('Sugestão enviada! Obrigado!');
      setSuggestion('');
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível enviar.');
    } finally {
      setSendingSuggestion(false);
    }
  };

  const deleteAccount = async () => {
    setConfirmDelete(false);
    try {
      await userApi.deleteAccount();
      toast.success('Conta excluída.');
      logout();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível excluir a conta.');
    }
  };

  const ORIGIN: Record<string, { label: string; icon: typeof CreditCard }> = {
    card: { label: 'Cartão de crédito', icon: CreditCard },
    pix: { label: 'PIX', icon: QrCode },
    ios: { label: 'Assinatura da App Store', icon: Smartphone },
    android: { label: 'Assinatura da Google Play', icon: Smartphone },
    manual: { label: 'Liberado pelo suporte', icon: Gift },
  };
  const origin = platform ? ORIGIN[platform] : null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return toast.error('Informe o nome da loja.');
    setSavingProfile(true);
    try {
      const updated = await userApi.updateProfile({
        companyName: companyName.trim(),
        phone: phone.trim() || null,
        instagramHandle: instagram.trim() || null,
      });
      setUser(updated);
      setCompanyName(updated.companyName);
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
          {tier === 'free' ? (
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Crown size={16} />
                <span className="font-semibold">Plano gratuito</span>
              </div>
              <p className="text-sm text-white/80 mt-1">Assine para liberar todos os recursos da sua confeitaria.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setSubscribeTier('premium')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white text-primary-600 rounded-lg px-3 py-2 hover:bg-primary-50 transition-colors"
                >
                  <Sparkles size={14} /> Assinar Premium
                </button>
                <button
                  onClick={() => setSubscribeTier('master')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold bg-purple-700/90 text-white rounded-lg px-3 py-2 hover:bg-purple-800 transition-colors"
                >
                  <Crown size={14} /> Assinar Master
                </button>
              </div>
            </div>
          ) : (
            <div className={`rounded-lg px-4 py-3 ${tier === 'master' ? 'bg-purple-50 dark:bg-purple-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
              <div className={`flex items-center gap-2 ${TIER_META[tier].color}`}>
                <Crown size={16} />
                <span className="font-semibold">{TIER_META[tier].label} ativo</span>
              </div>
              {user.premiumUntil && (() => {
                const rem = remaining(user.premiumUntil);
                const accent = tier === 'master' ? 'text-purple-600 dark:text-purple-300' : 'text-amber-600 dark:text-amber-300';
                return (
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-3xl font-extrabold leading-none ${rem.expired ? 'text-red-500' : accent}`}>{rem.big}</span>
                      <span className={`text-sm font-medium ${accent}/80`}>{rem.bigUnit}</span>
                    </div>
                    <p className={`text-xs ${accent}/70 mt-1 flex items-center gap-1.5`}>
                      <Clock size={12} />
                      {rem.expired ? `Expirou em ${formatDate(user.premiumUntil)}` : `Expira em ${formatDate(user.premiumUntil)}`}
                    </p>
                  </div>
                );
              })()}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setSubscribeTier(tier)}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-white transition-colors ${tier === 'master' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                >
                  <Sparkles size={14} /> Renovar {TIER_META[tier].label}
                </button>
                {tier === 'premium' && (
                  <button
                    onClick={() => setSubscribeTier('master')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-2 transition-colors"
                  >
                    <ArrowUpCircle size={14} /> Fazer upgrade para Master
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
          <p className="font-semibold text-gray-900 dark:text-white">Gerenciar assinatura</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
            <origin.icon size={15} className="text-gray-400" /> Forma de pagamento: <span className="font-medium">{origin.label}</span>
          </p>

          {platform === 'card' && (
            <>
              <button
                onClick={openPortal}
                disabled={planBusy}
                className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ExternalLink size={14} /> Trocar cartão ou cancelar
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">Abre o portal seguro do Stripe. Ao cancelar, o plano continua até o fim do período pago.</p>
            </>
          )}

          {platform === 'pix' && (pixSub && pixSub.status === 'authorized' ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Renovação automática ativa · {pixSub.planLabel}
                {pixSub.nextPaymentDate ? ` · próxima cobrança em ${formatDate(pixSub.nextPaymentDate)}` : ''}
              </p>
              <button
                onClick={() => setConfirmCancelPix(true)}
                disabled={planBusy}
                className="text-sm font-semibold rounded-lg px-3 py-2 border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                Cancelar renovação automática
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">Pagamento avulso: não há cobrança automática. Para continuar, renove antes do vencimento.</p>
          ))}

          {(platform === 'ios' || platform === 'android') && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Assinatura feita pelo celular. Para cancelar, use as assinaturas da{' '}
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
        <p className="font-semibold text-gray-900 dark:text-white">Dados da loja</p>
        <FormField label="Nome da loja">
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} maxLength={255} required disabled={savingProfile} className={inputClass} />
        </FormField>
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
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Nova senha">
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
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

      {/* Ajuda e sugestões (iguais ao app) */}
      <form
        onSubmit={sendSuggestion}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mt-5 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-gray-900 dark:text-white">Ajuda e sugestões</p>
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Olá! Sou ${user.companyName} e preciso de ajuda com o DocePreço.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 hover:underline"
          >
            <MessageCircle size={15} /> Falar no WhatsApp
          </a>
        </div>
        <textarea
          value={suggestion}
          onChange={e => setSuggestion(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Tem uma ideia para melhorar o DocePreço? Conta pra gente!"
          className={inputClass}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sendingSuggestion || !suggestion.trim()}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white"
          >
            <Send size={14} /> {sendingSuggestion ? 'Enviando...' : 'Enviar sugestão'}
          </button>
        </div>
      </form>

      <CurrencySettings />

      {/* Excluir conta (LGPD) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/50 p-5 mt-5">
        <p className="font-semibold text-red-600 dark:text-red-400">Excluir conta</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Apaga permanentemente sua conta e todos os dados (receitas, vendas, clientes, loja). Esta ação não pode ser desfeita.
          {tier !== 'free' && platform && platform !== 'manual' ? ' Cancele a assinatura antes, para não ser cobrada de novo.' : ''}
        </p>
        <button
          onClick={() => setConfirmDelete(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-red-500 hover:bg-red-600 text-white"
        >
          <Trash2 size={14} /> Excluir minha conta
        </button>
      </div>

      <ConfirmModal
        open={confirmCancelPix}
        title="Cancelar renovação automática"
        message="Seu plano continua ativo até o fim do período já pago. Deseja mesmo cancelar a renovação automática?"
        confirmLabel="Cancelar renovação"
        onConfirm={cancelPix}
        onCancel={() => setConfirmCancelPix(false)}
      />
      <ConfirmModal
        open={confirmDelete}
        title="Excluir conta definitivamente?"
        message="Todos os seus dados serão apagados para sempre. Essa ação não pode ser desfeita."
        confirmLabel="Sim, excluir"
        onConfirm={deleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />

      {subscribeTier && (
        <SubscribeModal initialTier={subscribeTier} onClose={() => setSubscribeTier(null)} toast={toast} />
      )}
    </div>
  );
}
