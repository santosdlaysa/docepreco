import { useEffect, useState, useCallback } from 'react';
import { Trash2, Pencil, Users, Search, Gift, MessageCircle } from 'lucide-react';
import { userApi, Client, CreateClientDTO } from '../userApi';
import { ToastFn, ConfirmModal, ModalOverlay, TableSkeleton } from '../../components';
import { Header, EmptyState, FormField, FormActions, inputClass, iconBtn, iconBtnDanger } from './IngredientsPage';
import { maskPhone, isValidPhone } from '../phone';

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const AVATAR_GRADIENTS = [
  'from-pink-400 to-rose-500',
  'from-purple-400 to-indigo-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
];

/** Aniversário ("MM-DD") nos próximos 7 dias? */
function isBirthdaySoon(birthday: string | null): boolean {
  if (!birthday || !/^\d{2}-\d{2}$/.test(birthday)) return false;
  const now = new Date();
  const [mm, dd] = birthday.split('-').map(Number);
  const year = now.getFullYear();
  let next = new Date(year, mm - 1, dd);
  if (next.getTime() < new Date(year, now.getMonth(), now.getDate()).getTime()) {
    next = new Date(year + 1, mm - 1, dd);
  }
  const diffDays = Math.floor((next.getTime() - new Date(year, now.getMonth(), now.getDate()).getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 7;
}

function birthdayLabel(birthday: string | null): string | null {
  if (!birthday || !/^\d{2}-\d{2}$/.test(birthday)) return null;
  const [mm, dd] = birthday.split('-');
  return `${dd}/${mm}`;
}

export function ClientsPage({ toast }: { toast: ToastFn }) {
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await userApi.listClients());
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
      await userApi.deleteClient(confirmId);
      toast.success('Cliente excluído.');
      setConfirmId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const filtered = search.trim()
    ? items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div>
      <Header
        title="Clientes"
        subtitle={`${items.length} cadastrado${items.length !== 1 ? 's' : ''}`}
        onAdd={() => setCreating(true)}
        addLabel="Novo cliente"
      />

      {!loading && items.length > 0 && (
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className={inputClass + ' pl-9'}
          />
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={6} cols={2} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} text="Nenhum cliente cadastrado ainda. Adicione o primeiro." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} text="Nenhum cliente encontrado para essa busca." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.map((c, idx) => {
            const soon = isBirthdaySoon(c.birthday);
            const bday = birthdayLabel(c.birthday);
            const initial = c.name.trim().charAt(0).toUpperCase() || '?';
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]} flex items-center justify-center text-white font-bold shrink-0`}>
                  {soon ? <Gift size={18} /> : initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                    {c.name}
                    {soon && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                        Aniversário 🎂
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {c.phone || 'Sem telefone'}
                    {bday ? ` · 🎂 ${bday}` : ''}
                  </p>
                </div>
                {c.phone && (
                  <a
                    href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Abrir no WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </a>
                )}
                <button onClick={() => setEditing(c)} className={iconBtn}>
                  <Pencil size={16} />
                </button>
                <button onClick={() => setConfirmId(c.id)} className={iconBtnDanger}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <ClientForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
          toast={toast}
        />
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Excluir cliente"
        message="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function ClientForm({
  initial,
  onClose,
  onSaved,
  toast,
}: {
  initial: Client | null;
  onClose: () => void;
  onSaved: () => void;
  toast: ToastFn;
}) {
  const editingId = initial?.id ?? null;
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(maskPhone(initial?.phone ?? ''));
  const [email, setEmail] = useState(initial?.email ?? '');
  const [bDay, setBDay] = useState(initial?.birthday ? initial.birthday.split('-')[1] : '');
  const [bMonth, setBMonth] = useState(initial?.birthday ? initial.birthday.split('-')[0] : '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe o nome.');
    if (phone.trim() && !isValidPhone(phone)) return toast.error('Telefone incompleto. Use DDD + número.');

    let birthday: string | null = null;
    if (bDay && bMonth) {
      const d = Number(bDay), m = Number(bMonth);
      if (d < 1 || d > 31) return toast.error('Dia de aniversário inválido.');
      if (m < 1 || m > 12) return toast.error('Mês de aniversário inválido.');
      birthday = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    setSaving(true);
    const data: CreateClientDTO = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      birthday,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (editingId) {
        await userApi.updateClient(editingId, data);
        toast.success('Cliente atualizado.');
      } else {
        await userApi.createClient(data);
        toast.success('Cliente cadastrado.');
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
          {editingId ? 'Editar cliente' : 'Novo cliente'}
        </h3>

        <FormField label="Nome">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Dona Ana" className={inputClass} autoFocus />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Telefone / WhatsApp">
            <input value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputClass} />
          </FormField>
          <FormField label="E-mail (opcional)">
            <input value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Aniversário (opcional)">
          <div className="flex gap-3">
            <input
              type="text"
              inputMode="numeric"
              value={bDay}
              onChange={e => setBDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="Dia"
              className={`${inputClass} w-24`}
            />
            <select value={bMonth} onChange={e => setBMonth(e.target.value)} className={inputClass}>
              <option value="">Mês</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={m}>
                  {new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        </FormField>

        <FormField label="Endereço (opcional)">
          <input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} />
        </FormField>

        <FormField label="Observações (opcional)">
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
        </FormField>

        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalOverlay>
  );
}
