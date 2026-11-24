import { useEffect, useState } from 'react';
import { api, AppNotification, AdminUser } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Send, Trash2, Plus, Bell, Sparkles } from 'lucide-react';
import type { NotificationDraft } from '../data/agentMaterials';

interface Props {
  toast: ToastFn;
  initialDraft?: NotificationDraft | null;
  onDraftConsumed?: () => void;
}

const STATUS_CONFIG: Record<AppNotification['status'], { label: string; color: string }> = {
  pending:   { label: 'Pendente',  color: 'bg-yellow-100 text-yellow-700' },
  scheduled: { label: 'Agendada',  color: 'bg-blue-100 text-blue-600' },
  sent:      { label: 'Enviada',   color: 'bg-green-100 text-green-700' },
  failed:    { label: 'Falhou',    color: 'bg-red-100 text-red-600' },
};

const TARGET_CONFIG: Record<string, { label: string; color: string }> = {
  all:     { label: 'Todos',          color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  premium: { label: 'Premium',        color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700' },
  master:  { label: 'Master',         color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' },
  free:    { label: 'Gratuito',       color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
  expired: { label: 'Plano expirado', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
  individual: { label: 'Destinatários selecionados', color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-200' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function NotificationsPage({ toast, initialDraft, onDraftConsumed }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', target: 'all', schedule: false, scheduledAt: '' });
  const [confirmSend, setConfirmSend] = useState<AppNotification | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppNotification | null>(null);
  const [pixPrices, setPixPrices] = useState<{ premium: string; master: string } | null>(null);
  const [loadingPixPrices, setLoadingPixPrices] = useState(false);
  const [templateEligibility, setTemplateEligibility] = useState('');
  const [individualTargetRequired, setIndividualTargetRequired] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientResults, setRecipientResults] = useState<AdminUser[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Pick<AdminUser, 'id' | 'companyName' | 'email'>[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsError, setRecipientsError] = useState('');
  const [saving, setSaving] = useState(false);

  const clearRecipients = () => {
    setRecipientSearch('');
    setRecipientResults([]);
    setSelectedRecipients([]);
    setRecipientsError('');
    setRecipientsLoading(false);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    clearRecipients();
  };

  useEffect(() => {
    const term = recipientSearch.trim();
    if (!showModal || form.target !== 'individual' || term.length < 3) {
      setRecipientResults([]);
      setRecipientsLoading(false);
      setRecipientsError('');
      return;
    }
    let active = true;
    setRecipientResults([]);
    setRecipientsLoading(true);
    setRecipientsError('');
    const timer = setTimeout(async () => {
      try {
        const result = await api.listUsers({ search: term, page: 1, limit: 20 });
        if (active) setRecipientResults(result.users);
      } catch {
        if (active) setRecipientsError('Não foi possível buscar usuários. Altere a busca para tentar novamente.');
      } finally {
        if (active) setRecipientsLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [recipientSearch, showModal, form.target]);

  useEffect(() => {
    if (!initialDraft) return;
    const hasRecipients = initialDraft.recipients !== undefined;
    const individual = Boolean(initialDraft.requiresIndividualTargeting || hasRecipients);
    setForm({ title: initialDraft.title, body: initialDraft.body, target: individual ? 'individual' : initialDraft.target, schedule: false, scheduledAt: '' });
    clearRecipients();
    if (hasRecipients) {
      const unique = new Map<string, Pick<AdminUser, 'id' | 'companyName' | 'email'>>();
      for (const user of initialDraft.recipients ?? []) {
        if (user.isActive && user.id.trim() && !unique.has(user.id)) {
          unique.set(user.id, { id: user.id, companyName: user.companyName, email: user.email });
        }
        if (unique.size >= 100) break;
      }
      setSelectedRecipients([...unique.values()]);
    }
    setTemplateEligibility(initialDraft.eligibility ?? '');
    setIndividualTargetRequired(individual);
    setShowModal(true);
    onDraftConsumed?.();
  }, [initialDraft, onDraftConsumed]);

  const load = async () => {
    try {
      const data = await api.listNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = async () => {
    clearRecipients();
    setTemplateEligibility('');
    setIndividualTargetRequired(false);
    setForm({ title: '', body: '', target: 'all', schedule: false, scheduledAt: '' });
    setShowModal(true);
    setLoadingPixPrices(true);
    try {
      const config = await api.getPlanConfig();
      setPixPrices({
        premium: config.pix?.monthly?.priceLabel ?? `R$ ${config.premiumPrice.toFixed(2).replace('.', ',')}`,
        master: config.pix?.masterMonthly?.priceLabel ?? `R$ ${config.masterPrice.toFixed(2).replace('.', ',')}`,
      });
    } catch {
      setPixPrices(null);
    } finally {
      setLoadingPixPrices(false);
    }
  };

  const usePixPromotionTemplate = () => {
    if (!pixPrices) {
      toast.error('Não foi possível carregar os preços atuais do PIX.');
      return;
    }
    setForm(current => ({
      ...current,
      title: '🎉 Promoção especial no PIX!',
      body: `Renove ou adquira agora um de nossos planos: Master por ${pixPrices.master}/mês ou Premium por ${pixPrices.premium}/mês. Oferta válida somente para pagamento via PIX. Aproveite!`,
    }));
  };

  const save = async () => {
    if (saving) return;
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Preencha o título e o corpo da notificação.');
      return;
    }
    if (individualTargetRequired && form.target !== 'individual') {
      toast.error('Este modelo precisa de destinatários individuais verificados.');
      return;
    }
    if (form.target === 'individual' && (selectedRecipients.length === 0 || selectedRecipients.length > 100)) {
      toast.error('Selecione entre 1 e 100 destinatários.');
      return;
    }
    const scheduledDate = form.schedule ? new Date(form.scheduledAt) : null;
    if (form.schedule && (!form.scheduledAt || !scheduledDate || !Number.isFinite(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now())) {
      toast.error('Escolha uma data e hora futuras para o agendamento.');
      return;
    }
    setSaving(true);
    try {
      await api.createNotification({
        title: form.title.trim(),
        body: form.body.trim(),
        target: form.target,
        recipientUserIds: form.target === 'individual' ? selectedRecipients.map(user => user.id) : undefined,
        scheduledAt: scheduledDate?.toISOString(),
      });
      setShowModal(false);
      clearRecipients();
      toast.success('Notificação criada!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async (n: AppNotification) => {
    try {
      await api.sendNotification(n.id);
      toast.success('Notificação enviada!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (n: AppNotification) => {
    try {
      await api.deleteNotification(n.id);
      toast.success('Notificação excluída.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notificações Push</h2>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <Plus size={16} />
          Nova notificação
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
        {loading ? (
          <TableSkeleton rows={4} cols={7} />
        ) : notifications.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhuma notificação enviada</p>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400 text-xs uppercase">
                <th className="px-5 py-3">Título</th>
                <th className="px-3 py-3">Corpo</th>
                <th className="px-3 py-3">Alvo</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Agendamento</th>
                <th className="px-3 py-3">Destinatários</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {notifications.map(n => {
                const statusCfg = STATUS_CONFIG[n.status];
                const targetCfg = TARGET_CONFIG[n.target] ?? TARGET_CONFIG.all;
                return (
                  <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{n.title}</td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{n.body}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${targetCfg.color}`}>
                        {targetCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {n.scheduledAt ? fmtDate(n.scheduledAt) : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 text-center">{n.recipientsCount}</td>
                    <td className="px-3 py-3 text-right space-x-2">
                      {(n.status === 'scheduled' || n.status === 'pending') && (
                        <button
                          onClick={() => setConfirmSend(n)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <Send size={12} />
                          Enviar agora
                        </button>
                      )}
                      {n.status !== 'sent' && (
                        <button
                          onClick={() => setConfirmDelete(n)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <Trash2 size={12} />
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Send */}
      <ConfirmModal
        open={!!confirmSend}
        title="Enviar notificação"
        message={`Enviar a notificação "${confirmSend?.title}" agora?`}
        confirmLabel="Enviar"
        confirmColor="primary"
        onConfirm={() => { if (confirmSend) sendNow(confirmSend); setConfirmSend(null); }}
        onCancel={() => setConfirmSend(null)}
      />

      {/* Confirm Delete */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir notificação"
        message={`Tem certeza que deseja excluir a notificação "${confirmDelete?.title}"?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Modal */}
      {showModal && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Nova notificação</h3>
            <div className="space-y-3">
              {templateEligibility && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
                  <p className="font-medium">Quando usar este modelo</p>
                  <p>{templateEligibility}</p>
                  <p className="mt-1">Grupos por plano não aplicam filtros de comportamento, vencimento ou falha de pagamento. A seleção individual também exige verificar a condição de cada conta.</p>
                  {individualTargetRequired && <p className="mt-2 font-medium">Este modelo é para destinatários específicos. Selecione somente contas cuja elegibilidade foi confirmada antes de enviar ou agendar.</p>}
                </div>
              )}
              <div className="rounded-lg border border-pink-200 bg-pink-50 dark:border-pink-900 dark:bg-pink-950/20 p-3">
                <button
                  type="button"
                  onClick={usePixPromotionTemplate}
                  disabled={loadingPixPrices || !pixPrices}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 disabled:text-gray-400"
                >
                  <Sparkles size={15} />
                  {loadingPixPrices ? 'Carregando preços...' : 'Usar modelo da promoção PIX'}
                </button>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {pixPrices
                    ? `Valores atuais: Premium ${pixPrices.premium} • Master ${pixPrices.master}.`
                    : 'Usa os valores definidos em Configuração de Planos.'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Título</label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Corpo</label>
                <textarea
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  rows={3}
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Alvo</label>
                <select
                  id="notification-target"
                  aria-label="Alvo da notificação"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none dark:bg-gray-700 dark:text-white"
                  value={form.target}
                  disabled={saving}
                  onChange={e => { setForm({ ...form, target: e.target.value }); clearRecipients(); }}
                >
                  <option value="individual">Destinatários selecionados</option>
                  <option value="all" disabled={individualTargetRequired}>Todos</option>
                  <option value="premium" disabled={individualTargetRequired}>Premium</option>
                  <option value="master" disabled={individualTargetRequired}>Master</option>
                  <option value="free" disabled={individualTargetRequired}>Gratuito</option>
                  <option value="expired" disabled={individualTargetRequired}>Plano expirado (ex-assinantes)</option>
                </select>
              </div>
              {form.target === 'individual' ? (
                <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-600">
                  <label htmlFor="notification-recipient-search" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Buscar destinatários por nome ou e-mail</label>
                  <input id="notification-recipient-search" type="search" value={recipientSearch} disabled={saving}
                    onChange={event => setRecipientSearch(event.target.value)} autoComplete="off"
                    aria-describedby="notification-recipient-help"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  <p id="notification-recipient-help" className="text-xs text-gray-500 dark:text-gray-400">Digite pelo menos 3 caracteres. Exibimos até 20 resultados por busca; refine para localizar outras contas. A busca não seleciona usuários automaticamente.</p>
                  <p role="status" aria-live="polite" className="text-sm text-gray-700 dark:text-gray-200">{selectedRecipients.length} de 100 destinatários selecionados</p>
                  {selectedRecipients.length > 0 && (
                    <ul aria-label="Destinatários selecionados" className="max-h-36 space-y-1 overflow-y-auto">
                      {selectedRecipients.map(user => <li key={user.id} className="flex items-center justify-between gap-2 text-sm dark:text-gray-200"><span className="min-w-0 break-all">{user.companyName || user.email} — {user.email}</span><button type="button" disabled={saving}
                        onClick={() => setSelectedRecipients(previous => previous.filter(selected => selected.id !== user.id))}
                        aria-label={`Remover ${user.email}`} className="shrink-0 rounded px-2 py-1 text-red-600 focus:ring-2 focus:ring-primary-500">Remover</button></li>)}
                    </ul>
                  )}
                  {recipientsLoading && <p role="status" className="text-sm text-gray-500">Buscando usuários…</p>}
                  {recipientsError && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{recipientsError}</p>}
                  {!recipientsLoading && !recipientsError && recipientSearch.trim().length >= 3 && recipientResults.length === 0 && <p role="status" className="text-sm text-gray-500">Nenhum usuário encontrado para esta busca.</p>}
                  {recipientResults.length > 0 && (
                    <ul aria-label="Resultados da busca" className="max-h-40 space-y-2 overflow-y-auto">
                      {recipientResults.map(user => {
                        const checked = selectedRecipients.some(selected => selected.id === user.id);
                        return <li key={user.id}><label className="flex cursor-pointer items-start gap-2 text-sm dark:text-gray-200"><input type="checkbox" checked={checked} disabled={saving || (!checked && selectedRecipients.length >= 100)}
                          onChange={() => setSelectedRecipients(previous => previous.some(selected => selected.id === user.id) ? previous.filter(selected => selected.id !== user.id) : previous.length < 100 ? [...previous, { id: user.id, companyName: user.companyName, email: user.email }] : previous)}
                          className="mt-1 rounded" /><span className="break-all">{user.companyName || 'Sem nome'} — {user.email}</span></label></li>;
                      })}
                    </ul>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">Somente as contas listadas como selecionadas recebem este envio. A existência da conta não garante dispositivo habilitado ou entrega. No agendamento, estes IDs ficam salvos; não há reavaliação automática da elegibilidade.</p>
                </div>
              ) : <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">Envio amplo para o grupo {TARGET_CONFIG[form.target]?.label ?? form.target}. Nenhuma seleção individual será usada. Revise se o texto se aplica a todas essas contas.</p>}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.schedule}
                    onChange={e => setForm({ ...form, schedule: e.target.checked })}
                    className="rounded"
                  />
                  Agendar envio
                </label>
                {form.schedule && (
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none mt-2 dark:bg-gray-700 dark:text-white"
                    value={form.scheduledAt}
                    onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                disabled={saving}
                className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || !form.title.trim() || !form.body.trim() || (individualTargetRequired && form.target !== 'individual') || (form.target === 'individual' && selectedRecipients.length === 0) || (form.schedule && !form.scheduledAt)}
                className="text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {saving ? 'Salvando…' : form.schedule ? 'Agendar' : 'Enviar agora'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
