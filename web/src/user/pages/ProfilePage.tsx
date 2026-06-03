import { useState } from 'react';
import { Crown, Mail, AtSign, Phone, Building2 } from 'lucide-react';
import { userApi } from '../userApi';
import { useAuth } from '../UserAuthContext';
import { ToastFn } from '../../components';
import { formatDate } from '../format';
import { Header, FormField, inputClass } from './IngredientsPage';

export function ProfilePage({ toast }: { toast: ToastFn }) {
  const { user, setUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [instagram, setInstagram] = useState(user?.instagramHandle ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

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
            <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg px-3 py-2">
              <Crown size={16} />
              <span className="font-medium">
                Premium {user.premiumUntil ? `até ${formatDate(user.premiumUntil)}` : 'ativo'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-lg px-3 py-2">
              <Crown size={16} className="text-gray-400" />
              <span>Plano gratuito</span>
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
    </div>
  );
}
