import { useEffect, useState } from 'react';
import { api, GlobalIngredient } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Pencil, Trash2, Plus, Package } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

function fmtPrice(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtUnitPrice(v: number) {
  const numericValue = Number.isFinite(v) ? v : 0;
  const fractionDigits = numericValue > 0 && numericValue < 0.01 ? 4 : 2;

  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

const EMPTY = {
  name: '',
  price: 0,
  unit: 'g',
  packageAmount: 1000,
  category: '',
};

export function GlobalIngredientsPage({ toast }: Props) {
  const [items, setItems] = useState<GlobalIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GlobalIngredient | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<GlobalIngredient | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setItems(await api.listGlobalIngredients());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowModal(true);
  };

  const openEdit = (item: GlobalIngredient) => {
    setEditing(item);
    setForm({ name: item.name, price: item.price, unit: item.unit, packageAmount: item.packageAmount, category: item.category });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateGlobalIngredient(editing.id, form);
        toast.success('Ingrediente atualizado!');
      } else {
        await api.createGlobalIngredient(form);
        toast.success('Ingrediente criado!');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (item: GlobalIngredient) => {
    try {
      await api.deleteGlobalIngredient(item.id);
      toast.success('Ingrediente excluído.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ingredientes Globais</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Preços de referência sugeridos aos usuários do app</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={16} /> Novo ingrediente
        </button>
      </div>

      <input
        className="w-full max-w-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
        placeholder="Buscar por nome ou categoria..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhum ingrediente cadastrado</p>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400 text-xs uppercase">
                <th className="px-5 py-3">Nome</th>
                <th className="px-3 py-3">Categoria</th>
                <th className="px-3 py-3">Preço</th>
                <th className="px-3 py-3">Embalagem</th>
                <th className="px-3 py-3">Preço/un</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Package size={14} className="text-gray-400" />
                    {item.name}
                  </td>
                  <td className="px-3 py-3">
                    {item.category ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{item.category}</span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{fmtPrice(item.price)}</td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{item.packageAmount} {item.unit}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200 font-medium">
                    {fmtUnitPrice(item.price / (item.packageAmount || 1))}/{item.unit}
                  </td>
                  <td className="px-3 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(item)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => setConfirmDelete(item)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors">
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
        title="Excluir ingrediente"
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
              {editing ? 'Editar ingrediente' : 'Novo ingrediente'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome</label>
                <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Preço (R$)</label>
                  <input type="number" step="0.01" min="0" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Categoria</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    list="ingredient-categories" placeholder="Ex: Laticínios" />
                  <datalist id="ingredient-categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Qtd embalagem</label>
                  <input type="number" min="1" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.packageAmount} onChange={e => setForm({ ...form, packageAmount: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Unidade</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:border-primary-400 outline-none"
                    value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="un">un</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
              <button onClick={save} disabled={!form.name || form.price <= 0}
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
