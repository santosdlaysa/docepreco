import { useEffect, useState, useCallback } from 'react';
import { Trash2, Receipt } from 'lucide-react';
import { userApi, Expense, CreateExpenseDTO, ExpenseCostType, EXPENSE_CATEGORIES } from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatBRL, formatDate, todayISO } from '../format';
import { Header, EmptyState, FormField, FormActions, inputClass, iconBtnDanger } from './IngredientsPage';
import { parseLocaleNumber } from '../number';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map(c => [c.key, c.label])
);

/** Últimos 6 meses no formato { key: 'YYYY-MM', label: 'jul' } + opção "Tudo" (''). */
function recentMonths(): { key: string; label: string }[] {
  const now = new Date();
  const out: { key: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    out.push({ key, label });
  }
  return out;
}

export function ExpensesPage({ toast }: { toast: ToastFn }) {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [month, setMonth] = useState<string>(''); // '' = tudo

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await userApi.listExpenses(month || undefined));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast, month]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await userApi.deleteExpense(confirmId);
      toast.success('Despesa excluída.');
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const total = items.reduce((a, e) => a + e.amount, 0);
  const fixed = items.filter(e => e.costType === 'fixed').reduce((a, e) => a + e.amount, 0);
  const variable = items.filter(e => e.costType === 'variable').reduce((a, e) => a + e.amount, 0);

  const months = recentMonths();

  return (
    <div>
      <Header
        title="Despesas"
        subtitle={`${items.length} lançamento${items.length !== 1 ? 's' : ''} · ${formatBRL(total)}`}
        onAdd={() => setCreating(true)}
        addLabel="Nova despesa"
      />

      {/* Filtro por mês */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        <MonthChip label="Tudo" active={month === ''} onClick={() => setMonth('')} />
        {months.map(m => (
          <MonthChip key={m.key} label={m.label} active={month === m.key} onClick={() => setMonth(m.key)} />
        ))}
      </div>

      {/* Resumo Total / Fixo / Variável */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <SummaryCard label="Total" value={formatBRL(total)} highlight />
          <SummaryCard label="Fixo" value={formatBRL(fixed)} dotClass="bg-purple-500" />
          <SummaryCard label="Variável" value={formatBRL(variable)} dotClass="bg-amber-500" />
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={6} cols={3} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Receipt} text="Nenhuma despesa lançada neste período." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {items.map(e => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${e.costType === 'fixed' ? 'bg-purple-500' : 'bg-amber-500'}`} />
              <button onClick={() => setEditing(e)} className="flex-1 min-w-0 text-left">
                <p className="font-medium text-gray-900 dark:text-white truncate">{e.description}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {CATEGORY_LABEL[e.category] || e.category} · {formatDate(e.expenseDate)}
                  {e.isRecurring ? ` · Recorrente${e.recurrenceDay ? ` (dia ${e.recurrenceDay})` : ''}` : ''}
                </p>
              </button>
              <span className="font-semibold text-red-600 dark:text-red-400 shrink-0">− {formatBRL(e.amount)}</span>
              <button onClick={() => setConfirmId(e.id)} className={iconBtnDanger}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ExpenseForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
          toast={toast}
        />
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Excluir despesa"
        message="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function MonthChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
        active
          ? 'bg-primary-500 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

function SummaryCard({ label, value, highlight, dotClass }: { label: string; value: string; highlight?: boolean; dotClass?: string }) {
  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-100 dark:border-primary-900/40' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {dotClass && <span className={`w-2 h-2 rounded-full ${dotClass}`} />}
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className={`text-base font-bold tracking-tight ${highlight ? 'text-primary-600 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

function ExpenseForm({
  initial,
  onClose,
  onSaved,
  toast,
}: {
  initial: Expense | null;
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const editingId = initial?.id ?? null;
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(initial ? Number(initial.amount).toFixed(2) : '');
  const [expenseDate, setExpenseDate] = useState(initial?.expenseDate?.slice(0, 10) ?? todayISO());
  const [costType, setCostType] = useState<ExpenseCostType>(initial?.costType ?? 'variable');
  const [category, setCategory] = useState(initial?.category ?? 'outros');
  const [isRecurring, setIsRecurring] = useState(initial?.isRecurring ?? false);
  const [recurrenceDay, setRecurrenceDay] = useState(String(initial?.recurrenceDay ?? ''));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return toast.error('Informe a descrição.');
    const amountN = parseLocaleNumber(amount);
    if (amountN <= 0) return toast.error('Informe um valor válido.');
    if (!expenseDate) return toast.error('Informe a data.');

    setSaving(true);
    const data: CreateExpenseDTO = {
      description: description.trim(),
      amount: amountN,
      category,
      costType,
      isRecurring,
      recurrenceDay: isRecurring && recurrenceDay ? Number(recurrenceDay) : null,
      expenseDate,
      notes: notes.trim() || null,
    };
    try {
      if (editingId) {
        await userApi.updateExpense(editingId, data);
        toast.success('Despesa atualizada.');
      } else {
        await userApi.createExpense(data);
        toast.success('Despesa lançada.');
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
          {editingId ? 'Editar despesa' : 'Nova despesa'}
        </h3>

        <FormField label="Descrição">
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ex.: Conta de luz"
            className={inputClass}
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Valor (R$)">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0,00"
              className={inputClass}
            />
          </FormField>
          <FormField label="Data">
            <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        {/* Tipo de custo */}
        <FormField label="Tipo de custo">
          <div className="flex gap-2">
            {([['fixed', 'Fixo'], ['variable', 'Variável']] as [ExpenseCostType, string][]).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setCostType(val)}
                className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${
                  costType === val
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </FormField>

        {/* Categoria */}
        <FormField label="Categoria">
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`h-9 px-3.5 rounded-lg text-sm font-semibold transition-colors ${
                  category === c.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </FormField>

        {/* Recorrência */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">Despesa recorrente (mensal)</span>
          </label>
          {isRecurring && (
            <input
              type="text"
              inputMode="numeric"
              value={recurrenceDay}
              onChange={e => setRecurrenceDay(e.target.value)}
              placeholder="dia"
              className={`${inputClass} w-20`}
            />
          )}
        </div>

        <FormField label="Observações (opcional)">
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
        </FormField>

        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}
