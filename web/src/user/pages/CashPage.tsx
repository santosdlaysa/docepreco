import { useEffect, useState, useCallback } from 'react';
import {
  Wallet, Lock, Plus, ArrowDownCircle, ArrowUpCircle, Banknote, CreditCard,
  QrCode, History, Clock, AlertTriangle, CheckCircle, Loader2,
} from 'lucide-react';
import { userApi, CashSession, Recipe } from '../userApi';
import { ToastFn, ModalOverlay } from '../../components';
import { formatBRL } from '../format';
import { Header, FormField, FormActions, inputClass } from './IngredientsPage';
import { SaleForm } from './SalesPage';

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const METHOD_LABEL: Record<string, string> = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'PIX', outros: 'Outros' };

export function CashPage({ toast }: { toast: ToastFn }) {
  const [session, setSession] = useState<CashSession | null>(null);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'open' | 'close' | 'sangria' | 'suprimento' | 'sale'>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cur, hist, r] = await Promise.all([
        userApi.getCurrentCash(),
        userApi.listCashSessions(),
        userApi.listRecipes(),
      ]);
      setSession(cur);
      setHistory(hist);
      setRecipes(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <Header title="Caixa" subtitle="Abertura e fechamento de caixa" />
        <div className="flex justify-center py-16"><Loader2 size={26} className="animate-spin text-primary-500" /></div>
      </div>
    );
  }

  const closedHistory = history.filter(s => s.status === 'closed');

  return (
    <div>
      <Header title="Caixa" subtitle={session ? `Aberto desde ${fmtDateTime(session.openedAt)}` : 'Abertura e fechamento de caixa'} />

      {!session ? (
        /* ── Caixa fechado ── */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
            <Wallet size={26} className="text-primary-500" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-white">Nenhum caixa aberto</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">Abra o caixa para começar a registrar as vendas do dia.</p>
          <button onClick={() => setModal('open')} className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
            <Wallet size={16} /> Abrir caixa
          </button>
        </div>
      ) : (
        /* ── Caixa aberto ── */
        <div className="space-y-4 mb-6">
          {/* Resumo principal */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-4 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/80">Total vendido no caixa</p>
                <p className="text-3xl font-bold tracking-tight">{formatBRL(session.salesTotal)}</p>
                <p className="text-[11px] text-white/80 mt-0.5">{session.salesCount} venda{session.salesCount !== 1 ? 's' : ''} · troco inicial {formatBRL(session.openingAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/80">Dinheiro esperado</p>
                <p className="text-xl font-bold">{formatBRL(session.expectedCash)}</p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ActionBtn icon={Plus} label="Registrar venda" onClick={() => setModal('sale')} primary disabled={recipes.length === 0} />
            <ActionBtn icon={ArrowDownCircle} label="Sangria" onClick={() => setModal('sangria')} />
            <ActionBtn icon={ArrowUpCircle} label="Suprimento" onClick={() => setModal('suprimento')} />
            <ActionBtn icon={Lock} label="Fechar caixa" onClick={() => setModal('close')} danger />
          </div>

          {/* Por forma de pagamento */}
          <div className="grid grid-cols-3 gap-3">
            <MethodCard icon={Banknote} label="Dinheiro" value={session.byMethod.dinheiro} color="text-green-600" bg="bg-green-50 dark:bg-green-900/30" />
            <MethodCard icon={CreditCard} label="Cartão" value={session.byMethod.cartao} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/30" />
            <MethodCard icon={QrCode} label="PIX" value={session.byMethod.pix} color="text-primary-600" bg="bg-primary-50 dark:bg-primary-900/30" />
          </div>

          {/* Movimentos */}
          {session.movements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Movimentos</p>
                <p className="text-xs text-gray-400">
                  Sangrias {formatBRL(session.sangriaTotal)} · Suprimentos {formatBRL(session.suprimentoTotal)}
                </p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {session.movements.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    {m.type === 'sangria'
                      ? <ArrowDownCircle size={18} className="text-red-500 shrink-0" />
                      : <ArrowUpCircle size={18} className="text-green-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{m.type}</p>
                      {m.reason && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.reason}</p>}
                    </div>
                    <span className={`font-semibold ${m.type === 'sangria' ? 'text-red-500' : 'text-green-600'}`}>
                      {m.type === 'sangria' ? '-' : '+'}{formatBRL(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendas do caixa */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Vendas deste caixa</p>
            </div>
            {!session.sales || session.sales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma venda ainda. Use “Registrar venda”.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {session.sales.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.recipeName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {s.quantitySold}× · {METHOD_LABEL[s.paymentMethod ?? 'outros']} · {fmtDateTime(s.createdAt)}
                      </p>
                    </div>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatBRL(s.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Histórico ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <History size={16} className="text-gray-400" />
          <p className="font-semibold text-gray-900 dark:text-white text-sm">Histórico de caixas</p>
        </div>
        {closedHistory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum caixa fechado ainda.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {closedHistory.map(s => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock size={14} className="text-gray-400 shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-200 truncate">
                      {fmtDateTime(s.openedAt)} → {s.closedAt ? fmtDateTime(s.closedAt) : '—'}
                    </p>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white shrink-0">{formatBRL(s.salesTotal)}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 pl-6 text-xs text-gray-500 dark:text-gray-400">
                  <span>{s.salesCount} venda{s.salesCount !== 1 ? 's' : ''}</span>
                  {s.difference != null && (
                    <span className={`inline-flex items-center gap-1 font-medium ${
                      Math.abs(s.difference) < 0.005 ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {Math.abs(s.difference) < 0.005
                        ? <><CheckCircle size={12} /> caixa certo</>
                        : <><AlertTriangle size={12} /> {s.difference > 0 ? 'sobra' : 'falta'} {formatBRL(Math.abs(s.difference))}</>}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modais ── */}
      {modal === 'open' && (
        <OpenCashModal toast={toast} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
      {modal === 'close' && session && (
        <CloseCashModal session={session} toast={toast} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
      {(modal === 'sangria' || modal === 'suprimento') && (
        <MovementModal type={modal} toast={toast} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
      {modal === 'sale' && (
        <SaleForm recipes={recipes} toast={toast} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, primary, danger, disabled }: {
  icon: typeof Wallet; label: string; onClick: () => void; primary?: boolean; danger?: boolean; disabled?: boolean;
}) {
  const cls = primary
    ? 'bg-primary-500 hover:bg-primary-600 text-white'
    : danger
      ? 'bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50'
      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700';
  return (
    <button onClick={onClick} disabled={disabled} className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${cls}`}>
      <Icon size={18} /> {label}
    </button>
  );
}

function MethodCard({ icon: Icon, label, value, color, bg }: {
  icon: typeof Wallet; label: string; value: number; color: string; bg: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${bg}`}>
        <Icon size={16} className={color} />
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-base font-bold text-gray-900 dark:text-white tracking-tight">{formatBRL(value)}</p>
    </div>
  );
}

function OpenCashModal({ toast, onClose, onDone }: { toast: ToastFn; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userApi.openCash(Number(amount) || 0, notes.trim() || undefined);
      toast.success('Caixa aberto!');
      onDone();
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(false); }
  };
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Abrir caixa</h3>
        <FormField label="Troco inicial (R$)">
          <input type="number" step="any" min="0" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} autoFocus />
        </FormField>
        <FormField label="Observações (opcional)">
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
        </FormField>
        <FormActions saving={saving} onClose={onClose} saveLabel="Abrir caixa" />
      </form>
    </ModalOverlay>
  );
}

function CloseCashModal({ session, toast, onClose, onDone }: { session: CashSession; toast: ToastFn; onClose: () => void; onDone: () => void }) {
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const diff = counted === '' ? null : (Number(counted) || 0) - session.expectedCash;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userApi.closeCash(Number(counted) || 0, notes.trim() || undefined);
      toast.success('Caixa fechado!');
      onDone();
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(false); }
  };
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Fechar caixa</h3>

        {/* Recebido por forma de pagamento */}
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 space-y-1 text-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Recebido nas vendas</p>
          <Row label="Dinheiro" value={formatBRL(session.byMethod.dinheiro)} />
          <Row label="Cartão" value={formatBRL(session.byMethod.cartao)} />
          <Row label="PIX" value={formatBRL(session.byMethod.pix)} />
          {session.byMethod.outros > 0 && <Row label="Outros" value={formatBRL(session.byMethod.outros)} />}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
            <Row label="Total recebido" value={formatBRL(session.salesTotal)} bold />
          </div>
        </div>

        {/* Conferência da gaveta (somente dinheiro) */}
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 space-y-1 text-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Conferência da gaveta (dinheiro)</p>
          <Row label="Troco inicial" value={formatBRL(session.openingAmount)} />
          <Row label="Vendas em dinheiro" value={`+ ${formatBRL(session.byMethod.dinheiro)}`} />
          <Row label="Suprimentos" value={`+ ${formatBRL(session.suprimentoTotal)}`} />
          <Row label="Sangrias" value={`- ${formatBRL(session.sangriaTotal)}`} />
          <div className="border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
            <Row label="Dinheiro esperado" value={formatBRL(session.expectedCash)} bold />
          </div>
        </div>
        <FormField label="Valor contado em dinheiro (R$)">
          <input type="number" step="any" min="0" value={counted} onChange={e => setCounted(e.target.value)} className={inputClass} autoFocus placeholder="0,00" />
        </FormField>
        {diff != null && (
          <div className={`text-sm font-medium rounded-lg px-3 py-2 ${
            Math.abs(diff) < 0.005 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {Math.abs(diff) < 0.005 ? 'Caixa bate certo ✓' : `${diff > 0 ? 'Sobra' : 'Falta'} de ${formatBRL(Math.abs(diff))}`}
          </div>
        )}
        <FormField label="Observações (opcional)">
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
        </FormField>
        <FormActions saving={saving} onClose={onClose} saveLabel="Fechar caixa" />
      </form>
    </ModalOverlay>
  );
}

function MovementModal({ type, toast, onClose, onDone }: { type: 'sangria' | 'suprimento'; toast: ToastFn; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const isSangria = type === 'sangria';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number(amount)) return toast.error('Informe um valor.');
    setSaving(true);
    try {
      await userApi.addCashMovement(type, Number(amount), reason.trim() || undefined);
      toast.success(isSangria ? 'Sangria registrada.' : 'Suprimento registrado.');
      onDone();
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(false); }
  };
  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{isSangria ? 'Sangria (retirada)' : 'Suprimento (entrada)'}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          {isSangria ? 'Retirada de dinheiro do caixa.' : 'Reforço/entrada de dinheiro no caixa.'}
        </p>
        <FormField label="Valor (R$)">
          <input type="number" step="any" min="0" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} autoFocus placeholder="0,00" />
        </FormField>
        <FormField label="Motivo (opcional)">
          <input value={reason} onChange={e => setReason(e.target.value)} className={inputClass} placeholder={isSangria ? 'Ex.: pagamento fornecedor' : 'Ex.: reforço de troco'} />
        </FormField>
        <FormActions saving={saving} onClose={onClose} saveLabel="Registrar" />
      </form>
    </ModalOverlay>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={bold ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}>{value}</span>
    </div>
  );
}
