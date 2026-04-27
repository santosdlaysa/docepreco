import { useEffect, useState } from 'react';
import { api, Coupon } from '../lib/api';
import { TableSkeleton, ConfirmModal, ModalOverlay, ToastFn } from '../components';
import { Pencil, Trash2, Plus, Power, Ticket, Copy } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getStatus(c: Coupon): { label: string; color: string } {
  if (!c.isActive) return { label: 'Inativo', color: 'bg-gray-100 text-gray-500' };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return { label: 'Expirado', color: 'bg-orange-100 text-orange-600' };
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return { label: 'Esgotado', color: 'bg-red-100 text-red-600' };
  return { label: 'Ativo', color: 'bg-green-100 text-green-700' };
}

const EMPTY = {
  code: '',
  discountPercent: 10,
  maxUses: 0,
  expiresAt: null as string | null,
  isActive: true,
};

export function CouponsPage({ toast }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<Coupon | null>(null);

  const load = async () => {
    try {
      setCoupons(await api.listCoupons());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setShowModal(true); };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({ code: c.code, discountPercent: c.discountPercent, maxUses: c.maxUses, expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : null, isActive: c.isActive });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateCoupon(editing.id, form);
        toast.success('Cupom atualizado!');
      } else {
        await api.createCoupon(form);
        toast.success('Cupom criado!');
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await api.updateCoupon(c.id, { isActive: !c.isActive });
      toast.success(c.isActive ? 'Cupom desativado.' : 'Cupom ativado!');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (c: Coupon) => {
    try {
      await api.deleteCoupon(c.id);
      toast.success('Cupom excluído.');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cupons de Desconto</h2>
          <p className="text-sm text-gray-500 mt-0.5">Códigos promocionais para o plano Premium</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={16} /> Novo cupom
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        {loading ? (
          <TableSkeleton rows={4} cols={6} />
        ) : coupons.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhum cupom cadastrado</p>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                <th className="px-5 py-3">Código</th>
                <th className="px-3 py-3">Desconto</th>
                <th className="px-3 py-3">Uso</th>
                <th className="px-3 py-3">Expira em</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map(c => {
                const status = getStatus(c);
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Ticket size={14} className="text-primary-400" />
                        <code className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{c.code}</code>
                        <button onClick={() => copyCode(c.code)} className="text-gray-400 hover:text-gray-600">
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-green-600">{c.discountPercent}%</td>
                    <td className="px-3 py-3 text-gray-600">
                      {c.usedCount}{c.maxUses > 0 ? `/${c.maxUses}` : ' (ilimitado)'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{c.expiresAt ? fmtDate(c.expiresAt) : 'Sem validade'}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-3 py-3 text-right space-x-2">
                      <button onClick={() => toggleActive(c)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${c.isActive ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        <Power size={12} /> {c.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => openEdit(c)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => setConfirmDelete(c)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                        <Trash2 size={12} /> Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir cupom"
        message={`Tem certeza que deseja excluir o cupom "${confirmDelete?.code}"?`}
        confirmLabel="Excluir"
        confirmColor="red"
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Editar cupom' : 'Novo cupom'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none"
                  value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  placeholder="EX: PROMO20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
                  <input type="number" min="1" max="100" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de usos</label>
                  <input type="number" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={form.maxUses} onChange={e => setForm({ ...form, maxUses: parseInt(e.target.value) || 0 })} />
                  <p className="text-xs text-gray-500 mt-0.5">0 = ilimitado</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de expiração (opcional)</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                  value={form.expiresAt ?? ''} onChange={e => setForm({ ...form, expiresAt: e.target.value || null })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={save} disabled={!form.code || form.discountPercent <= 0}
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
