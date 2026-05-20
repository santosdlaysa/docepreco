import { useEffect, useState, useCallback } from 'react';
import { api, AdminUser, AdminUserDetail } from '../lib/api';
import { Skeleton, TableSkeleton, ModalOverlay, ToastFn } from '../components';
import { Crown, Search, ChevronLeft, ChevronRight, ChevronDown, Eye, Phone, Gift, AtSign, Filter, X, KeyRound, MessageCircle, Send } from 'lucide-react';

interface Props {
  toast: ToastFn;
  onImpersonate?: (userId: string) => void;
}

type SortKey = 'createdAt' | 'recipeCount' | 'ingredientCount' | 'saleCount' | 'totalRevenue' | 'lastSeenAt';

function PremiumBadge({ isPremium, platform }: { isPremium: boolean; platform: string | null }) {
  if (!isPremium) return <span className="text-xs text-gray-400">Gratuito</span>;
  const label = platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Manual';
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
      <Crown size={12} />
      {label}
    </span>
  );
}

function SortIcon({ active }: { active: boolean }) {
  return (
    <ChevronDown size={14} className={`inline ml-0.5 ${active ? 'text-primary-600' : 'text-gray-300'}`} />
  );
}

function UserModal({ userId, onClose, toast, onImpersonate, onWhatsApp }: { userId: string; onClose: () => void; toast: ToastFn; onImpersonate?: (userId: string) => void; onWhatsApp: (phone: string, name: string) => void }) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [premiumDays, setPremiumDays] = useState('30');
  const [grantingTrial, setGrantingTrial] = useState(false);
  const [trialDays, setTrialDays] = useState('3');
  const [notifTitle, setNotifTitle] = useState('Presente especial para você!');
  const [notifBody, setNotifBody] = useState('Você ganhou 3 dias grátis de acesso Premium! Aproveite todos os recursos exclusivos do DocePreço.');
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    api.getUser(userId).then(setUser).catch(console.error);
  }, [userId]);

  const togglePremium = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let premiumUntil: string | null = null;
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
      await api.setPremium(user.id, !user.isPremium, premiumUntil);
      const msg = user.isPremium ? 'Premium removido.' : `Premium ativado por ${premiumDays} dias!`;
      setUser(prev => prev ? { ...prev, isPremium: !prev.isPremium, premiumUntil: premiumUntil } : prev);
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
      const res = await api.grantTrial(user.id, days, notifTitle.trim(), notifBody.trim());
      const until = new Date(res.premiumUntil);
      setUser(prev => prev ? { ...prev, isPremium: true, premiumUntil: res.premiumUntil, premiumPlatform: 'manual' } : prev);
      const notifMsg = res.notificationSent
        ? ' Notificação enviada!'
        : ' (usuário sem token de push — notificação não enviada)';
      toast.success(`Premium ativado por ${days} dias até ${until.toLocaleDateString('pt-BR')}.${notifMsg}`);
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

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Detalhes do usuário</h3>
          <div className="flex items-center gap-2">
            {onImpersonate && (
              <button
                onClick={() => { onClose(); onImpersonate(userId); }}
                className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Eye size={15} />
                Ver cadastros
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
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
              <p className="font-semibold text-gray-900">{user.companyName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.phone && (
                <button
                  onClick={() => onWhatsApp(user.phone!, user.companyName)}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 mt-0.5"
                >
                  <MessageCircle size={13} />
                  {user.phone}
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

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Status premium</p>
                  <div className="mt-1">
                    <PremiumBadge isPremium={user.isPremium} platform={user.premiumPlatform} />
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
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }`}
                >
                  {saving ? '...' : user.isPremium ? 'Remover premium' : 'Dar premium'}
                </button>
              </div>
              {!user.isPremium && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Período:</label>
                  <select
                    value={premiumDays}
                    onChange={e => setPremiumDays(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
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
              )}
            </div>

            {!user.isPremium && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
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
                    className="text-sm border border-green-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
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
                    className="w-full text-sm border border-green-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                    placeholder="Ex: Presente especial para você!"
                  />
                </div>
                <div>
                  <label className="text-xs text-green-700 block mb-1">Mensagem da notificação</label>
                  <textarea
                    value={notifBody}
                    onChange={e => setNotifBody(e.target.value)}
                    rows={3}
                    className="w-full text-sm border border-green-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
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
                <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="font-bold text-gray-900 mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>

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
                  className="flex-1 text-sm border border-orange-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
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

            {user.recentSales.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Últimas vendas</p>
                <div className="space-y-2">
                  {user.recentSales.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                      <div>
                        <p className="text-gray-800">{s.recipeName ?? '—'}</p>
                        <p className="text-xs text-gray-400">{fmtDate(s.saleDate)} · {s.quantitySold}x</p>
                      </div>
                      <p className="font-semibold text-gray-900">{fmtCurrency(s.totalRevenue)}</p>
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

function WhatsAppModal({ phone, contactName, onClose }: { phone: string; contactName: string; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const cleanPhone = phone.replace(/\D/g, '');

  const handleSend = () => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-full">
              <MessageCircle size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">WhatsApp</h3>
              <p className="text-xs text-gray-500">{contactName} · {phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Digite sua mensagem..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-300 focus:bg-white resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Ctrl+Enter para enviar</p>
            <button
              onClick={handleSend}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
            >
              <Send size={14} />
              Enviar no WhatsApp
            </button>
          </div>
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
  const [premiumFilter, setPremiumFilter] = useState<boolean | null>(null);
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
    premiumFilter !== null,
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
    setPremiumFilter(null);
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
        isPremium: premiumFilter ?? undefined,
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
  }, [search, page, premiumFilter, hasPhone, hasInstagram, minRecipes, minIngredients, minSales, minRevenue, lastSeenDays, createdDays, sortBy]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (key: SortKey) => {
    setSortBy(key);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20);

  const ColHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <th
      className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-primary-600 select-none whitespace-nowrap"
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
        <h2 className="text-xl font-bold text-gray-900">Usuários</h2>
        <span className="text-sm text-gray-400">{total} no total</span>
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
            className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-primary-400 bg-primary-50 text-primary-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
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
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <X size={14} />
            Limpar filtros
          </button>
        )}
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Plano</label>
            <select
              value={premiumFilter === null ? '' : String(premiumFilter)}
              onChange={e => { setPremiumFilter(e.target.value === '' ? null : e.target.value === 'true'); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos</option>
              <option value="true">Premium</option>
              <option value="false">Gratuito</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Telefone</label>
            <select
              value={hasPhone === null ? '' : String(hasPhone)}
              onChange={e => { setHasPhone(e.target.value === '' ? null : e.target.value === 'true'); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos</option>
              <option value="true">Com telefone</option>
              <option value="false">Sem telefone</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Instagram</label>
            <select
              value={hasInstagram === null ? '' : String(hasInstagram)}
              onChange={e => { setHasInstagram(e.target.value === '' ? null : e.target.value === 'true'); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos</option>
              <option value="true">Com instagram</option>
              <option value="false">Sem instagram</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Receitas (min)</label>
            <input
              type="number"
              min={0}
              placeholder="Ex: 1"
              value={minRecipes ?? ''}
              onChange={e => { setMinRecipes(e.target.value ? parseInt(e.target.value) : undefined); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Ingredientes (min)</label>
            <input
              type="number"
              min={0}
              placeholder="Ex: 1"
              value={minIngredients ?? ''}
              onChange={e => { setMinIngredients(e.target.value ? parseInt(e.target.value) : undefined); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Vendas (min)</label>
            <input
              type="number"
              min={0}
              placeholder="Ex: 1"
              value={minSales ?? ''}
              onChange={e => { setMinSales(e.target.value ? parseInt(e.target.value) : undefined); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Faturamento (min R$)</label>
            <input
              type="number"
              min={0}
              step={10}
              placeholder="Ex: 100"
              value={minRevenue ?? ''}
              onChange={e => { setMinRevenue(e.target.value ? parseFloat(e.target.value) : undefined); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Último acesso</label>
            <select
              value={lastSeenDays === undefined ? '' : String(lastSeenDays)}
              onChange={e => { setLastSeenDays(e.target.value === '' ? undefined : parseInt(e.target.value)); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
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
            <label className="text-xs font-medium text-gray-500 block mb-1">Cadastro</label>
            <select
              value={createdDays === undefined ? '' : String(createdDays)}
              onChange={e => { setCreatedDays(e.target.value === '' ? undefined : parseInt(e.target.value)); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1050px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Confeitaria</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Telefone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Instagram</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Plano</th>
                <ColHeader label="Receitas"      sortKey="recipeCount" />
                <ColHeader label="Ingredientes"  sortKey="ingredientCount" />
                <ColHeader label="Vendas"        sortKey="saleCount" />
                <ColHeader label="Faturamento"   sortKey="totalRevenue" />
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-primary-600 select-none whitespace-nowrap"
                  onClick={() => handleSort('lastSeenAt')}
                >
                  Último acesso<SortIcon active={sortBy === 'lastSeenAt'} />
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-primary-600 select-none"
                  onClick={() => handleSort('createdAt')}
                >
                  Cadastro<SortIcon active={sortBy === 'createdAt'} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={11}>
                    <TableSkeleton rows={8} cols={8} />
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-400">Nenhum usuário encontrado</td>
                </tr>
              )}
              {!loading && users.map((u, i) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 20}ms` }}
                  onClick={() => setSelectedId(u.id)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{u.companyName}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.phone ? (
                      <button
                        className="text-green-600 hover:text-green-700 flex items-center gap-1"
                        onClick={e => { e.stopPropagation(); setWhatsApp({ phone: u.phone!, name: u.companyName }); }}
                      >
                        <MessageCircle size={14} />
                        {u.phone}
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
                    <PremiumBadge isPremium={u.isPremium} platform={u.premiumPlatform} />
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'recipeCount' ? 'text-primary-600' : 'text-gray-700'}`}>{u.recipeCount}</td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'ingredientCount' ? 'text-primary-600' : 'text-gray-700'}`}>{u.ingredientCount}</td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'saleCount' ? 'text-primary-600' : 'text-gray-700'}`}>{u.saleCount}</td>
                  <td className={`px-4 py-3 text-right font-medium ${sortBy === 'totalRevenue' ? 'text-primary-600' : 'text-gray-700'}`}>{fmtCurrency(u.totalRevenue)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${sortBy === 'lastSeenAt' ? 'text-primary-600' : 'text-gray-400'}`}>{u.lastSeenAt ? fmtDateTime(u.lastSeenAt) : '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-40 hover:text-gray-900 transition-colors"
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
                        : 'text-gray-600 hover:bg-gray-100'
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
              className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-40 hover:text-gray-900 transition-colors"
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
        />
      )}

      {whatsApp && (
        <WhatsAppModal
          phone={whatsApp.phone}
          contactName={whatsApp.name}
          onClose={() => setWhatsApp(null)}
        />
      )}
    </div>
  );
}
