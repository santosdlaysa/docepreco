import { useEffect, useState } from 'react';
import { api, FeaturedRecipe } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Pencil, Trash2, Plus, Power, ChefHat, GripVertical } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

const EMPTY = {
  name: '',
  description: '',
  imageUrl: null as string | null,
  category: '',
  isActive: true,
  sortOrder: 0,
};

export function FeaturedRecipesPage({ toast }: Props) {
  const [items, setItems] = useState<FeaturedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FeaturedRecipe | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<FeaturedRecipe | null>(null);

  const load = async () => {
    try {
      setItems(await api.listFeaturedRecipes());
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

  const openEdit = (item: FeaturedRecipe) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description, imageUrl: item.imageUrl, category: item.category, isActive: item.isActive, sortOrder: item.sortOrder });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateFeaturedRecipe(editing.id, form);
        toast.success('Receita atualizada!');
      } else {
        await api.createFeaturedRecipe(form);
        toast.success('Receita criada!');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = async (item: FeaturedRecipe) => {
    try {
      await api.updateFeaturedRecipe(item.id, { isActive: !item.isActive });
      toast.success(item.isActive ? 'Receita desativada.' : 'Receita ativada!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (item: FeaturedRecipe) => {
    try {
      await api.deleteFeaturedRecipe(item.id);
      toast.success('Receita excluída.');
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
          <h2 className="text-xl font-bold text-gray-900">Receitas Destaque</h2>
          <p className="text-sm text-gray-500 mt-0.5">Receitas modelo sugeridas no app para novos usuários</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={16} /> Nova receita
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : sorted.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhuma receita destaque cadastrada</p>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                <th className="px-5 py-3">Ordem</th>
                <th className="px-3 py-3">Nome</th>
                <th className="px-3 py-3">Categoria</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-400">
                    <div className="flex items-center gap-1">
                      <GripVertical size={14} />
                      {item.sortOrder + 1}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <ChefHat size={14} className="text-primary-400" />
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {item.category ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-600">{item.category}</span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right space-x-2">
                    <button onClick={() => toggleActive(item)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${item.isActive ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      <Power size={12} /> {item.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => openEdit(item)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => setConfirmDelete(item)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                      <Trash2 size={12} /> Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir receita"
        message={`Tem certeza que deseja excluir "${confirmDelete?.name}"?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Editar receita destaque' : 'Nova receita destaque'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Bolo de Chocolate" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none" rows={3}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Bolos" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                  <input type="number" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL da imagem (opcional)</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                  value={form.imageUrl ?? ''} onChange={e => setForm({ ...form, imageUrl: e.target.value || null })} placeholder="https://..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={save} disabled={!form.name || !form.description}
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
