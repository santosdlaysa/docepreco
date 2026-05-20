import { useEffect, useState } from 'react';
import { api, ChangelogEntry } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Pencil, Trash2, Plus, Power, Rocket, X } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const EMPTY = {
  version: '',
  title: '',
  description: '',
  features: [] as string[],
  isActive: true,
};

export function ChangelogPage({ toast }: Props) {
  const [items, setItems] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ChangelogEntry | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [newFeature, setNewFeature] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ChangelogEntry | null>(null);

  const load = async () => {
    try {
      setItems(await api.listChangelog());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, features: [] }); setShowModal(true); };
  const openEdit = (item: ChangelogEntry) => {
    setEditing(item);
    setForm({ version: item.version, title: item.title, description: item.description, features: [...item.features], isActive: item.isActive });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateChangelog(editing.id, form);
        toast.success('Changelog atualizado!');
      } else {
        await api.createChangelog(form);
        toast.success('Changelog criado!');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = async (item: ChangelogEntry) => {
    try {
      await api.updateChangelog(item.id, { isActive: !item.isActive });
      toast.success(item.isActive ? 'Changelog desativado.' : 'Changelog ativado!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (item: ChangelogEntry) => {
    try {
      await api.deleteChangelog(item.id);
      toast.success('Changelog excluído.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setForm({ ...form, features: [...form.features, newFeature.trim()] });
    setNewFeature('');
  };

  const removeFeature = (index: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Changelog / Novidades</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gerencie a tela "O que há de novo" do app</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={16} /> Nova versão
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : items.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhum changelog cadastrado</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map(item => (
              <div key={item.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start gap-3">
                  <Rocket size={18} className="text-primary-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-700">v{item.version}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {item.isActive ? 'Visível' : 'Oculto'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>
                    {item.features.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {item.features.map((f, i) => (
                          <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-primary-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{fmtDate(item.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleActive(item)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${item.isActive ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100'}`}>
                      <Power size={12} />
                    </button>
                    <button onClick={() => openEdit(item)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setConfirmDelete(item)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir changelog"
        message={`Tem certeza que deseja excluir a versão ${confirmDelete?.version}?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editing ? 'Editar changelog' : 'Novo changelog'}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Versão</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                    value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="1.2.0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Título</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Novidades da versão" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Descrição</label>
                <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" rows={3}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Funcionalidades</label>
                <div className="space-y-2">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">{f}</span>
                      <button onClick={() => removeFeature(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                      value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="Nova funcionalidade..."
                      onKeyDown={e => e.key === 'Enter' && addFeature()} />
                    <button onClick={addFeature} disabled={!newFeature.trim()}
                      className="text-sm px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
              <button onClick={save} disabled={!form.version || !form.title}
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
