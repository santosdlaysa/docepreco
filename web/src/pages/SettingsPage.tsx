import { useEffect, useState } from 'react';
import { api, FeatureFlag } from '../lib/api';
import { ToastFn } from '../components';
import { Target, Save, UserPlus } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

export function SettingsPage({ toast }: Props) {
  const [goal, setGoal] = useState<string>('');
  const [registeredToday, setRegisteredToday] = useState<number>(0);
  const [savedGoal, setSavedGoal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [registrationFlag, setRegistrationFlag] = useState<FeatureFlag | null>(null);
  const [togglingRegistration, setTogglingRegistration] = useState(false);

  const load = async () => {
    try {
      const [goalData, flags] = await Promise.all([
        api.getDailyRegistrationGoal(),
        api.listFeatureFlags(),
      ]);
      setSavedGoal(goalData.goal);
      setRegisteredToday(goalData.registeredToday);
      setGoal(String(goalData.goal || ''));

      const regFlag = flags.find(f => f.key === 'allow_registration');
      if (regFlag) {
        setRegistrationFlag(regFlag);
        setRegistrationEnabled(regFlag.isEnabled);
      } else {
        setRegistrationEnabled(true);
        setRegistrationFlag(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const parsed = parseInt(goal, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      toast.error('Informe um número válido (0 ou maior).');
      return;
    }
    setSaving(true);
    try {
      await api.setDailyRegistrationGoal(parsed);
      setSavedGoal(parsed);
      toast.success('Meta atualizada!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRegistration = async () => {
    setTogglingRegistration(true);
    try {
      if (registrationFlag) {
        await api.updateFeatureFlag(registrationFlag.id, { isEnabled: !registrationEnabled });
        setRegistrationEnabled(!registrationEnabled);
        toast.success(!registrationEnabled ? 'Cadastro ativado!' : 'Cadastro desativado!');
      } else {
        const created = await api.createFeatureFlag({
          key: 'allow_registration',
          description: 'Permite novos cadastros no app',
          isEnabled: false,
        });
        setRegistrationFlag(created);
        setRegistrationEnabled(false);
        toast.success('Cadastro desativado!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao alterar configuração');
    } finally {
      setTogglingRegistration(false);
    }
  };

  const remaining = Math.max(0, savedGoal - registeredToday);
  const percent = savedGoal > 0 ? Math.min(100, Math.round((registeredToday / savedGoal) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurações</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ajustes gerais do painel e do bot do Telegram.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <UserPlus size={20} className="text-primary-500" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Cadastro de novos usuários</h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          Controle se novos usuários podem se cadastrar no app. Ao desativar, apenas usuários já cadastrados poderão fazer login.
        </p>

        {loading ? (
          <div className="h-10 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />
        ) : (
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full ${registrationEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                <span className={`w-2 h-2 rounded-full ${registrationEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                {registrationEnabled ? 'Ativado' : 'Desativado'}
              </span>
            </div>
            <button
              onClick={toggleRegistration}
              disabled={togglingRegistration}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${registrationEnabled
                ? 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400'
                : 'bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400'
              } disabled:opacity-50`}
            >
              {togglingRegistration ? 'Salvando...' : registrationEnabled ? 'Desativar cadastro' : 'Ativar cadastro'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-primary-500" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Meta diária de cadastros</h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          Receba no Telegram, às 12h, 15h, 18h e 21h, o quanto falta para bater a meta de novos cadastros do app.
          Use <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">/meta</code> no bot para checar a qualquer momento.
        </p>

        {loading ? (
          <div className="h-20 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />
        ) : (
          <>
            {savedGoal > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Hoje</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {registeredToday}/{savedGoal} ({percent}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {remaining === 0 ? '🎯 Meta batida hoje!' : `Faltam ${remaining} cadastro(s).`}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Meta de cadastros por dia
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  className="w-40 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="0"
                />
                <button
                  onClick={save}
                  disabled={saving || goal === String(savedGoal) || goal === ''}
                  className="inline-flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Save size={14} />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Defina <strong>0</strong> para desativar os avisos automáticos.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
