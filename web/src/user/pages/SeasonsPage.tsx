import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, CalendarRange } from 'lucide-react';
import { userApi, Season } from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { formatDate, todayISO } from '../format';
import { Header, EmptyState, FormField, FormActions, inputClass, iconBtn, iconBtnDanger } from './IngredientsPage';
import { parseLocaleNumber } from '../number';
import { useTranslation } from 'react-i18next';

export function SeasonsPage({ toast }: { toast: ToastFn }) {
  const { t } = useTranslation('ops');
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
      toast.success(t('sea.deleted'));
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <Header
        title={t('sea.title')}
        subtitle={t('sea.subtitle')}
        onAdd={() => setCreating(true)}
        addLabel={t('sea.new')}
      />

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={4} cols={3} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarRange} text={t('sea.empty')} />
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
              <button onClick={() => setEditing(s)} className={iconBtn} title={t('sea.edit')}>
                <Pencil size={16} />
              </button>
              <button onClick={() => setConfirmId(s.id)} className={iconBtnDanger} title={t('sea.delete')}>
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
        title={t('sea.delete')}
        message={t('sales.confirmMsg')}
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
  const { t } = useTranslation('ops');
  const [name, setName] = useState(initial?.name ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? todayISO());
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? todayISO());
  const [multiplier, setMultiplier] = useState(String(initial?.multiplier ?? '1.2'));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(t('sea.errName'));
    setSaving(true);
    const data = {
      name: name.trim(),
      startDate,
      endDate,
      multiplier: parseLocaleNumber(multiplier) || 1,
    };
    try {
      if (initial) {
        await userApi.updateSeason(initial.id, data);
        toast.success(t('sea.updated'));
      } else {
        await userApi.createSeason(data);
        toast.success(t('sea.created'));
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
          {initial ? t('sea.edit') : t('sea.new')}
        </h3>

        <FormField label={t('sea.name')}>
          <input value={name} onChange={e => setName(e.target.value)} className={inputClass} autoFocus />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('sea.start')}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label={t('sea.end')}>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <FormField label={t('sea.multiplier')}>
          <input
            type="text"
            inputMode="decimal"
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
