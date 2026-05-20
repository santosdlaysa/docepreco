import { useEffect, useState } from 'react';
import { api, RecipeCategory } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Pencil, Trash2, Plus, Power, GripVertical } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const EMOJI_SUGGESTIONS = [
  { emoji: '🎂', label: 'Bolos' },
  { emoji: '🧁', label: 'Cupcakes' },
  { emoji: '🍫', label: 'Chocolates' },
  { emoji: '🍪', label: 'Biscoitos' },
  { emoji: '🍰', label: 'Tortas' },
  { emoji: '🍩', label: 'Donuts' },
  { emoji: '🍮', label: 'Pudins' },
  { emoji: '🧇', label: 'Waffles' },
  { emoji: '🥐', label: 'Pães' },
  { emoji: '🍬', label: 'Doces' },
  { emoji: '🍭', label: 'Pirulitos' },
  { emoji: '🥧', label: 'Tortas doces' },
  { emoji: '🍦', label: 'Sorvetes' },
  { emoji: '☕', label: 'Bebidas' },
  { emoji: '🥤', label: 'Sucos' },
  { emoji: '🧃', label: 'Drinks' },
  { emoji: '🥖', label: 'Salgados' },
  { emoji: '🥟', label: 'Frituras' },
  { emoji: '🫔', label: 'Salgadinhos' },
  { emoji: '🥗', label: 'Saladas' },
  { emoji: '🍕', label: 'Pizzas' },
  { emoji: '🌮', label: 'Mexicano' },
  { emoji: '🍱', label: 'Marmitas' },
  { emoji: '🎃', label: 'Sazonal' },
  { emoji: '🎄', label: 'Natal' },
  { emoji: '🐣', label: 'Páscoa' },
  { emoji: '💝', label: 'Namorados' },
  { emoji: '🎉', label: 'Festas' },
  { emoji: '👶', label: 'Infantil' },
  { emoji: '💎', label: 'Premium' },
  { emoji: '⭐', label: 'Destaque' },
  { emoji: '🔥', label: 'Populares' },
];

const EMPTY = { name: '', icon: '', sortOrder: 0, isActive: true };

export function CategoriesPage({ toast }: Props) {
  const [items, setItems] = useState<RecipeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RecipeCategory | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<RecipeCategory | null>(null);

  const load = async () => {
    try {
      setItems(await api.listCategories());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, sortOrder: items.length }); setShowModal(true); };
  const openEdit = (item: RecipeCategory) => {
    setEditing(item);
    setForm({ name: item.name, icon: item.icon, sortOrder: item.sortOrder, isActive: item.isActive });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateCategory(editing.id, form);
        toast.success('Categoria atualizada!');
      } else {
        await api.createCategory(form);
        toast.success('Categoria criada!');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = async (item: RecipeCategory) => {
    try {
      await api.updateCategory(item.id, { isActive: !item.isActive });
      toast.success(item.isActive ? 'Categoria desativada.' : 'Categoria ativada!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (item: RecipeCategory) => {
    try {
      await api.deleteCategory(item.id);
      toast.success('Categoria excluída.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Categorias de Receitas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Categorias disponíveis para organizar receitas no app</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : sorted.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhuma categoria cadastrada</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sorted.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <GripVertical size={14} className="text-gray-300 shrink-0" />
                <span className="text-xl shrink-0 w-8 text-center">{item.icon || '📁'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-gray-400">Ordem: {item.sortOrder + 1}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  {item.isActive ? 'Ativo' : 'Inativo'}
                </span>
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
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir categoria"
        message={`Tem certeza que deseja excluir "${confirmDelete?.name}"?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editing ? 'Editar categoria' : 'Nova categoria'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome</label>
                <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Bolos" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Ícone</label>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                    {form.icon || '?'}
                  </div>
                  <input className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 text-center focus:border-primary-400 outline-none"
                    value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="🎂"
                    maxLength={4} />
                  <span className="text-xs text-gray-400">ou escolha abaixo</span>
                </div>
                <div className="grid grid-cols-8 gap-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {EMOJI_SUGGESTIONS.map(({ emoji, label }) => (
                    <button key={emoji} onClick={() => setForm({ ...form, icon: emoji, name: form.name || label })}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-110 ${form.icon === emoji ? 'bg-primary-100 ring-2 ring-primary-400 shadow-sm' : 'hover:bg-white dark:hover:bg-gray-600 hover:shadow-sm'}`}
                      title={label}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ordem</label>
                <input type="number" min="0" className="w-32 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                  value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
              <button onClick={save} disabled={!form.name}
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
