import { useEffect, useState } from 'react';
import { api, FeaturedRecipe, FeaturedRecipeIngredient } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Pencil, Trash2, Plus, Power, ChefHat, X } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

function fmtPrice(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const EMPTY_INGREDIENT: FeaturedRecipeIngredient = { name: '', quantityUsed: 0, unit: 'g', purchaseQuantity: 1000, purchasePrice: 0 };

const EMPTY = {
  name: '',
  yield: 1,
  profitMargin: 70,
  isActive: true,
  sortOrder: 0,
  ingredients: [] as FeaturedRecipeIngredient[],
};

export function FeaturedRecipesPage({ toast }: Props) {
  const [items, setItems] = useState<FeaturedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FeaturedRecipe | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<FeaturedRecipe | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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
    setForm({ ...EMPTY, sortOrder: items.length, ingredients: [] });
    setShowModal(true);
  };

  const openEdit = (item: FeaturedRecipe) => {
    setEditing(item);
    setForm({
      name: item.name,
      yield: item.yield,
      profitMargin: item.profitMargin,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      ingredients: [...item.ingredients],
    });
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

  const addIngredient = () => {
    setForm({ ...form, ingredients: [...form.ingredients, { ...EMPTY_INGREDIENT }] });
  };

  const updateIngredient = (index: number, field: keyof FeaturedRecipeIngredient, value: string | number) => {
    const updated = [...form.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, ingredients: updated });
  };

  const removeIngredient = (index: number) => {
    setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== index) });
  };

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Receitas Sugeridas (Premium)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Receitas prontas que usuários premium podem usar como base no app</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={16} /> Nova receita
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : sorted.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhuma receita sugerida cadastrada</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sorted.map(item => (
              <div key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-3 px-5 py-3 cursor-pointer" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                  <ChefHat size={16} className="text-primary-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.ingredients.length} ingredientes · {item.yield} un · {item.profitMargin}% margem
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {item.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
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
                {expanded === item.id && item.ingredients.length > 0 && (
                  <div className="px-5 pb-3 pl-12 overflow-x-auto">
                    <table className="w-full text-xs min-w-[320px]">
                      <thead>
                        <tr className="text-gray-400 text-left">
                          <th className="pb-1">Ingrediente</th>
                          <th className="pb-1">Qtd usada</th>
                          <th className="pb-1">Embalagem</th>
                          <th className="pb-1">Preço compra</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600 dark:text-gray-300">
                        {item.ingredients.map((ing, i) => (
                          <tr key={i}>
                            <td className="py-0.5 font-medium text-gray-700 dark:text-gray-200">{ing.name}</td>
                            <td>{ing.quantityUsed} {ing.unit}</td>
                            <td>{ing.purchaseQuantity} {ing.unit}</td>
                            <td>{fmtPrice(ing.purchasePrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editing ? 'Editar receita sugerida' : 'Nova receita sugerida'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome da receita</label>
                <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Brigadeiro Gourmet" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Rendimento (un)</label>
                  <input type="number" min="1" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.yield} onChange={e => setForm({ ...form, yield: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Margem de lucro (%)</label>
                  <input type="number" min="0" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.profitMargin} onChange={e => setForm({ ...form, profitMargin: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ordem</label>
                  <input type="number" min="0" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              {/* Ingredientes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Ingredientes</label>
                  <button onClick={addIngredient} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 transition-colors">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
                {form.ingredients.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">Nenhum ingrediente adicionado</p>
                ) : (
                  <div className="space-y-2">
                    {form.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <input className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none col-span-2 sm:col-span-1"
                            placeholder="Nome" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} />
                          <input type="number" step="0.1" min="0" className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                            placeholder="Qtd usada" value={ing.quantityUsed || ''} onChange={e => updateIngredient(i, 'quantityUsed', parseFloat(e.target.value) || 0)} />
                          <select className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                            value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}>
                            <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">L</option><option value="unit">un</option>
                          </select>
                          <input type="number" step="0.1" min="0" className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                            placeholder="Qtd embalagem" value={ing.purchaseQuantity || ''} onChange={e => updateIngredient(i, 'purchaseQuantity', parseFloat(e.target.value) || 0)} />
                          <input type="number" step="0.01" min="0" className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                            placeholder="Preço R$" value={ing.purchasePrice || ''} onChange={e => updateIngredient(i, 'purchasePrice', parseFloat(e.target.value) || 0)} />
                        </div>
                        <button onClick={() => removeIngredient(i)} className="text-gray-400 hover:text-red-500 transition-colors mt-1">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
              <button onClick={save} disabled={!form.name || form.ingredients.length === 0}
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
