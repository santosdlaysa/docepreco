import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, CalendarRange } from 'lucide-react';
import { userApi, Season } from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatDate, todayISO } from '../format';
import { Header, EmptyState, FormField, FormActions, inputClass, iconBtn, iconBtnDanger } from './IngredientsPage';

export function SeasonsPage({ toast }: { toast: ToastFn }) {
  const [items, setItems] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Season | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await userApi.listSeasons());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await userApi.deleteSeason(confirmId);
      toast.success('Temporada excluída.');
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <Header
        title="Temporadas"
        subtitle="Ajuste preços em datas especiais (ex.: Páscoa, Natal)"
        onAdd={() => setCreating(true)}
        addLabel="Nova temporada"
      />

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={4} cols={3} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarRange} text="Nenhuma temporada cadastrada." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {items.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(s.startDate)} – {formatDate(s.endDate)} · ×{s.multiplier}
                </p>
              </div>
              <button onClick={() => setEditing(s)} className={iconBtn}>
                <Pencil size={16} />
              </button>
              <button onClick={() => setConfirmId(s.id)} className={iconBtnDanger}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <SeasonForm
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
          toast={toast}
        />
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Excluir temporada"
        message="Tem certeza?"
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function SeasonForm({
  initial,
  onClose,
  onSaved,
  toast,
}: {
  initial: Season | null;
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? todayISO());
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? todayISO());
  const [multiplier, setMultiplier] = useState(String(initial?.multiplier ?? '1.2'));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe o nome.');
    setSaving(true);
    const data = {
      name: name.trim(),
      startDate,
      endDate,
      multiplier: Number(multiplier) || 1,
    };
    try {
      if (initial) {
        await userApi.updateSeason(initial.id, data);
        toast.success('Temporada atualizada.');
      } else {
        await userApi.createSeason(data);
        toast.success('Temporada criada.');
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
          {initial ? 'Editar temporada' : 'Nova temporada'}
        </h3>

        <FormField label="Nome">
          <input value={name} onChange={e => setName(e.target.value)} className={inputClass} autoFocus />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Início">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Fim">
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Multiplicador de preço (ex.: 1.2 = +20%)">
          <input
            type="number"
            step="any"
            value={multiplier}
            onChange={e => setMultiplier(e.target.value)}
            className={inputClass}
          />
        </FormField>

        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}
