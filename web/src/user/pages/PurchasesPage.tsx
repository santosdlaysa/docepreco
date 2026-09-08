import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Trash2, X } from 'lucide-react';
import {
  CreatePurchaseInvoiceDTO, Ingredient, PurchaseInvoice, PurchasePaymentStatus, Unit, userApi,
} from '../userApi';
import { ToastFn, TableSkeleton } from '../../components';
import { formatBRL, formatDate, todayISO } from '../format';
import { parseLocaleNumber } from '../number';
import { EmptyState, FormField, Header, inputClass } from './IngredientsPage';

const UNITS: { value: Unit; label: string }[] = [
  { value: 'g', label: 'g' }, { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' }, { value: 'l', label: 'l' }, { value: 'unit', label: 'un' },
];
type DraftItem = { ingredientId: string; quantity: string; unit: Unit; total: string; updateIngredientPrice: boolean };
const blankItem = (ingredient?: Ingredient): DraftItem => ({
  ingredientId: ingredient?.id ?? '', quantity: '', unit: ingredient?.unit ?? 'g', total: '', updateIngredientPrice: true,
});

function monthOptions() {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') });
  }
  return out;
}

export function PurchasesPage({ toast }: { toast: ToastFn }) {
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [purchaseData, ingredientData] = await Promise.all([
        userApi.listPurchases(month || undefined), userApi.listIngredients(),
      ]);
      setPurchases(purchaseData); setIngredients(ingredientData);
    } catch (error) { toast.error((error as Error).message); }
    finally { setLoading(false); }
  }, [month, toast]);
  useEffect(() => { load(); }, [load]);

  const total = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  return <div>
    <Header title="Compras" subtitle={`${purchases.length} nota${purchases.length === 1 ? '' : 's'} · ${formatBRL(total)}`} onAdd={() => setCreating(true)} addLabel="Nova compra" />
    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3 mb-4">As compras atualizam estoque e preços, mas não são duplicadas nas despesas operacionais.</p>
    <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
      {[{ key: '', label: 'Tudo' }, ...monthOptions()].map(option => <button key={option.key || 'all'} onClick={() => setMonth(option.key)}
        className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${month === option.key ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{option.label}</button>)}
    </div>
    {loading ? <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"><TableSkeleton rows={5} cols={3} /></div>
      : purchases.length === 0 ? <EmptyState icon={FileText} text="Nenhuma nota de compra lançada neste período." />
      : <div className="space-y-2">{purchases.map(purchase => <details key={purchase.id} className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
          <summary className="list-none cursor-pointer flex items-center gap-3">
            <FileText size={18} className="text-primary-500 shrink-0" />
            <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 dark:text-white truncate">{purchase.supplier}</p><p className="text-xs text-gray-500">{formatDate(purchase.purchaseDate)}{purchase.documentNumber ? ` · NF ${purchase.documentNumber}` : ''} · {purchase.items.length} item(ns)</p></div>
            <span className={`text-xs px-2 py-1 rounded-full ${purchase.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{purchase.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}</span>
            <span className="font-bold text-gray-900 dark:text-white">{formatBRL(purchase.total)}</span>
          </summary>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1">{purchase.items.map(item => <div key={item.id} className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">{item.description} · {item.quantity} {item.unit === 'unit' ? 'un' : item.unit}</span><span className="font-medium dark:text-white">{formatBRL(item.total)}</span></div>)}</div>
        </details>)}</div>}
    {creating && <PurchaseForm ingredients={ingredients} toast={toast} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
  </div>;
}

function PurchaseForm({ ingredients, toast, onClose, onSaved }: { ingredients: Ingredient[]; toast: ToastFn; onClose: () => void; onSaved: () => void }) {
  const [supplier, setSupplier] = useState(''); const [documentNumber, setDocumentNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayISO()); const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus>('paid'); const [discount, setDiscount] = useState('');
  const [freight, setFreight] = useState(''); const [notes, setNotes] = useState(''); const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([blankItem(ingredients[0])]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + parseLocaleNumber(item.total), 0), [items]);
  const finalTotal = Math.max(0, subtotal - parseLocaleNumber(discount) + parseLocaleNumber(freight));
  const patchItem = (index: number, patch: Partial<DraftItem>) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supplier.trim()) return toast.error('Informe o fornecedor.');
    if (!items.length || items.some(item => !item.ingredientId || parseLocaleNumber(item.quantity) <= 0 || parseLocaleNumber(item.total) <= 0)) return toast.error('Preencha todos os itens da compra.');
    const payload: CreatePurchaseInvoiceDTO = { supplier: supplier.trim(), documentNumber: documentNumber.trim() || null, purchaseDate, paymentMethod, paymentStatus,
      discount: parseLocaleNumber(discount), freight: parseLocaleNumber(freight), notes: notes.trim() || null,
      items: items.map(item => ({ ingredientId: item.ingredientId, quantity: parseLocaleNumber(item.quantity), unit: item.unit, total: parseLocaleNumber(item.total), updateIngredientPrice: item.updateIngredientPrice })),
    };
    setSaving(true); try { await userApi.createPurchase(payload); toast.success('Compra registrada e estoque atualizado.'); onSaved(); }
    catch (error) { toast.error((error as Error).message); } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-50 bg-black/45 flex items-start justify-center overflow-y-auto p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <form onSubmit={submit} className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4 my-auto">
      <div className="flex items-center justify-between"><div><h3 className="font-bold text-lg dark:text-white">Nova nota de compra</h3><p className="text-xs text-gray-500">Os itens darão entrada no estoque automaticamente.</p></div><button type="button" onClick={onClose}><X size={20} /></button></div>
      <div className="grid md:grid-cols-3 gap-3"><FormField label="Fornecedor"><input autoFocus value={supplier} onChange={e => setSupplier(e.target.value)} className={inputClass} /></FormField><FormField label="Número da nota"><input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} className={inputClass} /></FormField><FormField label="Data"><input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className={inputClass} /></FormField></div>
      <div className="grid md:grid-cols-2 gap-3"><FormField label="Pagamento"><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputClass}><option value="pix">Pix</option><option value="cash">Dinheiro</option><option value="credit">Cartão de crédito</option><option value="debit">Cartão de débito</option><option value="bank_transfer">Transferência</option><option value="other">Outro</option></select></FormField><FormField label="Situação"><select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as PurchasePaymentStatus)} className={inputClass}><option value="paid">Pago</option><option value="pending">Pendente</option></select></FormField></div>
      <div><div className="flex justify-between items-center mb-2"><p className="text-sm font-semibold dark:text-white">Itens</p><button type="button" onClick={() => setItems(current => [...current, blankItem(ingredients[0])])} className="text-sm font-semibold text-primary-600 flex items-center gap-1"><Plus size={15} /> Adicionar item</button></div>
        <div className="space-y-3">{items.map((item, index) => <div key={index} className="grid grid-cols-12 gap-2 items-end bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
          <div className="col-span-12 md:col-span-5"><FormField label="Ingrediente"><select value={item.ingredientId} onChange={e => { const ingredient = ingredients.find(i => i.id === e.target.value); patchItem(index, { ingredientId: e.target.value, unit: ingredient?.unit ?? item.unit }); }} className={inputClass}><option value="">Selecione</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></FormField></div>
          <div className="col-span-5 md:col-span-2"><FormField label="Quantidade"><input inputMode="decimal" value={item.quantity} onChange={e => patchItem(index, { quantity: e.target.value })} className={inputClass} /></FormField></div>
          <div className="col-span-3 md:col-span-2"><FormField label="Unidade"><select value={item.unit} onChange={e => patchItem(index, { unit: e.target.value as Unit })} className={inputClass}>{UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></FormField></div>
          <div className="col-span-4 md:col-span-2"><FormField label="Valor total"><input inputMode="decimal" value={item.total} onChange={e => patchItem(index, { total: e.target.value })} className={inputClass} /></FormField></div>
          <button type="button" disabled={items.length === 1} onClick={() => setItems(current => current.filter((_, i) => i !== index))} className="col-span-1 h-10 text-red-500 disabled:opacity-30 flex items-center justify-center"><Trash2 size={17} /></button>
          <label className="col-span-12 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"><input type="checkbox" checked={item.updateIngredientPrice} onChange={e => patchItem(index, { updateIngredientPrice: e.target.checked })} /> Atualizar o preço usado na precificação</label>
        </div>)}</div>
      </div>
      <div className="grid md:grid-cols-3 gap-3"><FormField label="Desconto"><input inputMode="decimal" value={discount} onChange={e => setDiscount(e.target.value)} className={inputClass} /></FormField><FormField label="Frete"><input inputMode="decimal" value={freight} onChange={e => setFreight(e.target.value)} className={inputClass} /></FormField><div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-3"><p className="text-xs text-gray-500">Total da compra</p><p className="text-xl font-bold text-primary-700 dark:text-primary-300">{formatBRL(finalTotal)}</p></div></div>
      <FormField label="Observações"><textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} min-h-20`} /></FormField>
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-white">Cancelar</button><button disabled={saving || ingredients.length === 0} className="px-4 py-2 rounded-lg bg-primary-500 text-white font-semibold disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar compra'}</button></div>
    </form>
  </div>;
}
