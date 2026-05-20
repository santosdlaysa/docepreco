import { useEffect, useState } from 'react';
import { api, FaqItem } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Pencil, Trash2, Plus, Power, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const EMPTY = {
  question: '',
  answer: '',
  category: '',
  sortOrder: 0,
  isActive: true,
};

export function FaqPage({ toast }: Props) {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<FaqItem | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      setItems(await api.listFaq());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, sortOrder: items.length });
    setShowModal(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditing(item);
    setForm({ question: item.question, answer: item.answer, category: item.category, sortOrder: item.sortOrder, isActive: item.isActive });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateFaq(editing.id, form);
        toast.success('FAQ atualizado!');
      } else {
        await api.createFaq(form);
        toast.success('FAQ criado!');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = async (item: FaqItem) => {
    try {
      await api.updateFaq(item.id, { isActive: !item.isActive });
      toast.success(item.isActive ? 'FAQ desativado.' : 'FAQ ativado!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (item: FaqItem) => {
    try {
      await api.deleteFaq(item.id);
      toast.success('FAQ excluído.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">FAQ / Central de Ajuda</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Perguntas frequentes exibidas no app</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={16} /> Nova pergunta
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={3} />
        ) : sorted.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhuma FAQ cadastrada</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sorted.map(item => (
              <div key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-3 px-5 py-3 cursor-pointer" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                  {expanded === item.id ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.question}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.category && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600">{item.category}</span>}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {item.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleActive(item)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${item.isActive ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100'}`}>
                      <Power size={12} /> {item.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => openEdit(item)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setConfirmDelete(item)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {expanded === item.id && (
                  <div className="px-5 pb-4 pl-12">
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 rounded-lg p-3">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir FAQ"
        message={`Tem certeza que deseja excluir "${confirmDelete?.question}"?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editing ? 'Editar FAQ' : 'Nova FAQ'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Pergunta</label>
                <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Resposta</label>
                <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" rows={4}
                  value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Categoria</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    list="faq-categories" placeholder="Ex: Geral" />
                  <datalist id="faq-categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ordem</label>
                  <input type="number" min="0" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
              <button onClick={save} disabled={!form.question || !form.answer}
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
