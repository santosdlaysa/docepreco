import { useEffect, useState } from 'react';
import { api, AppNotification } from '../lib/api';

const STATUS_CONFIG: Record<AppNotification['status'], { label: string; color: string }> = {
  pending:   { label: 'Pendente',  color: 'bg-yellow-100 text-yellow-700' },
  scheduled: { label: 'Agendada',  color: 'bg-blue-100 text-blue-600' },
  sent:      { label: 'Enviada',   color: 'bg-green-100 text-green-700' },
  failed:    { label: 'Falhou',    color: 'bg-red-100 text-red-600' },
};

const TARGET_CONFIG: Record<string, { label: string; color: string }> = {
  all:     { label: 'Todos',    color: 'bg-gray-100 text-gray-600' },
  premium: { label: 'Premium',  color: 'bg-yellow-50 text-yellow-700' },
  free:    { label: 'Gratuito', color: 'bg-blue-50 text-blue-600' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', target: 'all', schedule: false, scheduledAt: '' });

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
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const sendNow = async (n: AppNotification) => {
    if (!confirm(`Enviar a notificação "${n.title}" agora?`)) return;
    try {
      await api.sendNotification(n.id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (n: AppNotification) => {
    if (!confirm(`Excluir a notificação "${n.title}"?`)) return;
    try {
      await api.deleteNotification(n.id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Notificações Push</h2>
        <button
          onClick={openNew}
          className="text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          + Nova notificação
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-10">Carregando...</p>
        ) : notifications.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhuma notificação enviada</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                <th className="px-5 py-3">Título</th>
                <th className="px-3 py-3">Corpo</th>
                <th className="px-3 py-3">Alvo</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Agendamento</th>
                <th className="px-3 py-3">Enviados</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {notifications.map(n => {
                const statusCfg = STATUS_CONFIG[n.status];
                const targetCfg = TARGET_CONFIG[n.target] ?? TARGET_CONFIG.all;
                return (
                  <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{n.title}</td>
                    <td className="px-3 py-3 text-gray-500 max-w-[200px] truncate">{n.body}</td>
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
                    <td className="px-3 py-3 text-gray-500 text-xs">
                      {n.scheduledAt ? fmtDate(n.scheduledAt) : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-center">{n.recipientsCount}</td>
                    <td className="px-3 py-3 text-right space-x-2">
                      {(n.status === 'scheduled' || n.status === 'pending') && (
                        <button
                          onClick={() => sendNow(n)}
                          className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                        >
                          Enviar agora
                        </button>
                      )}
                      {n.status !== 'sent' && (
                        <button
                          onClick={() => remove(n)}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nova notificação</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Corpo</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  rows={3}
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alvo</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                  value={form.target}
                  onChange={e => setForm({ ...form, target: e.target.value })}
                >
                  <option value="all">Todos</option>
                  <option value="premium">Premium</option>
                  <option value="free">Gratuito</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none mt-2"
                    value={form.scheduledAt}
                    onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
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
        </div>
      )}
    </div>
  );
}
