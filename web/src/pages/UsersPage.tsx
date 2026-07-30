import { useEffect, useState, useCallback } from 'react';
import { api, AdminUser, AdminUserDetail, PremiumEvent } from '../lib/api';
import { Skeleton, TableSkeleton, ModalOverlay, ToastFn } from '../components';
import { Crown, Search, ChevronLeft, ChevronRight, ChevronDown, Eye, Gift, AtSign, Filter, X, KeyRound, MessageCircle, Send, History, UserX, UserCheck, RefreshCw, Store, ExternalLink } from 'lucide-react';

interface Props {
  toast: ToastFn;
  onImpersonate?: (userId: string) => void;
}

type SortKey = 'createdAt' | 'recipeCount' | 'ingredientCount' | 'saleCount' | 'totalRevenue' | 'lastSeenAt';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    // +55 XX XXXXX-XXXX
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    // +55 XX XXXX-XXXX
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    // (XX) XXXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    // (XX) XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function PremiumBadge({ planTier, platform, isPremium = true }: { planTier: AdminUser['planTier']; platform: string | null; isPremium?: boolean }) {
  if (planTier === 'free' || !isPremium) return <span className="text-xs text-gray-400">Gratuito</span>;
  const label = tierBadgeLabel(planTier, platform);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
      <Crown size={12} />
      {label}
    </span>
  );
}

// DDDs válidos do Brasil (para o filtro por código de área).
const VALID_DDDS = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
];

