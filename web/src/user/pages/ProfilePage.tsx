import { useState } from 'react';
import { Crown, Mail, AtSign, Phone, Building2, Sparkles, Clock, ArrowUpCircle } from 'lucide-react';
import { userApi, effectiveTier, PlanTier } from '../userApi';
import { useAuth } from '../UserAuthContext';
import { ToastFn } from '../../components';
import { formatDate } from '../format';
import { Header, FormField, inputClass } from './IngredientsPage';
import { SubscribeModal } from '../SubscribeModal';
import { TIER_META } from '../plan';

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

  // Tier no qual abrir o modal de assinatura (null = fechado).
  const [subscribeTier, setSubscribeTier] = useState<PlanTier | null>(null);

  if (!user) return null;
  const tier = effectiveTier(user);

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

      {subscribeTier && (
        <SubscribeModal initialTier={subscribeTier} onClose={() => setSubscribeTier(null)} toast={toast} />
      )}
    </div>
  );
}
