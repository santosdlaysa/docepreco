import { useEffect, useState } from 'react';
import { api, Banner } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Info, AlertTriangle, Gift, RefreshCw, Pencil, Trash2, Power, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const TYPE_CONFIG: Record<Banner['type'], { label: string; color: string; icon: LucideIcon }> = {
  info:    { label: 'Info',        color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Info },
  warning: { label: 'Aviso',       color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: AlertTriangle },
  promo:   { label: 'Promoção',    color: 'bg-green-50 border-green-200 text-green-700', icon: Gift },
  update:  { label: 'Atualização', color: 'bg-purple-50 border-purple-200 text-purple-700', icon: RefreshCw },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getStatus(b: Banner): { label: string; color: string } {
  if (!b.isActive) return { label: 'Inativo', color: 'bg-gray-100 text-gray-500' };
  const now = Date.now();
  const start = new Date(b.startsAt).getTime();
  const end = b.endsAt ? new Date(b.endsAt).getTime() : null;
  if (start > now) return { label: 'Agendado', color: 'bg-blue-100 text-blue-600' };
  if (end && end < now) return { label: 'Expirado', color: 'bg-orange-100 text-orange-600' };
  return { label: 'Ativo', color: 'bg-green-100 text-green-700' };
}

const EMPTY: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  message: '',
  type: 'info',
  actionUrl: null,
  startsAt: new Date().toISOString().slice(0, 16),
  endsAt: null,
  isActive: true,
};

export function BannersPage({ toast }: Props) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);

  const load = async () => {
    try {
      const data = await api.listBanners();
      setBanners(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, startsAt: new Date().toISOString().slice(0, 16) });
    setShowModal(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      message: b.message,
      type: b.type,
      actionUrl: b.actionUrl,
      startsAt: b.startsAt.slice(0, 16),
      endsAt: b.endsAt ? b.endsAt.slice(0, 16) : null,
      isActive: b.isActive,
    });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateBanner(editing.id, form);
        toast.success('Banner atualizado!');
      } else {
        await api.createBanner(form);
        toast.success('Banner criado!');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = async (b: Banner) => {
    try {
      await api.updateBanner(b.id, { isActive: !b.isActive });
      toast.success(b.isActive ? 'Banner desativado.' : 'Banner ativado!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (b: Banner) => {
    try {
      await api.deleteBanner(b.id);
      toast.success('Banner excluído.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-900">Banners</h2>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <Plus size={16} />
          Novo banner
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        {loading ? (
          <TableSkeleton rows={4} cols={6} />
        ) : banners.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhum banner cadastrado</p>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                <th className="px-5 py-3">Título</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Início</th>
                <th className="px-3 py-3">Fim</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {banners.map(b => {
                const typeCfg = TYPE_CONFIG[b.type];
                const TypeIcon = typeCfg.icon;
                const status = getStatus(b);
                return (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{b.title}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${typeCfg.color}`}>
                        <TypeIcon size={12} />
                        {typeCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{fmtDate(b.startsAt)}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{b.endsAt ? fmtDate(b.endsAt) : '—'}</td>
                    <td className="px-3 py-3 text-right space-x-2">
                      <button
                        onClick={() => toggleActive(b)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          b.isActive
                            ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        <Power size={12} />
                        {b.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => openEdit(b)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(b)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={12} />
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Delete */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir banner"
        message={`Tem certeza que deseja excluir o banner "${confirmDelete?.title}"?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Modal */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Editar banner' : 'Novo banner'}
            </h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  rows={3}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as Banner['type'] })}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Aviso</option>
                    <option value="promo">Promoção</option>
                    <option value="update">Atualização</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL de ação (opcional)</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.actionUrl ?? ''}
                    onChange={e => setForm({ ...form, actionUrl: e.target.value || null })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.startsAt}
                    onChange={e => setForm({ ...form, startsAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fim (opcional)</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.endsAt ?? ''}
                    onChange={e => setForm({ ...form, endsAt: e.target.value || null })}
                  />
                </div>
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
                disabled={!form.title || !form.message}
                className="text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