function SignupPlatformBadge({ platform }: { platform: AdminUser['signupPlatform'] }) {
  if (!platform) return <span className="text-xs text-gray-400">Não informado</span>;
  return (
    <span className="inline-flex text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-full">
      {platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Web'}
    </span>
  );
}

function SortIcon({ active }: { active: boolean }) {
  return (
    <ChevronDown size={14} className={`inline ml-0.5 ${active ? 'text-primary-600' : 'text-gray-300'}`} />
  );
}

type PaidTier = 'premium' | 'master';

function tierLabel(tier: AdminUser['planTier'] | PaidTier): string {
  return tier === 'master' ? 'Master' : 'Premium';
}

function tierBadgeLabel(planTier: AdminUser['planTier'], platform: string | null): string {
  if (planTier === 'free') return 'Gratuito';
  const label = tierLabel(planTier);
  if (platform === 'ios') return `${label} • iOS`;
  if (platform === 'android') return `${label} • Android`;
  if (platform === 'manual') return `${label} • Manual`;
  return label;
}

function UserModal({
  userId,
  onClose,
  toast,
  onImpersonate,
  onWhatsApp,
  onUserUpdated,
}: {
  userId: string;
  onClose: () => void;
  toast: ToastFn;
  onImpersonate?: (userId: string) => void;
  onWhatsApp: (phone: string, name: string) => void;
  onUserUpdated?: (user: AdminUserDetail) => void;
}) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [premiumDays, setPremiumDays] = useState('30');
  const [grantingTrial, setGrantingTrial] = useState(false);
  const [trialDays, setTrialDays] = useState('3');
  const [notifTitle, setNotifTitle] = useState('Presente especial para você!');
  const [notifBody, setNotifBody] = useState('Você ganhou dias grátis de acesso ao DocePreço! Aproveite todos os recursos exclusivos.');
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [premiumHistory, setPremiumHistory] = useState<PremiumEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [signupPlatform, setSignupPlatform] = useState<'ios' | 'android' | 'web' | ''>('');
  const [savingSignupPlatform, setSavingSignupPlatform] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PaidTier>('premium');

  const toggleActive = async () => {
    if (!user) return;
    const newActive = !user.isActive;
    const action = newActive ? 'ativar' : 'desativar';
    if (!confirm(`Tem certeza que deseja ${action} o usuário ${user.companyName}?`)) return;
    setTogglingActive(true);
    try {
      await api.toggleUserActive(user.id, newActive);
      setUser({ ...user, isActive: newActive });
      toast.success(`Usuário ${newActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar status');
    } finally {
      setTogglingActive(false);
    }
  };

  useEffect(() => {
    api.getUser(userId).then(result => {
      setUser(result);
      setSignupPlatform(result.signupPlatform ?? '');
      setSelectedTier(result.planTier === 'master' ? 'master' : 'premium');
    }).catch(console.error);
    setLoadingHistory(true);
    api.getPremiumHistory(userId).then(setPremiumHistory).catch(console.error).finally(() => setLoadingHistory(false));
  }, [userId]);

  const saveSignupPlatform = async () => {
    if (!user) return;
    setSavingSignupPlatform(true);
    try {
      const value = signupPlatform || null;
      const result = await api.setSignupPlatform(user.id, value);
      setUser({ ...user, signupPlatform: result.signupPlatform });
      toast.success('Dispositivo de cadastro atualizado.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar dispositivo');
    } finally {
      setSavingSignupPlatform(false);
    }
  };

  const togglePremium = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let premiumUntil: string | null = null;
      const targetTier: PaidTier = selectedTier;
      if (!user.isPremium) {
        const days = parseInt(premiumDays);
        if (!days || days <= 0) {
          toast.error('Informe um período válido');
          setSaving(false);
          return;
        }
        const until = new Date();
        until.setDate(until.getDate() + days);
        premiumUntil = until.toISOString();
      }
      const res = await api.setPremium(user.id, !user.isPremium, premiumUntil, targetTier);
      const msg = user.isPremium
        ? `${tierLabel(user.planTier)} removido.`
        : `${tierLabel(targetTier)} ativado por ${premiumDays} dias!`;
      setUser(prev => prev ? {
        ...prev,
        isPremium: res.isPremium,
        planTier: res.planTier,
        premiumUntil: res.premiumUntil,
        premiumPlatform: res.premiumPlatform,
      } : prev);
      if (user) {
        onUserUpdated?.({
          ...user,
          isPremium: res.isPremium,
          planTier: res.planTier,
          premiumUntil: res.premiumUntil,
          premiumPlatform: res.premiumPlatform,
        });
      }
      toast.success(msg);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const grantTrial = async () => {
    if (!user) return;
    const days = parseInt(trialDays);
    if (!days || days <= 0) {
      toast.error('Informe um período válido');
      return;
    }
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast.error('Preencha o título e a mensagem da notificação');
      return;
    }
    setGrantingTrial(true);
    try {
      const res = await api.grantTrial(user.id, days, notifTitle.trim(), notifBody.trim(), selectedTier);
      const until = new Date(res.premiumUntil);
      setUser(prev => prev ? {
        ...prev,
        isPremium: true,
        planTier: res.planTier,
        premiumUntil: res.premiumUntil,
        premiumPlatform: 'manual',
      } : prev);
      if (user) {
        onUserUpdated?.({
          ...user,
          isPremium: true,
          planTier: res.planTier,
          premiumUntil: res.premiumUntil,
          premiumPlatform: 'manual',
        });
      }
      const notifMsg = res.notificationSent
        ? ' Notificação enviada!'
        : ' (usuário sem token de push — notificação não enviada)';
      toast.success(`${tierLabel(res.planTier)} ativado por ${days} dias até ${until.toLocaleDateString('pt-BR')}.${notifMsg}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao dar dias grátis');
    } finally {
      setGrantingTrial(false);
    }
  };

  const resetPassword = async () => {
    if (!user) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    setResettingPassword(true);
    try {
      await api.resetUserPassword(user.id, newPassword);
      toast.success(`Senha redefinida com sucesso para ${user.email}`);
      setNewPassword('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao redefinir senha');
    } finally {
      setResettingPassword(false);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  // Permite ao admin preencher/editar manualmente o valor pago de um evento de assinatura
  // (útil para pagamentos antigos cujo valor o sistema não capturou).
  const editAmount = async (ev: PremiumEvent) => {
    const current = ev.amountCents != null ? (ev.amountCents / 100).toFixed(2).replace('.', ',') : '';
    const input = window.prompt('Valor pago em R$ (ex.: 14,90). Deixe vazio para limpar:', current);
    if (input === null) return;
    const trimmed = input.trim();
    let cents: number | null;
    if (trimmed === '') {
      cents = null;
    } else {
      const reais = parseFloat(trimmed.replace(/[^\d,]/g, '').replace(',', '.'));
      if (isNaN(reais) || reais < 0) { toast.error('Valor inválido.'); return; }
      cents = Math.round(reais * 100);
    }
    try {
      await api.setPremiumEventAmount(ev.id, cents);
      setPremiumHistory(prev => prev.map(e => (e.id === ev.id ? { ...e, amountCents: cents } : e)));
      toast.success(cents == null ? 'Valor removido.' : 'Valor atualizado!');
    } catch {
      toast.error('Erro ao salvar o valor.');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">Detalhes do usuário</h3>
          <div className="flex items-center gap-2">
            {onImpersonate && (
              <button
                onClick={() => { onClose(); onImpersonate(userId); }}
                className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Eye size={15} />
                Ver cadastros
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
          </div>
        </div>

        {!user ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{user.companyName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              {user.phone && (
                <button
                  onClick={() => onWhatsApp(user.phone!, user.companyName)}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 mt-0.5"
                >
                  <MessageCircle size={13} />
                  {formatPhone(user.phone!)}
                </button>
              )}
              {user.instagramHandle && (
                <a
                  href={`https://instagram.com/${user.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1 mt-0.5"
                >
                  <AtSign size={13} />
                  @{user.instagramHandle}
                </a>
              )}
              <p className="text-xs text-gray-400 mt-1">Cadastrado em {fmtDate(user.createdAt)}</p>
              {user.lastSeenAt && (
                <p className="text-xs text-gray-400">Último acesso: {new Date(user.lastSeenAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(user.lastSeenAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200 block mb-2">
                Dispositivo de cadastro
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={signupPlatform}
                  onChange={e => setSignupPlatform(e.target.value as 'ios' | 'android' | 'web' | '')}
                  className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                >
                  <option value="">Não informado</option>
                  <option value="ios">iOS</option>
                  <option value="android">Android</option>
                  <option value="web">Web</option>
                </select>
                <button
                  onClick={saveSignupPlatform}
                  disabled={savingSignupPlatform || signupPlatform === (user.signupPlatform ?? '')}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingSignupPlatform ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Status do plano</p>
                  <div className="mt-1">
                    <PremiumBadge planTier={user.planTier} platform={user.premiumPlatform} isPremium={user.isPremium} />
                  </div>
                  {user.premiumUntil && (
                    <p className="text-xs text-gray-400 mt-1">
                      Válido até {fmtDate(user.premiumUntil)}
                    </p>
                  )}
                </div>
                <button
                  onClick={togglePremium}
                  disabled={saving}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                    user.isPremium
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                      : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }`}
                >
                  {saving ? '...' : user.isPremium ? 'Remover acesso' : `Dar ${tierLabel(selectedTier)}`}
                </button>
              </div>
              {!user.isPremium && (
                <>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Plano:</label>
                  <select
                    value={selectedTier}
                    onChange={e => setSelectedTier(e.target.value as PaidTier)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    <option value="premium">Premium</option>
                    <option value="master">Master</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Período:</label>
                  <select
                    value={premiumDays}
                    onChange={e => setPremiumDays(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    <option value="3">3 dias</option>
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                    <option value="90">3 meses</option>
                    <option value="180">6 meses</option>
                    <option value="365">1 ano</option>
                  </select>
                </div>
                </>
              )}
            </div>

            {!user.isPremium && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Gift size={16} className="text-green-600" />
                  <p className="text-sm font-medium text-green-800">Dar dias grátis + notificar</p>
                </div>
                <p className="text-xs text-green-600">Ativa o premium e envia uma notificação push com a mensagem que você escrever.</p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-green-700">Dias:</label>
                  <select
                    value={trialDays}
                    onChange={e => setTrialDays(e.target.value)}
                    className="text-sm border border-green-200 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    <option value="1">1 dia</option>
                    <option value="3">3 dias</option>
                    <option value="5">5 dias</option>
                    <option value="7">7 dias</option>
                    <option value="14">14 dias</option>
                    <option value="30">30 dias</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-green-700 block mb-1">Título da notificação</label>
                  <input
                    type="text"
                    value={notifTitle}
                    onChange={e => setNotifTitle(e.target.value)}
                    className="w-full text-sm border border-green-200 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                    placeholder="Ex: Presente especial para você!"
                  />
                </div>
                <div>
                  <label className="text-xs text-green-700 block mb-1">Mensagem da notificação</label>
                  <textarea
                    value={notifBody}
                    onChange={e => setNotifBody(e.target.value)}
                    rows={3}
                    className="w-full text-sm border border-green-200 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                    placeholder="Ex: Você ganhou 3 dias grátis de acesso Premium!"
                  />
                </div>
                <button
                  onClick={grantTrial}
                  disabled={grantingTrial}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
                >
                  <Gift size={14} />
                  {grantingTrial ? 'Enviando...' : 'Dar dias grátis e notificar'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Receitas', value: user.recipeCount },
                { label: 'Ingredientes', value: user.ingredientCount },
                { label: 'Vendas', value: user.saleCount },
                { label: 'Faturamento total', value: fmtCurrency(user.totalRevenue) },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="font-bold text-gray-900 dark:text-white mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>

            {user.storeName ? (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-purple-600" />
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Loja online</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    user.storeActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                  }`}>
                    {user.storeActive ? 'Publicada' : 'Não publicada'}
                  </span>
                </div>
                {user.storeActive && (
                  <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
                    (user.storeAcceptingOrders ?? true)
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {(user.storeAcceptingOrders ?? true) ? 'Aberta para pedidos' : 'Fechada para pedidos'}
                  </span>
                )}
                <p className="font-semibold text-gray-900 dark:text-white">{user.storeName}</p>
                {user.storeDescription && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">{user.storeDescription}</p>
                )}
                {user.storeSlug && (
                  <a
                    href={`/loja/${user.storeSlug}?preview=1&userId=${user.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <ExternalLink size={13} />
                    /loja/{user.storeSlug}
                  </a>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <p className="text-xs text-gray-400">Produtos no cardápio</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.storeProductCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Atendimento</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {[user.storeAcceptsDelivery && 'Entrega', user.storeAcceptsPickup && 'Retirada']
                        .filter(Boolean)
                        .join(' e ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Pedido mínimo</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user.storeMinOrderValue != null ? fmtCurrency(user.storeMinOrderValue) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Taxa de entrega</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user.storeDeliveryFee != null ? fmtCurrency(user.storeDeliveryFee) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 flex items-center gap-2">
                <Store size={16} className="text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loja online não configurada</p>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-orange-600" />
                <p className="text-sm font-medium text-orange-800">Redefinir senha</p>
              </div>
              <p className="text-xs text-orange-600">Defina uma senha temporária para o usuário. Ele poderá usá-la para entrar no app.</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  className="flex-1 text-sm border border-orange-200 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <button
                  onClick={resetPassword}
                  disabled={resettingPassword || newPassword.length < 6}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
                >
                  <KeyRound size={14} />
                  {resettingPassword ? 'Salvando...' : 'Redefinir'}
                </button>
              </div>
            </div>

            <div className={`${user.isActive !== false ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {user.isActive !== false ? (
                    <UserX size={16} className="text-red-600" />
                  ) : (
                    <UserCheck size={16} className="text-green-600" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${user.isActive !== false ? 'text-red-800' : 'text-green-800'}`}>
                      {user.isActive !== false ? 'Desativar usuário' : 'Usuário desativado'}
                    </p>
                    <p className={`text-xs ${user.isActive !== false ? 'text-red-600' : 'text-green-600'}`}>
                      {user.isActive !== false
                        ? 'O usuário não conseguirá mais fazer login no app.'
                        : 'O usuário está bloqueado e não consegue acessar o app.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleActive}
                  disabled={togglingActive}
                  className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    user.isActive !== false
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {user.isActive !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                  {togglingActive ? '...' : user.isActive !== false ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </div>

            {(premiumHistory.length > 0 || loadingHistory) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <History size={15} className="text-purple-500" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Histórico de assinatura</p>
                </div>
                {loadingHistory ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="space-y-2">
                    {premiumHistory.map(ev => {
                      const eventLabels: Record<string, { label: string; color: string }> = {
                        INITIAL_PURCHASE: { label: 'Assinou', color: 'text-green-600' },
                        RENEWAL: { label: 'Renovou', color: 'text-green-600' },
                        CANCELLATION: { label: 'Cancelou', color: 'text-yellow-600' },
                        EXPIRATION: { label: 'Expirou', color: 'text-red-600' },
                        BILLING_ISSUE: { label: 'Problema no pagamento', color: 'text-red-600' },
                        UNCANCELLATION: { label: 'Reativou', color: 'text-green-600' },
                        PRODUCT_CHANGE: { label: 'Trocou de plano', color: 'text-blue-600' },
                        TRANSFER: { label: 'Transferência', color: 'text-blue-600' },
                        SYNC: { label: 'Sync do app', color: 'text-gray-500' },
                        NON_RENEWING_PURCHASE: { label: 'Compra avulsa', color: 'text-green-600' },
                      };
                      const info = eventLabels[ev.eventType] ?? { label: ev.eventType, color: 'text-gray-600' };
                      const sourceLabel = ev.source === 'webhook' ? 'RevenueCat' : ev.source === 'app_sync' ? 'App' : ev.source;
                      const isCharge = ['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE'].includes(ev.eventType);
                      return (
                        <div key={ev.id} className="flex items-start justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                          <div>
                            <p className={`font-medium ${info.color}`}>
                              {info.label}
                              {ev.amountCents != null && ev.amountCents > 0 ? (
                                <button onClick={() => editAmount(ev)} title="Editar valor"
                                  className="ml-2 font-semibold text-green-600 hover:underline">
                                  {fmtCurrency(ev.amountCents / 100)}
                                </button>
                              ) : isCharge ? (
                                <button onClick={() => editAmount(ev)}
                                  className="ml-2 text-xs text-gray-400 hover:text-primary-600 hover:underline">
                                  + valor
                                </button>
                              ) : null}
                            </p>
                            <p className="text-xs text-gray-400">
                              {sourceLabel}
                              {ev.platform ? ` · ${ev.platform}` : ''}
                              {ev.productId ? ` · ${ev.productId}` : ''}
                            </p>
                            {ev.expirationAt && (
                              <p className="text-xs text-gray-400">
                                Validade: {new Date(ev.expirationAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 whitespace-nowrap ml-3">
                            {new Date(ev.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                            {new Date(ev.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {user.recentSales.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Últimas vendas</p>
                <div className="space-y-2">
                  {user.recentSales.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                      <div>
                        <p className="text-gray-800 dark:text-gray-100">{s.recipeName ?? '—'}</p>
                        <p className="text-xs text-gray-400">{fmtDate(s.saleDate)} · {s.quantitySold}x</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">{fmtCurrency(s.totalRevenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

function WhatsAppModal({ phone, contactName, onClose, toast }: { phone: string; contactName: string; onClose: () => void; toast: ToastFn }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const result = await api.whatsappSend(phone, message.trim());
      if (result.status === 'ERROR') {
        throw new Error('O WhatsApp recusou o envio da mensagem. Tente reconectar a instância e enviar novamente.');
      }
      if (result.status === 'PENDING') {
        if (result.key?.id) {
          let finalStatus: string | null = null;
          for (let attempt = 0; attempt < 15; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const current = await api.whatsappMessageStatus(result.key.id);
            finalStatus = current?.status ?? null;
            if (finalStatus === 'ERROR') {
              throw new Error('O WhatsApp recusou o envio da mensagem. Tente reconectar a instância e enviar novamente.');
            }
            if (finalStatus === 'SERVER_ACK' || finalStatus === 'DELIVERY_ACK' || finalStatus === 'READ') break;
          }
          if (finalStatus !== 'SERVER_ACK' && finalStatus !== 'DELIVERY_ACK' && finalStatus !== 'READ') {
            toast.error('O envio não foi confirmado pelo WhatsApp.');
            return;
          }
        }
        toast.success(`Mensagem enviada para ${contactName}!`);
      } else {
        toast.success(`Mensagem enviada para ${contactName}!`);
      }
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar';
      if (msg.includes('401') || msg.includes('not connected') || msg.includes('instance')) {
        toast.error('WhatsApp nao conectado. Conecte pelo painel de configuracoes.');
      } else {
        toast.error(msg);
      }
    } finally {
      setSending(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}${message ? `?text=${encoded}` : ''}`, '_blank');
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-full">
              <MessageCircle size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">WhatsApp</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{contactName} · {formatPhone(phone)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Digite sua mensagem..."
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 focus:bg-white dark:focus:bg-gray-600 resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
            }}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={handleOpenWhatsApp}
              className="text-xs text-gray-400 hover:text-green-600 transition-colors"
            >
              Abrir no WhatsApp Web
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
            >
              <Send size={14} />
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">Ctrl+Enter para enviar</p>
        </div>
      </div>
    </ModalOverlay>
  );
}

export function UsersPage({ toast, onImpersonate }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planTierFilter, setPlanTierFilter] = useState<'free' | 'premium' | 'master' | null>(null);
  const [signupPlatform, setSignupPlatform] = useState<'ios' | 'android' | 'web' | undefined>();
  const [ddd, setDdd] = useState<string | undefined>();
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);
  const [hasInstagram, setHasInstagram] = useState<boolean | null>(null);
  const [minRecipes, setMinRecipes] = useState<number | undefined>();
  const [minIngredients, setMinIngredients] = useState<number | undefined>();
  const [minSales, setMinSales] = useState<number | undefined>();
  const [minRevenue, setMinRevenue] = useState<number | undefined>();
  const [lastSeenDays, setLastSeenDays] = useState<number | undefined>();
  const [createdDays, setCreatedDays] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [whatsApp, setWhatsApp] = useState<{ phone: string; name: string } | null>(null);

  const activeFilterCount = [
    planTierFilter !== null,
    signupPlatform !== undefined,
    ddd !== undefined,
    hasPhone !== null,
    hasInstagram !== null,
    minRecipes !== undefined,
    minIngredients !== undefined,
    minSales !== undefined,
    minRevenue !== undefined,
    lastSeenDays !== undefined,
    createdDays !== undefined,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setPlanTierFilter(null);
    setSignupPlatform(undefined);
    setDdd(undefined);
    setHasPhone(null);
    setHasInstagram(null);
    setMinRecipes(undefined);
    setMinIngredients(undefined);
    setMinSales(undefined);
    setMinRevenue(undefined);
    setLastSeenDays(undefined);
    setCreatedDays(undefined);
    setPage(1);
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtDateTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listUsers({
        search, page, sortBy,
        planTier: planTierFilter ?? undefined,
        signupPlatform,
        ddd,
        hasPhone: hasPhone ?? undefined,
        hasInstagram: hasInstagram ?? undefined,
        minRecipes, minIngredients, minSales, minRevenue,
        lastSeenDays, createdDays,
      });
      setUsers(res.users);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, page, planTierFilter, signupPlatform, ddd, hasPhone, hasInstagram, minRecipes, minIngredients, minSales, minRevenue, lastSeenDays, createdDays, sortBy]);

  const updateUserInList = useCallback((updated: AdminUserDetail) => {
    setUsers(prev => prev.map(u => (u.id === updated.id ? {
      ...u,
      isPremium: updated.isPremium,
      planTier: updated.planTier,
      premiumUntil: updated.premiumUntil,
      premiumPlatform: updated.premiumPlatform,
      signupPlatform: updated.signupPlatform,
      isActive: updated.isActive,
    } : u)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSort = (key: SortKey) => {
    setSortBy(key);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20);

  const ColHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <th
      className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:text-primary-600 select-none whitespace-nowrap"
      onClick={() => handleSort(sortKey)}
    >
      {label}<SortIcon active={sortBy === sortKey} />
    </th>
  );

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Usuários</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{total} no total</span>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Busca + botão filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email, telefone ou instagram..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Filter size={15} />
          Filtros
          {activeFilterCount > 0 && (
            <span className="bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={14} />
            Limpar filtros
          </button>
        )}
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Plano</label>
            <select
              value={planTierFilter ?? ''}
              onChange={e => { setPlanTierFilter((e.target.value || null) as 'free' | 'premium' | 'master' | null); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos</option>
              <option value="free">Gratuito</option>
              <option value="premium">Premium</option>
              <option value="master">Master</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Dispositivo de cadastro</label>
            <select
              value={signupPlatform ?? ''}
              onChange={e => { setSignupPlatform((e.target.value || undefined) as 'ios' | 'android' | 'web' | undefined); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos</option>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
              <option value="web">Web</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Telefone</label>
            <select
              value={hasPhone === null ? '' : String(hasPhone)}
              onChange={e => { setHasPhone(e.target.value === '' ? null : e.target.value === 'true'); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos</option>
              <option value="true">Com telefone</option>
              <option value="false">Sem telefone</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">DDD</label>
            <select
              value={ddd ?? ''}
              onChange={e => { setDdd(e.target.value || undefined); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos</option>
              {VALID_DDDS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Instagram</label>
            <select
              value={hasInstagram === null ? '' : String(hasInstagram)}
              onChange={e => { setHasInstagram(e.target.value === '' ? null : e.target.value === 'true'); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos</option>
              <option value="true">Com instagram</option>
              <option value="false">Sem instagram</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Receitas (min)</label>
            <input
              type="number"
              min={0}
              placeholder="Ex: 1"
              value={minRecipes ?? ''}
              onChange={e => { setMinRecipes(e.target.value ? parseInt(e.target.value) : undefined); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Ingredientes (min)</label>
            <input
              type="number"
              min={0}
              placeholder="Ex: 1"
              value={minIngredients ?? ''}
              onChange={e => { setMinIngredients(e.target.value ? parseInt(e.target.value) : undefined); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Vendas (min)</label>
            <input
              type="number"
              min={0}
              placeholder="Ex: 1"
              value={minSales ?? ''}
              onChange={e => { setMinSales(e.target.value ? parseInt(e.target.value) : undefined); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Faturamento (min R$)</label>
            <input
              type="number"
              min={0}
              step={10}
              placeholder="Ex: 100"
              value={minRevenue ?? ''}
              onChange={e => { setMinRevenue(e.target.value ? parseFloat(e.target.value) : undefined); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Último acesso</label>
            <select
              value={lastSeenDays === undefined ? '' : String(lastSeenDays)}
              onChange={e => { setLastSeenDays(e.target.value === '' ? undefined : parseInt(e.target.value)); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos</option>
              <option value="1">Hoje</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="0">Nunca acessou</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Cadastro</label>
            <select
              value={createdDays === undefined ? '' : String(createdDays)}
              onChange={e => { setCreatedDays(e.target.value === '' ? undefined : parseInt(e.target.value)); setPage(1); }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos</option>
              <option value="1">Hoje</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1150px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Confeitaria</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-40">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Telefone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Instagram</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Dispositivo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Plano</th>
                <ColHeader label="Receitas"      sortKey="recipeCount" />
                <ColHeader label="Ingredientes"  sortKey="ingredientCount" />
                <ColHeader label="Vendas"        sortKey="saleCount" />
                <ColHeader label="Faturamento"   sortKey="totalRevenue" />
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:text-primary-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('lastSeenAt')}
                >
                  Último acesso<SortIcon active={sortBy === 'lastSeenAt'} />
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:text-primary-600 select-none"
                  onClick={() => handleSort('createdAt')}
                >
                  Cadastro<SortIcon active={sortBy === 'createdAt'} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && (
                <tr>
                  <td colSpan={12}>
                    <TableSkeleton rows={8} cols={8} />
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-gray-400">Nenhum usuário encontrado</td>
                </tr>
              )}
              {!loading && users.map((u, i) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 20}ms` }}
                  onClick={() => setSelectedId(u.id)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      {u.companyName}
                      {u.isActive === false && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Desativado</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-40">
                    <span className="block truncate" title={u.email}>{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.phone ? (
                      <button
                        className="text-green-600 hover:text-green-700 flex items-center gap-1"
                        onClick={e => { e.stopPropagation(); setWhatsApp({ phone: u.phone!, name: u.companyName }); }}
                      >
                        <MessageCircle size={14} />
                        {formatPhone(u.phone!)}
                      </button>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.instagramHandle ? (
                      <a
                        href={`https://instagram.com/${u.instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:text-pink-700 flex items-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <AtSign size={14} />
                        @{u.instagramHandle}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <SignupPlatformBadge platform={u.signupPlatform} />
                  </td>
                  <td className="px-4 py-3">
                    <PremiumBadge planTier={u.planTier} platform={u.premiumPlatform} isPremium={u.isPremium} />
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'recipeCount' ? 'text-primary-600' : 'text-gray-700 dark:text-gray-200'}`}>{u.recipeCount}</td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'ingredientCount' ? 'text-primary-600' : 'text-gray-700 dark:text-gray-200'}`}>{u.ingredientCount}</td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'saleCount' ? 'text-primary-600' : 'text-gray-700 dark:text-gray-200'}`}>{u.saleCount}</td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'totalRevenue' ? 'text-primary-600' : 'text-gray-700 dark:text-gray-200'}`}>{fmtCurrency(u.totalRevenue)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${sortBy === 'lastSeenAt' ? 'text-primary-600' : 'text-gray-400'}`}>{u.lastSeenAt ? fmtDateTime(u.lastSeenAt) : '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === p
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Próxima
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {selectedId && (
      <UserModal
          userId={selectedId}
          onClose={() => { setSelectedId(null); load(); }}
          toast={toast}
          onImpersonate={onImpersonate}
          onWhatsApp={(phone, name) => setWhatsApp({ phone, name })}
          onUserUpdated={updateUserInList}
        />
      )}

      {whatsApp && (
        <WhatsAppModal
          phone={whatsApp.phone}
          contactName={whatsApp.name}
          onClose={() => setWhatsApp(null)}
          toast={toast}
        />
      )}
    </div>
  );
}
