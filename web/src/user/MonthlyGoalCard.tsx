import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Pencil } from 'lucide-react';
import { req, userApi } from './userApi';
import { formatBRL } from './format';
import { parseLocaleNumber } from './number';

interface RevenueGoal { id: string; amount: number; month: number; year: number }

/**
 * Meta de faturamento do mês (GET/PUT /goals/:mês/:ano — já existia no backend e
 * alimenta as Dicas de Vendas, mas não havia onde definir).
 */
export function MonthlyGoalCard() {
  const { t } = useTranslation('finance');
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const [goal, setGoal] = useState<number | null>(null);
  const [revenue, setRevenue] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      req<RevenueGoal | null>(`/goals/${month}/${year}`).catch(() => null),
      userApi.getStats().catch(() => null),
    ]).then(([g, stats]) => {
      if (!active) return;
      setGoal(g?.amount ?? null);
      setRevenue(stats?.monthlyRevenue ?? 0);
      setLoaded(true);
    });
    return () => { active = false; };
  }, [month, year]);

  const save = async () => {
    const amount = parseLocaleNumber(input);
    if (!(amount > 0)) return setError(t('goal.invalid'));
    setSaving(true);
    setError(null);
    try {
      const g = await req<RevenueGoal>(`/goals/${month}/${year}`, { method: 'PUT', body: JSON.stringify({ amount }) });
      setGoal(g.amount);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;
  const pct = goal ? Math.min(100, (revenue / goal) * 100) : 0;
  const missing = goal ? Math.max(0, goal - revenue) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
          <Target size={16} className="text-primary-500" /> {t('goal.title')}
        </p>
        {goal != null && !editing && (
          <button onClick={() => { setInput(String(goal).replace('.', ',')); setEditing(true); }}
            className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1">
            <Pencil size={12} /> {t('goal.edit')}
          </button>
        )}
      </div>

      {editing || goal == null ? (
        <div className="mt-2">
          {goal == null && !editing && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('goal.empty')}</p>}
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} inputMode="decimal" placeholder={t('goal.placeholder')}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
            <button onClick={save} disabled={saving}
              className="shrink-0 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4">
              {t('goal.save')}
            </button>
            {editing && (
              <button onClick={() => setEditing(false)} className="shrink-0 text-sm text-gray-500 px-2">{t('goal.cancel')}</button>
            )}
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      ) : (
        <div className="mt-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-bold text-gray-900 dark:text-white">{formatBRL(revenue)}</span>
            <span className="text-gray-500 dark:text-gray-400">{t('goal.of', { value: formatBRL(goal) })}</span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            {pct >= 100 ? t('goal.reached') : t('goal.missing', { pct: pct.toFixed(0), value: formatBRL(missing) })}
          </p>
        </div>
      )}
    </div>
  );
}
