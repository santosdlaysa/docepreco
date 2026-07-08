import { useEffect, useState } from 'react';
import { api, Tip, NotificationTemplate } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Plus, Pencil, Trash2, Power, Send, Lightbulb, BellRing } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const SLUG_LABELS: Record<string, string> = {
  inactivity_2d: 'Inatividade 2 dias',
  inactivity_5d: 'Inatividade 5 dias',
  daily_sales: 'Vendas diárias',
  weekly_reminder: 'Lembrete semanal',
  sales_summary_midday: 'Resumo de vendas (1ª parcial)',
  sales_summary_afternoon: 'Resumo de vendas (2ª parcial)',
  sales_summary_evening: 'Resumo de vendas (dia)',
};

// Templates enviados pelo servidor com dados do usuário (aceitam placeholders)
const PLACEHOLDER_SLUG_PREFIX = 'sales_summary_';

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Domingo', 2: 'Segunda', 3: 'Terça', 4: 'Quarta', 5: 'Quinta', 6: 'Sexta', 7: 'Sábado',
};

function describeSchedule(t: { scheduleType: string; scheduleHour: number | null; scheduleMinute: number | null; scheduleWeekday: number | null; scheduleIntervalHours: number | null }): string {
  const h = t.scheduleHour != null ? String(t.scheduleHour).padStart(2, '0') : '--';
  const m = t.scheduleMinute != null ? String(t.scheduleMinute).padStart(2, '0') : '00';
  if (t.scheduleType === 'interval') {
    return `A cada ${t.scheduleIntervalHours ?? '?'}h de inatividade`;
  }
  if (t.scheduleType === 'weekly') {
    return `${WEEKDAY_LABELS[t.scheduleWeekday ?? 2] ?? '?'} às ${h}:${m}`;
  }
  return `Diariamente às ${h}:${m}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function TipsPage({ toast }: Props) {
  // ── Tips state ──
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tip | null>(null);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Tip | null>(null);

  // ── Notification Templates state ──
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateScheduleType, setTemplateScheduleType] = useState<'daily' | 'weekly' | 'interval'>('daily');
  const [templateScheduleHour, setTemplateScheduleHour] = useState<number>(19);
  const [templateScheduleMinute, setTemplateScheduleMinute] = useState<number>(0);
  const [templateScheduleWeekday, setTemplateScheduleWeekday] = useState<number>(2);
  const [templateScheduleIntervalHours, setTemplateScheduleIntervalHours] = useState<number>(48);
  const [confirmSendTemplate, setConfirmSendTemplate] = useState<NotificationTemplate | null>(null);

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
        toast.success('Dica atualizada!');
      } else {
        await api.createTip(message);
        toast.success('Dica criada!');
      }
      setShowModal(false);
      loadTips();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = async (t: Tip) => {
    try {
      await api.updateTip(t.id, { isActive: !t.isActive });
      toast.success(t.isActive ? 'Dica desativada.' : 'Dica ativada!');
      loadTips();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (t: Tip) => {
    try {
      await api.deleteTip(t.id);
      toast.success('Dica excluída.');
      loadTips();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ── Template handlers ──
  const openEditTemplate = (t: NotificationTemplate) => {
    setEditingTemplate(t);
    setTemplateTitle(t.title);
    setTemplateBody(t.body);
    setTemplateScheduleType(t.scheduleType ?? 'daily');
    setTemplateScheduleHour(t.scheduleHour ?? 19);
    setTemplateScheduleMinute(t.scheduleMinute ?? 0);
    setTemplateScheduleWeekday(t.scheduleWeekday ?? 2);
    setTemplateScheduleIntervalHours(t.scheduleIntervalHours ?? 48);
    setShowTemplateModal(true);
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await api.updateNotificationTemplate(editingTemplate.id, {
        title: templateTitle,
        body: templateBody,
        scheduleType: templateScheduleType,
        scheduleHour: templateScheduleType !== 'interval' ? templateScheduleHour : null,
        scheduleMinute: templateScheduleType !== 'interval' ? templateScheduleMinute : null,
        scheduleWeekday: templateScheduleType === 'weekly' ? templateScheduleWeekday : null,
        scheduleIntervalHours: templateScheduleType === 'interval' ? templateScheduleIntervalHours : null,
      } as any);
      setShowTemplateModal(false);
      toast.success('Template atualizado!');
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleTemplateActive = async (t: NotificationTemplate) => {
    try {
      await api.updateNotificationTemplate(t.id, { isActive: !t.isActive });
      toast.success(t.isActive ? 'Template desativado.' : 'Template ativado!');
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sendTemplatePush = async (t: NotificationTemplate) => {
    try {
      const result = await api.sendNotificationTemplate(t.id);
      toast.success(`Enviado para ${result.recipientsCount} dispositivo(s)!`);
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Dicas Motivacionais ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb size={20} className="text-yellow-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dicas Motivacionais</h2>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <Plus size={16} />
            Nova dica
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : tips.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhuma dica cadastrada</p>
          ) : (
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400 text-xs uppercase">
                  <th className="px-5 py-3">Mensagem</th>
                  <th className="px-3 py-3 w-24">Status</th>
                  <th className="px-3 py-3 w-40">Criada em</th>
                  <th className="px-3 py-3 text-right w-56">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {tips.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-5 py-3 text-gray-900 dark:text-white">{t.message}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        t.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {t.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 text-xs">{fmtDate(t.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(t)}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                            t.isActive
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                              : 'bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                          }`}
                        >
                          <Power size={12} />
                          {t.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => openEdit(t)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmDelete(t)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <Trash2 size={12} />
                          Excluir
                        </button>
                      </div>
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
          <div className="flex items-center gap-2">
            <BellRing size={20} className="text-purple-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notificações Locais</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Templates das notificações agendadas (locais do app e resumos de vendas enviados pelo servidor)</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
          {templatesLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : templates.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhum template encontrado</p>
          ) : (
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400 text-xs uppercase">
                  <th className="px-5 py-3 w-44">Tipo</th>
                  <th className="px-3 py-3">Título</th>
                  <th className="px-3 py-3">Corpo</th>
                  <th className="px-3 py-3">Agendamento</th>
                  <th className="px-3 py-3 w-24">Status</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {templates.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200 font-medium text-xs">
                      {SLUG_LABELS[t.slug] ?? t.slug}
                    </td>
                    <td className="px-3 py-3 text-gray-900 dark:text-white">{t.title}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300 text-xs max-w-xs truncate">{t.body}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {describeSchedule(t)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        t.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {t.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => toggleTemplateActive(t)}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                            t.isActive
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                              : 'bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                          }`}
                        >
                          <Power size={12} />
                          {t.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => openEditTemplate(t)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmSendTemplate(t)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        >
                          <Send size={12} />
                          Enviar agora
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirm Delete Tip */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir dica"
        message={`Tem certeza que deseja excluir esta dica?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Confirm Send Template */}
      <ConfirmModal
        open={!!confirmSendTemplate}
        title="Enviar notificação"
        message={`Enviar push "${confirmSendTemplate?.title}" para todos os usuários agora?`}
        confirmLabel="Enviar"
        confirmColor="primary"
        onConfirm={() => { if (confirmSendTemplate) sendTemplatePush(confirmSendTemplate); setConfirmSendTemplate(null); }}
        onCancel={() => setConfirmSendTemplate(null)}
      />

      {/* Modal Dicas */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editing ? 'Editar dica' : 'Nova dica'}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Mensagem</label>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ex: Dica: revise seus preços a cada 15 dias..."
              />
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
                disabled={!message.trim()}
                className="text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Modal Templates */}
      {showTemplateModal && editingTemplate && (
        <ModalOverlay onClose={() => setShowTemplateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Editar notificação — {SLUG_LABELS[editingTemplate.slug] ?? editingTemplate.slug}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Título</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  value={templateTitle}
                  onChange={e => setTemplateTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Corpo</label>
                <textarea
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  rows={3}
                  value={templateBody}
                  onChange={e => setTemplateBody(e.target.value)}
                />
                {editingTemplate.slug.startsWith(PLACEHOLDER_SLUG_PREFIX) && (
                  <p className="text-xs text-gray-400 mt-1">
                    Placeholders disponíveis: <code>{'{nome}'}</code> (confeitaria), <code>{'{vendas}'}</code> (ex: "3 vendas") e <code>{'{valor}'}</code> (ex: "R$ 150,00"). Enviado só para quem registrou vendas no dia.
                  </p>
                )}
              </div>

              {/* Agendamento */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Agendamento</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tipo</label>
                    <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none dark:bg-gray-700 dark:text-white"
                      value={templateScheduleType} onChange={e => setTemplateScheduleType(e.target.value as any)}>
                      <option value="daily">Diariamente</option>
                      <option value="weekly">Semanalmente</option>
                      <option value="interval">Por inatividade (intervalo)</option>
                    </select>
                  </div>

                  {templateScheduleType !== 'interval' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hora</label>
                        <input type="number" min="0" max="23"
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none dark:bg-gray-700 dark:text-white"
                          value={templateScheduleHour} onChange={e => setTemplateScheduleHour(parseInt(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Minuto</label>
                        <input type="number" min="0" max="59"
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none dark:bg-gray-700 dark:text-white"
                          value={templateScheduleMinute} onChange={e => setTemplateScheduleMinute(parseInt(e.target.value) || 0)} />
                      </div>
                      {templateScheduleType === 'weekly' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dia da semana</label>
                          <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none dark:bg-gray-700 dark:text-white"
                            value={templateScheduleWeekday} onChange={e => setTemplateScheduleWeekday(parseInt(e.target.value))}>
                            <option value={1}>Domingo</option>
                            <option value={2}>Segunda</option>
                            <option value={3}>Terça</option>
                            <option value={4}>Quarta</option>
                            <option value={5}>Quinta</option>
                            <option value={6}>Sexta</option>
                            <option value={7}>Sábado</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Horas de inatividade</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1"
                          className="w-32 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none dark:bg-gray-700 dark:text-white"
                          value={templateScheduleIntervalHours} onChange={e => setTemplateScheduleIntervalHours(parseInt(e.target.value) || 1)} />
                        <span className="text-sm text-gray-500 dark:text-gray-400">horas sem abrir o app</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2">
                    {templateScheduleType === 'interval'
                      ? `Será disparada ${templateScheduleIntervalHours}h após o usuário parar de usar o app`
                      : templateScheduleType === 'weekly'
                        ? `Toda ${WEEKDAY_LABELS[templateScheduleWeekday]} às ${String(templateScheduleHour).padStart(2, '0')}:${String(templateScheduleMinute).padStart(2, '0')}`
                        : `Todo dia às ${String(templateScheduleHour).padStart(2, '0')}:${String(templateScheduleMinute).padStart(2, '0')}`
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
        </ModalOverlay>
      )}
    </div>
  );
}
