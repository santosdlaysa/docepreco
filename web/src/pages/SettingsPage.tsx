import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ToastFn } from '../components';
import { Target, Save } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

export function SettingsPage({ toast }: Props) {
  const [goal, setGoal] = useState<string>('');
  const [registeredToday, setRegisteredToday] = useState<number>(0);
  const [savedGoal, setSavedGoal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api.getDailyRegistrationGoal();
      setSavedGoal(data.goal);
      setRegisteredToday(data.registeredToday);
      setGoal(String(data.goal || ''));
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

  const remaining = Math.max(0, savedGoal - registeredToday);
  const percent = savedGoal > 0 ? Math.min(100, Math.round((registeredToday / savedGoal) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Configurações</h2>
        <p className="text-sm text-gray-500 mt-1">Ajustes gerais do painel e do bot do Telegram.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-primary-500" />
          <h3 className="text-base font-bold text-gray-900">Meta diária de cadastros</h3>
        </div>

        <p className="text-sm text-gray-600">
          Receba no Telegram, às 12h, 15h, 18h e 21h, o quanto falta para bater a meta de novos cadastros do app.
          Use <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/meta</code> no bot para checar a qualquer momento.
        </p>

        {loading ? (
          <div className="h-20 bg-gray-50 rounded-lg animate-pulse" />
        ) : (
          <>
            {savedGoal > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Hoje</span>
                  <span className="font-semibold text-gray-900">
                    {registeredToday}/{savedGoal} ({percent}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {remaining === 0 ? '🎯 Meta batida hoje!' : `Faltam ${remaining} cadastro(s).`}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta de cadastros por dia
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
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
              <p className="text-xs text-gray-500 mt-2">
                Defina <strong>0</strong> para desativar os avisos automáticos.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
