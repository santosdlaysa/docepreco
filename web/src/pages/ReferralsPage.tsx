import { useEffect, useState, useCallback } from 'react';
import { api, ReferralItem, ReferralStats } from '../lib/api';
import { TableSkeleton, ConfirmModal, ToastFn } from '../components';
import { Gift, RefreshCw, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  valid: { label: 'Validada', color: 'bg-green-100 text-green-700' },
  rewarded: { label: 'Recompensada', color: 'bg-pink-100 text-pink-700' },
  invalid: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500' },
};

type Filter = 'all' | 'pending' | 'valid' | 'rewarded' | 'invalid';

export function ReferralsPage({ toast }: Props) {
  const [items, setItems] = useState<ReferralItem[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmInvalidate, setConfirmInvalidate] = useState<ReferralItem | null>(null);
  const [confirmForceValid, setConfirmForceValid] = useState<ReferralItem | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [list, st] = await Promise.all([api.listReferrals(filter), api.referralStats()]);
      setItems(list);
      setStats(st);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleInvalidate = async (item: ReferralItem) => {
    try {
      await api.invalidateReferral(item.id);
      toast.success('Indicação cancelada');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao cancelar');
    } finally {
      setConfirmInvalidate(null);
    }
  };

  const handleForceValid = async (item: ReferralItem) => {
    try {
      await api.forceValidReferral(item.id);
      toast.success('Indicação validada');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao validar');
    } finally {
      setConfirmForceValid(null);
    }
  };

  const STAT_CARDS: { label: string; value: number; suffix?: string; color: string }[] = stats ? [
    { label: 'Total', value: stats.total, color: 'text-gray-900 dark:text-white' },
    { label: 'Pendentes', value: stats.pending, color: 'text-yellow-600' },
    { label: 'Validadas', value: stats.valid, color: 'text-green-600' },
    { label: 'Recompensadas', value: stats.rewarded, color: 'text-pink-600' },
    { label: 'Conversão', value: stats.conversionPercent, suffix: '%', color: 'text-blue-600' },
  ] : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
            <Gift size={20} className="text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Indicações</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Programa "Indique e ganhe"</p>
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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {STAT_CARDS.map(c => (
            <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className={`text-xl sm:text-2xl font-bold ${c.color}`}>{c.value}{c.suffix ?? ''}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6 w-fit">
        {(['all', 'pending', 'valid', 'rewarded', 'invalid'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filter === f
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {f === 'all' ? 'Todas' : STATUS_MAP[f].label + 's'}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Gift size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nenhuma indicação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const st = STATUS_MAP[item.status] ?? STATUS_MAP.pending;
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{item.referrerName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.referrerEmail}</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{item.referredName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.referredEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center hidden md:block">
                      <p className="text-xs text-gray-400">Cadastro</p>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{fmtDate(item.createdAt)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                    <div className="flex items-center gap-2">
                      {(item.status === 'pending' || item.status === 'invalid') && (
                        <button
                          onClick={() => setConfirmForceValid(item)}
                          title="Validar manualmente"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <CheckCircle size={13} /> Validar
                        </button>
                      )}
                      {item.status !== 'rewarded' && item.status !== 'invalid' && (
                        <button
                          onClick={() => setConfirmInvalidate(item)}
                          title="Cancelar (fraude)"
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-red-600 hover:border-red-200 text-xs font-medium rounded-lg transition-colors"
                        >
                          <XCircle size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {item.activatedAt && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock size={11} /> Validada em {fmtDate(item.activatedAt)}
                    {item.rewardedAt && ` · Recompensada em ${fmtDate(item.rewardedAt)}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!confirmForceValid}
        title="Validar indicação"
        message={confirmForceValid ? `Validar manualmente a indicação de ${confirmForceValid.referrerName}? Isso pode liberar a recompensa se completar um lote de 5.` : ''}
        confirmLabel="Validar"
        confirmColor="primary"
        onConfirm={() => confirmForceValid && handleForceValid(confirmForceValid)}
        onCancel={() => setConfirmForceValid(null)}
      />

      <ConfirmModal
        open={!!confirmInvalidate}
        title="Cancelar indicação"
        message={confirmInvalidate ? `Cancelar a indicação de ${confirmInvalidate.referrerName} → ${confirmInvalidate.referredName}? Use em caso de suspeita de fraude.` : ''}
        confirmLabel="Cancelar indicação"
        confirmColor="red"
        onConfirm={() => confirmInvalidate && handleInvalidate(confirmInvalidate)}
        onCancel={() => setConfirmInvalidate(null)}
      />
    </div>
  );
}
