import { useEffect, useState, useCallback } from 'react';
import { api, CheckinConfig, CheckinStats } from '../lib/api';
import { TableSkeleton, ToastFn } from '../components';
import { CalendarCheck, RefreshCw, Save, ToggleLeft, ToggleRight, Gift } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const TIER_LABEL: Record<string, string> = { premium: 'Premium', master: 'Master' };

const inputCls = 'w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-300';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1';

export function CheckinPage({ toast }: Props) {
  const [form, setForm] = useState<CheckinConfig | null>(null);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [cfg, st] = await Promise.all([api.getCheckinConfig(), api.checkinStats()]);
      setForm(cfg);
      setStats(st);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar o check-in');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof CheckinConfig>(key: K, value: CheckinConfig[K]) =>
    setForm(f => (f ? { ...f, [key]: value } : f));

  const save = async (data: CheckinConfig) => {
    try {
      setSaving(true);
      setForm(await api.updateCheckinConfig(data));
      toast.success('Check-in atualizado!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const maxDaily = Math.max(1, ...(stats?.daily.map(d => d.count) ?? [0]));

  const STAT_CARDS = stats ? [
    { label: 'Check-ins hoje', value: stats.checkinsToday, color: 'text-pink-600' },
    { label: 'Ativos (7 dias)', value: stats.activeUsers7d, color: 'text-blue-600' },
    { label: 'Check-ins no total', value: stats.totalCheckins, color: 'text-gray-900 dark:text-white' },
    { label: 'Prêmios liberados', value: stats.totalRewards, color: 'text-green-600' },
    { label: 'Pessoas premiadas', value: stats.rewardedUsers, color: 'text-purple-600' },
  ] : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
            <CalendarCheck size={20} className="text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Check-in diário</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Frequência de uso que vira dias de plano grátis</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {loading || !form ? (
        <TableSkeleton rows={5} cols={4} />
      ) : (
        <>
          {/* Configuração */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Campanha</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {form.enabled ? 'No ar: o modal aparece no app para quem não tem assinatura paga.' : 'Desligada: ninguém vê o check-in no app.'}
                </p>
              </div>
              <button
                onClick={() => save({ ...form, enabled: !form.enabled })}
                disabled={saving}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  form.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {form.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {form.enabled ? 'Ligada' : 'Desligada'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className={labelCls}>Dias de check-in</label>
                <input type="number" min={1} max={60} className={inputCls} value={form.daysRequired}
                  onChange={e => set('daysRequired', Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Dias de plano ganhos</label>
                <input type="number" min={1} max={90} className={inputCls} value={form.rewardDays}
                  onChange={e => set('rewardDays', Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Plano do prêmio</label>
                <select className={inputCls} value={form.rewardTier}
                  onChange={e => set('rewardTier', e.target.value as CheckinConfig['rewardTier'])}>
                  <option value="premium">Premium</option>
                  <option value="master">Master</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Prêmios por pessoa (0 = sem limite)</label>
                <input type="number" min={0} max={100} className={inputCls} value={form.maxRewardsPerUser}
                  onChange={e => set('maxRewardsPerUser', Number(e.target.value))} />
              </div>
            </div>

            <label className="flex items-center gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer w-fit">
              <input type="checkbox" checked={form.consecutive} onChange={e => set('consecutive', e.target.checked)}
                className="w-4 h-4 accent-pink-600" />
              Dias seguidos: perder um dia zera a contagem
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Título do modal</label>
                <input className={inputCls} maxLength={60} value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Mensagem do modal</label>
                <input className={inputCls} maxLength={200} value={form.message} onChange={e => set('message', e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Regra: {form.daysRequired} check-in{form.daysRequired > 1 ? 's' : ''}{form.consecutive ? ' seguidos' : ''} = {form.rewardDays} dia{form.rewardDays > 1 ? 's' : ''} de {TIER_LABEL[form.rewardTier]}
                {form.maxRewardsPerUser === 0 ? ', sem limite por pessoa.' : `, até ${form.maxRewardsPerUser}x por pessoa.`}
                {form.maxRewardsPerUser === 0 && form.rewardDays >= form.daysRequired && ' Atenção: sem limite, dá para manter o plano grátis para sempre.'}
              </p>
              <button
                onClick={() => save(form)}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Save size={14} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Números */}
          {stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                {STAT_CARDS.map(c => (
                  <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className={`text-xl sm:text-2xl font-bold ${c.color}`}>{c.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
                <p className="font-semibold text-gray-900 dark:text-white mb-4">Check-ins nos últimos 14 dias</p>
                <div className="flex items-end gap-1.5 h-32">
                  {stats.daily.map(d => (
                    <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.day}: ${d.count}`}>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{d.count || ''}</span>
                      <div className="w-full rounded-t bg-pink-400" style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count ? 4 : 1 }} />
                      <span className="text-[10px] text-gray-400 mt-1">{d.day.slice(8, 10)}/{d.day.slice(5, 7)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="font-semibold text-gray-900 dark:text-white mb-3">Últimos prêmios</p>
              {stats.recentRewards.length === 0 ? (
                <div className="text-center py-12">
                  <Gift size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Ninguém completou o check-in ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentRewards.map(r => (
                    <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{r.companyName || r.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.email}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-pink-100 text-pink-700">
                          +{r.rewardDays}d {TIER_LABEL[r.tier] ?? r.tier}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">até {fmtDate(r.premiumUntil)}</span>
                        <span className="text-gray-400 hidden md:inline">{fmtDate(r.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
