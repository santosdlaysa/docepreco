import { useEffect, useState, useCallback } from 'react';
import { api, PixRequestItem } from '../lib/api';
import { TableSkeleton, ConfirmModal, ToastFn } from '../components';
import { CheckCircle, XCircle, Clock, RefreshCw, QrCode, Megaphone } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Converte "10,10" / "10.10" / "R$ 1.234,56" em centavos inteiros. Retorna null se inválido.
function parseBRLToCents(value: string): number | null {
  let cleaned = value.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  if (cleaned.includes(',')) {
    // Padrão BR: vírgula é decimal, ponto é separador de milhar.
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // Sem vírgula: o ponto (se houver) é tratado como decimal.
  const reais = Number(cleaned);
  if (!Number.isFinite(reais) || reais < 0) return null;
  return Math.round(reais * 100);
}

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-600', icon: XCircle },
};

export function PixRequestsPage({ toast }: Props) {
  const [requests, setRequests] = useState<PixRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [approving, setApproving] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<PixRequestItem | null>(null);
  const [approveAmount, setApproveAmount] = useState('');
  const [confirmReject, setConfirmReject] = useState<PixRequestItem | null>(null);

  // Abre o modal de aprovação já com o valor da solicitação preenchido (editável).
  const openApprove = (item: PixRequestItem) => {
    setApproveAmount((item.amountCents / 100).toFixed(2).replace('.', ','));
    setConfirmApprove(item);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listPixRequests(filter);
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleApprove = async (item: PixRequestItem) => {
    // Assinatura: usa o valor recebido informado (default = valor da solicitação).
    // Anúncio: sem valor editável, aprova direto.
    let receivedCents: number | undefined;
    if (item.productType !== 'ad_banner') {
      const parsed = parseBRLToCents(approveAmount);
      if (parsed == null) {
        toast.error('Informe um valor recebido válido (ex.: 10,10)');
        return;
      }
      receivedCents = parsed;
    }

    setApproving(item.id);
    try {
      if (item.productType === 'ad_banner') {
        await api.approvePixRequest(item.id);
        toast.success(`Anúncio de ${item.companyName} publicado!`);
      } else {
        const premiumDays = item.planLabel === 'Anual' ? 365 : 30;
        await api.approvePixRequest(item.id, premiumDays, item.planTier, receivedCents);
        const tierLabel = item.planTier === 'master' ? 'Master' : 'Premium';
        toast.success(`${tierLabel} liberado para ${item.companyName}! (${fmtMoney(receivedCents!)})`);
      }
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao aprovar');
    } finally {
      setApproving(null);
      setConfirmApprove(null);
    }
  };

  const handleReject = async (item: PixRequestItem) => {
    try {
      await api.rejectPixRequest(item.id);
      toast.success('Solicitação rejeitada');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao rejeitar');
    } finally {
      setConfirmReject(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <QrCode size={20} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pagamentos PIX</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pendingCount > 0 ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}` : 'Nenhuma pendência'}
            </p>
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

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6 w-fit">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filter === f
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovados' : f === 'rejected' ? 'Rejeitados' : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <QrCode size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma solicitação {filter !== 'all' ? (filter === 'pending' ? 'pendente' : filter === 'approved' ? 'aprovada' : 'rejeitada') : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const st = STATUS_MAP[req.status] ?? STATUS_MAP.pending;
            const StIcon = st.icon;
            const isAd = req.productType === 'ad_banner';
            return (
              <div
                key={req.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all ${
                  req.status === 'pending'
                    ? 'border-yellow-200 dark:border-yellow-800 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    {isAd && req.bannerImageUrl ? (
                      <img
                        src={req.bannerImageUrl}
                        alt={req.companyName}
                        className="w-16 h-10 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        req.status === 'pending' ? 'bg-yellow-100' : req.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <StIcon size={18} className={
                          req.status === 'pending' ? 'text-yellow-600' : req.status === 'approved' ? 'text-green-600' : 'text-red-500'
                        } />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{req.companyName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{req.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">{isAd ? 'Tipo' : 'Plano'}</p>
                      {isAd ? (
                        <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 justify-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-pink-100 text-pink-700 inline-flex items-center gap-1">
                            <Megaphone size={11} /> Anúncio
                          </span>
                          {req.bannerDurationDays ? `${req.bannerDurationDays}d` : ''}
                        </p>
                      ) : (
                        <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 justify-center">
                          {req.planLabel}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            req.planTier === 'master' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {req.planTier === 'master' ? 'Master' : 'Premium'}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Valor</p>
                      <p className="font-semibold text-green-600">{fmtMoney(req.amountCents)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Quando</p>
                      <p className="font-medium text-gray-600 dark:text-gray-300">{timeSince(req.createdAt)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openApprove(req)}
                        disabled={approving === req.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={14} />
                        Aprovar
                      </button>
                      <button
                        onClick={() => setConfirmReject(req)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-red-600 hover:border-red-200 text-sm font-medium rounded-lg transition-colors"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {req.status !== 'pending' && req.reviewedAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    {req.status === 'approved' ? 'Aprovado' : 'Rejeitado'} em {fmtDate(req.reviewedAt)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approve modal — anúncio (sem valor editável) */}
      <ConfirmModal
        open={!!confirmApprove && confirmApprove.productType === 'ad_banner'}
        title="Aprovar anúncio"
        message={
          confirmApprove
            ? `Confirma a publicação do anúncio de ${confirmApprove.companyName} (${confirmApprove.bannerDurationDays ?? '?'} dias - ${fmtMoney(confirmApprove.amountCents)})? O banner ficará ativo no carrossel da Home.`
            : ''
        }
        confirmLabel="Aprovar"
        confirmColor="primary"
        onConfirm={() => confirmApprove && handleApprove(confirmApprove)}
        onCancel={() => setConfirmApprove(null)}
      />

      {/* Approve modal — assinatura (valor recebido editável) */}
      {confirmApprove && confirmApprove.productType !== 'ad_banner' && (() => {
        const item = confirmApprove;
        const tierLabel = item.planTier === 'master' ? 'Master' : 'Premium';
        const dias = item.planLabel === 'Anual' ? '365' : '30';
        const parsed = parseBRLToCents(approveAmount);
        const diff = parsed != null && parsed !== item.amountCents;
        return (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4 animate-fade-in"
            onClick={() => !approving && setConfirmApprove(null)}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Aprovar pagamento PIX</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                Liberar <span className="font-semibold">{tierLabel}</span> ({item.planLabel} · {dias} dias) para{' '}
                <span className="font-semibold">{item.companyName}</span>.
              </p>

              <label className="block mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Valor recebido
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={approveAmount}
                  onChange={e => setApproveAmount(e.target.value)}
                  className="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-primary-400"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Cobrança do valor cheio: {fmtMoney(item.amountCents)}.
                {diff ? ' Use a diferença quando o cliente já pagou parte (ex.: upgrade).' : ' Ajuste se recebeu um valor diferente.'}
              </p>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setConfirmApprove(null)}
                  disabled={!!approving}
                  className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleApprove(item)}
                  disabled={!!approving || parsed == null}
                  className="text-sm px-4 py-2 rounded-lg font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50"
                >
                  Aprovar {parsed != null ? fmtMoney(parsed) : ''}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject modal */}
      <ConfirmModal
        open={!!confirmReject}
        title="Rejeitar solicitação"
        message={
          confirmReject
            ? confirmReject.productType === 'ad_banner'
              ? `Rejeitar o anúncio de ${confirmReject.companyName}? O banner pendente será removido e o usuário notificado.`
              : `Rejeitar o pagamento PIX de ${confirmReject.companyName}? O usuário será notificado.`
            : ''
        }
        confirmLabel="Rejeitar"
        confirmColor="red"
        onConfirm={() => confirmReject && handleReject(confirmReject)}
        onCancel={() => setConfirmReject(null)}
      />
    </div>
  );
}
