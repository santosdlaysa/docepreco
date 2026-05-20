import { useEffect, useState } from 'react';
import { api, FeatureFlag } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Pencil, Trash2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const EMPTY = { key: '', description: '', isEnabled: false };

export function FeatureFlagsPage({ toast }: Props) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FeatureFlag | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<FeatureFlag | null>(null);

  const load = async () => {
    try {
      setFlags(await api.listFeatureFlags());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setShowModal(true); };
  const openEdit = (f: FeatureFlag) => { setEditing(f); setForm({ key: f.key, description: f.description, isEnabled: f.isEnabled }); setShowModal(true); };

  const save = async () => {
    try {
      if (editing) {
        await api.updateFeatureFlag(editing.id, form);
        toast.success('Flag atualizada!');
      } else {
        await api.createFeatureFlag(form);
        toast.success('Flag criada!');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggle = async (f: FeatureFlag) => {
    try {
      await api.updateFeatureFlag(f.id, { isEnabled: !f.isEnabled });
      toast.success(`${f.key} ${f.isEnabled ? 'desativada' : 'ativada'}!`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (f: FeatureFlag) => {
    try {
      await api.deleteFeatureFlag(f.id);
      toast.success('Flag excluída.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Feature Flags</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Ative ou desative funcionalidades do app remotamente</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={16} /> Nova flag
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : flags.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhuma feature flag cadastrada</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {flags.map(f => (
              <div key={f.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <button onClick={() => toggle(f)} className="shrink-0">
                  {f.isEnabled ? (
                    <ToggleRight size={28} className="text-green-500" />
                  ) : (
                    <ToggleLeft size={28} className="text-gray-300" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{f.key}</code>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${f.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {f.isEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{f.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(f)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors">
                    <Pencil size={12} /> Editar
                  </button>
                  <button onClick={() => setConfirmDelete(f)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors">
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir feature flag"
        message={`Tem certeza que deseja excluir a flag "${confirmDelete?.key}"?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editing ? 'Editar flag' : 'Nova flag'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Chave</label>
                <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 font-mono focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.key} onChange={e => setForm({ ...form, key: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                  placeholder="ex: show_new_onboarding" disabled={!!editing} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Descrição</label>
                <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="O que essa flag controla?" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isEnabled} onChange={e => setForm({ ...form, isEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-500 focus:ring-primary-400" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Ativada</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
              <button onClick={save} disabled={!form.key || !form.description}
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
