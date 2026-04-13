import { useEffect, useState } from 'react';
import { api, Tip, NotificationTemplate } from '../lib/api';

const SLUG_LABELS: Record<string, string> = {
  inactivity_2d: 'Inatividade 2 dias',
  inactivity_5d: 'Inatividade 5 dias',
  daily_sales: 'Vendas diárias',
  weekly_reminder: 'Lembrete semanal',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function TipsPage() {
  // ── Tips state ──
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tip | null>(null);
  const [message, setMessage] = useState('');

  // ── Notification Templates state ──
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  const loadTips = async () => {
    try {
      const data = await api.listTips();
      setTips(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await api.listNotificationTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => { loadTips(); loadTemplates(); }, []);

  // ── Tips handlers ──
  const openNew = () => {
    setEditing(null);
    setMessage('');
    setShowModal(true);
  };

  const openEdit = (t: Tip) => {
    setEditing(t);
    setMessage(t.message);
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateTip(editing.id, { message });
      } else {
        await api.createTip(message);
      }
      setShowModal(false);
      loadTips();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const toggleActive = async (t: Tip) => {
    try {
      await api.updateTip(t.id, { isActive: !t.isActive });
      loadTips();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (t: Tip) => {
    if (!confirm(`Excluir a dica "${t.message.slice(0, 40)}..."?`)) return;
    try {
      await api.deleteTip(t.id);
      loadTips();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── Template handlers ──
  const openEditTemplate = (t: NotificationTemplate) => {
    setEditingTemplate(t);
    setTemplateTitle(t.title);
    setTemplateBody(t.body);
    setShowTemplateModal(true);
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await api.updateNotificationTemplate(editingTemplate.id, {
        title: templateTitle,
        body: templateBody,
      });
      setShowTemplateModal(false);
      loadTemplates();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const toggleTemplateActive = async (t: NotificationTemplate) => {
    try {
      await api.updateNotificationTemplate(t.id, { isActive: !t.isActive });
      loadTemplates();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Dicas Motivacionais ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Dicas Motivacionais</h2>
          <button
            onClick={openNew}
            className="text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            + Nova dica
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <p className="text-center text-gray-400 py-10">Carregando...</p>
          ) : tips.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhuma dica cadastrada</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                  <th className="px-5 py-3">Mensagem</th>
                  <th className="px-3 py-3 w-24">Status</th>
                  <th className="px-3 py-3 w-40">Criada em</th>
                  <th className="px-3 py-3 text-right w-56">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tips.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-900">{t.message}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        t.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{fmtDate(t.createdAt)}</td>
                    <td className="px-3 py-3 text-right space-x-2">
                      <button
                        onClick={() => toggleActive(t)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          t.isActive
                            ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {t.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => openEdit(t)}
                        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => remove(t)}
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Notificações Locais ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Notificações Locais</h2>
            <p className="text-sm text-gray-500 mt-1">Templates das notificações agendadas no celular do usuário</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {templatesLoading ? (
            <p className="text-center text-gray-400 py-10">Carregando...</p>
          ) : templates.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhum template encontrado</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                  <th className="px-5 py-3 w-44">Tipo</th>
                  <th className="px-3 py-3">Título</th>
                  <th className="px-3 py-3">Corpo</th>
                  <th className="px-3 py-3 w-24">Status</th>
                  <th className="px-3 py-3 text-right w-44">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {templates.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-700 font-medium text-xs">
                      {SLUG_LABELS[t.slug] ?? t.slug}
                    </td>
                    <td className="px-3 py-3 text-gray-900">{t.title}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs max-w-xs truncate">{t.body}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        t.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right space-x-2">
                      <button
                        onClick={() => toggleTemplateActive(t)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          t.isActive
                            ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {t.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => openEditTemplate(t)}
                        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Dicas */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Editar dica' : 'Nova dica'}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ex: Dica: revise seus preços a cada 15 dias..."
              />
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
                disabled={!message.trim()}
                className="text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Templates */}
      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Editar notificação — {SLUG_LABELS[editingTemplate.slug] ?? editingTemplate.slug}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={templateTitle}
                  onChange={e => setTemplateTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Corpo</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  rows={3}
                  value={templateBody}
                  onChange={e => setTemplateBody(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveTemplate}
                disabled={!templateTitle.trim() || !templateBody.trim()}
                className="text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
