import { useEffect, useState } from 'react';
import { api, TelegramAlert } from '../lib/api';
import { TableSkeleton, ToastFn } from '../components';
import { ToggleLeft, ToggleRight, Bell, BarChart3 } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  alerts: { label: 'Alertas em tempo real', icon: Bell, color: 'text-blue-500' },
  reports: { label: 'Relatórios periódicos', icon: BarChart3, color: 'text-purple-500' },
};

const KEY_EMOJIS: Record<string, string> = {
  new_user: '🆕',
  new_sale: '🧁',
  premium_event: '💎',
  user_milestone: '🎉',
  error_alert: '🚨',
  slow_api: '🐢',
  daily_report: '📊',
  weekly_report: '📈',
  goal_progress: '🎯',
};

export function TelegramAlertsPage({ toast }: Props) {
  const [alerts, setAlerts] = useState<TelegramAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setAlerts(await api.listTelegramAlerts());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (a: TelegramAlert) => {
    try {
      await api.updateTelegramAlert(a.id, { isEnabled: !a.isEnabled });
      toast.success(`${a.label} ${a.isEnabled ? 'desativado' : 'ativado'}!`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const categories = [...new Set(alerts.map(a => a.category))];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Telegram</h2>
        <p className="text-sm text-gray-500 mt-1">Controle quais alertas e relatórios são enviados para o Telegram.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <TableSkeleton rows={6} cols={2} />
        </div>
      ) : (
        categories.map(cat => {
          const cfg = CATEGORY_CONFIG[cat] ?? { label: cat, icon: Bell, color: 'text-gray-500' };
          const Icon = cfg.icon;
          const items = alerts.filter(a => a.category === cat);
          const enabledCount = items.filter(a => a.isEnabled).length;

          return (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={18} className={cfg.color} />
                  <h3 className="text-base font-bold text-gray-900">{cfg.label}</h3>
                </div>
                <span className="text-xs text-gray-400">{enabledCount}/{items.length} ativos</span>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map(a => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <button onClick={() => toggle(a)} className="shrink-0">
                      {a.isEnabled ? (
                        <ToggleRight size={28} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={28} className="text-gray-300" />
                      )}
                    </button>
                    <span className="text-xl shrink-0">{KEY_EMOJIS[a.key] ?? '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{a.label}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${a.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {a.isEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
