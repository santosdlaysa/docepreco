import { useEffect, useState } from 'react';
import { api, AppNotification } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Send, Trash2, Plus, Bell } from 'lucide-react';

interface Props {
  toast: ToastFn;
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
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function NotificationsPage({ toast }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', target: 'all', schedule: false, scheduledAt: '' });
  const [confirmSend, setConfirmSend] = useState<AppNotification | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppNotification | null>(null);

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

  const openNew = () => {
    setForm({ title: '', body: '', target: 'all', schedule: false, scheduledAt: '' });
    setShowModal(true);
  };

  const save = async () => {
    try {
      await api.createNotification({
        title: form.title,
        body: form.body,
        target: form.target,
        scheduledAt: form.schedule && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      });
      setShowModal(false);
      toast.success('Notificação criada!');
      load();
    } catch (e: any) {
      toast.error(e.message);
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
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Nova notificação</h3>
            <div className="space-y-3">
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
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none dark:bg-gray-700 dark:text-white"
                  value={form.target}
                  onChange={e => setForm({ ...form, target: e.target.value })}
                >
                  <option value="all">Todos</option>
                  <option value="premium">Premium</option>
                  <option value="master">Master</option>
                  <option value="free">Gratuito</option>
                  <option value="expired">Plano expirado (ex-assinantes)</option>
                </select>
              </div>
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
                onClick={() => setShowModal(false)}
                className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={!form.title || !form.body}
                className="text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {form.schedule ? 'Agendar' : 'Enviar agora'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
