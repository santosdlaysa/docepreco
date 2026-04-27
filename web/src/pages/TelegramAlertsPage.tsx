import { useEffect, useState } from 'react';
import { api, TelegramAlert } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { ToggleLeft, ToggleRight, Bell, BarChart3, Plus, Pencil, Trash2 } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  alerts: { label: 'Alertas em tempo real', icon: Bell, color: 'text-blue-500' },
  reports: { label: 'Relatórios periódicos', icon: BarChart3, color: 'text-purple-500' },
};

const KEY_EMOJIS: Record<string, string> = {
  new_user: '🆕',
  new_sale: '🧁',
  premium_event: '💎',
  user_milestone: '🎉',
  error_alert: '🚨',
  slow_api: '🐢',
  daily_report: '📊',
  weekly_report: '📈',
  goal_progress: '🎯',
};

const KEY_VARS: Record<string, string[]> = {
  new_user: ['companyName', 'email', 'time'],
  new_sale: ['companyName', 'recipeName', 'quantity', 'revenue', 'time'],
  premium_event: ['eventLabel', 'companyName', 'eventType', 'platform', 'time'],
  user_milestone: ['total', 'time'],
  error_alert: ['method', 'path', 'statusCode', 'duration', 'error', 'time'],
  slow_api: ['method', 'path', 'duration', 'time'],
  daily_report: ['total', 'premium', 'today', 'time'],
  weekly_report: ['newUsers', 'newRecipes', 'totalSales', 'revenue', 'time'],
  goal_progress: ['progressBar', 'percent', 'today', 'goal', 'status', 'time'],
};

const EMPTY = { key: '', label: '', description: '', isEnabled: true, category: 'alerts', messageTemplate: '' };

export function TelegramAlertsPage({ toast }: Props) {
  const [alerts, setAlerts] = useState<TelegramAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TelegramAlert | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<TelegramAlert | null>(null);

  const load = async () => {
    try {
      setAlerts(await api.listTelegramAlerts());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (a: TelegramAlert) => {
    try {
      await api.updateTelegramAlert(a.id, { isEnabled: !a.isEnabled });
      toast.success(`${a.label} ${a.isEnabled ? 'desativado' : 'ativado'}!`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowModal(true);
  };

  const openEdit = (a: TelegramAlert) => {
    setEditing(a);
    setForm({ key: a.key, label: a.label, description: a.description, isEnabled: a.isEnabled, category: a.category, messageTemplate: a.messageTemplate ?? '' });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateTelegramAlert(editing.id, { label: form.label, description: form.description, messageTemplate: form.messageTemplate || null } as any);
        toast.success('Alerta atualizado!');
      } else {
        await api.createTelegramAlert({ ...form, messageTemplate: form.messageTemplate || undefined } as any);
        toast.success('Alerta criado!');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (a: TelegramAlert) => {
    try {
      await api.deleteTelegramAlert(a.id);
      toast.success('Alerta excluído.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const categories = [...new Set(alerts.map(a => a.category))];
  if (!categories.includes('alerts')) categories.unshift('alerts');
  if (!categories.includes('reports')) categories.push('reports');

  const vars = editing ? (KEY_VARS[editing.key] ?? []) : [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Telegram</h2>
          <p className="text-sm text-gray-500 mt-1">Controle quais alertas são enviados e personalize as mensagens.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={16} /> Novo alerta
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <TableSkeleton rows={6} cols={2} />
        </div>
      ) : (
        categories.map(cat => {
          const cfg = CATEGORY_CONFIG[cat] ?? { label: cat, icon: Bell, color: 'text-gray-500' };
          const Icon = cfg.icon;
          const items = alerts.filter(a => a.category === cat);
          const enabledCount = items.filter(a => a.isEnabled).length;

          return (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={18} className={cfg.color} />
                  <h3 className="text-base font-bold text-gray-900">{cfg.label}</h3>
                </div>
                <span className="text-xs text-gray-400">{enabledCount}/{items.length} ativos</span>
              </div>
              {items.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">Nenhum alerta nesta categoria</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {items.map(a => (
                    <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <button onClick={() => toggle(a)} className="shrink-0">
                        {a.isEnabled ? (
                          <ToggleRight size={28} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={28} className="text-gray-300" />
                        )}
                      </button>
                      <span className="text-xl shrink-0">{KEY_EMOJIS[a.key] ?? '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{a.label}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${a.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {a.isEnabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => openEdit(a)} className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setConfirmDelete(a)} className="inline-flex items-center text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir alerta"
        message={`Tem certeza que deseja excluir "${confirmDelete?.label}"?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Editar alerta' : 'Novo alerta'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chave</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.key} onChange={e => setForm({ ...form, key: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                  placeholder="ex: custom_alert" disabled={!!editing} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Ex: Alerta de estoque" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Quando isso deve ser disparado?" />
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="alerts">Alertas em tempo real</option>
                    <option value="reports">Relatórios periódicos</option>
                  </select>
                </div>
              )}

              {/* Template da mensagem */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Mensagem do Telegram</label>
                <p className="text-xs text-gray-400 mb-2">Use {'{{variavel}}'} para inserir dados dinâmicos. Use \n para quebra de linha.</p>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  rows={6} value={form.messageTemplate} onChange={e => setForm({ ...form, messageTemplate: e.target.value })}
                  placeholder="Ex: 🆕 Novo cadastro!\n\n🏪 {{companyName}}\n📧 {{email}}" />

                {vars.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Variáveis disponíveis:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {vars.map(v => (
                        <button key={v} onClick={() => setForm({ ...form, messageTemplate: form.messageTemplate + `{{${v}}}` })}
                          className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-mono">
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={save} disabled={!form.key || !form.label}
                className="text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium">
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
