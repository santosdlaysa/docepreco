import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Search, Trash2, UserX } from 'lucide-react';
import { api, DeletedUser, InactiveUser } from '../lib/api';
import { ModalOverlay, ToastFn } from '../components';

interface Props { toast: ToastFn }
type Tab = 'inactive' | 'deleted';

const PAGE_SIZE = 20;

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('pt-BR') : 'Nunca acessou';
}

function hasActiveSubscription(user: InactiveUser): boolean {
  return user.isPremium && (!user.premiumUntil || new Date(user.premiumUntil).getTime() > Date.now());
}

export function UserLifecyclePage({ toast }: Props) {
  const [tab, setTab] = useState<Tab>('inactive');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [target, setTarget] = useState<InactiveUser | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const request = tab === 'inactive'
      ? api.listInactiveUsers({ page, limit: PAGE_SIZE, search })
      : api.listDeletedUsers({ page, limit: PAGE_SIZE });
    request.then(result => {
      if (!active) return;
      if (tab === 'inactive') setInactiveUsers(result.users as InactiveUser[]);
      else setDeletedUsers(result.users as DeletedUser[]);
      setTotal(result.total);
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : 'Erro ao carregar usuários');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, page, search, refresh]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setPage(1);
    setTotal(0);
    setError(null);
  };

  const deleteUser = async () => {
    if (!target || confirmation.trim() !== target.email || deleting) return;
    setDeleting(true);
    try {
      await api.deleteInactiveUser(target.id);
      toast.success('Conta e dados associados excluídos.');
      setTarget(null);
      setConfirmation('');
      setPage(1);
      setTab('deleted');
      setRefresh(value => value + 1);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir conta');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center"><UserX size={20} className="text-red-600 dark:text-red-400" /></div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Usuários inativos e excluídos</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Revise contas sem atividade há mais de 30 dias e acompanhe as exclusões.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button type="button" onClick={() => switchTab('inactive')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${tab === 'inactive' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}>Inativos há mais de 30 dias</button>
        <button type="button" onClick={() => switchTab('deleted')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${tab === 'deleted' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}>Excluídos</button>
      </div>

      {tab === 'inactive' ? (
        <form onSubmit={e => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="flex gap-2">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Buscar por nome, e-mail ou ID" aria-label="Buscar usuários inativos" className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300" />
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"><Search size={15} /> Buscar</button>
        </form>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Este histórico guarda o nome, o ID e a data da exclusão. O nome pode estar indisponível em registros anteriores a esta atualização.</p>
      )}

      {error && <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs uppercase text-gray-500 dark:text-gray-400">
            {tab === 'inactive' ? <tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Último acesso</th><th className="px-4 py-3">Dados</th><th className="px-4 py-3">Plano</th><th className="px-4 py-3 text-right">Ação</th></tr>
              : <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">ID do usuário</th><th className="px-4 py-3">Excluído em</th></tr>}
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? <tr><td colSpan={tab === 'inactive' ? 5 : 3} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>
              : tab === 'inactive' ? inactiveUsers.map(user => (
                <tr key={user.id} className="text-gray-700 dark:text-gray-200">
                  <td className="px-4 py-3"><p className="font-semibold">{user.companyName}</p><p className="text-xs text-gray-500">{user.email}</p><p className="text-[11px] font-mono text-gray-400">{user.id}</p></td>
                  <td className="px-4 py-3 whitespace-nowrap"><p>{formatDate(user.lastSeenAt)}</p><p className="text-xs text-gray-500">Cadastro: {formatDate(user.createdAt)}</p></td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{user.recipeCount} receitas · {user.ingredientCount} ingredientes · {user.saleCount} vendas</td>
                  <td className="px-4 py-3">{user.planTier === 'free' ? 'Gratuito' : user.planTier === 'master' ? 'Master' : 'Premium'}{hasActiveSubscription(user) && <p className="text-xs text-amber-600">Assinatura ativa</p>}</td>
                  <td className="px-4 py-3 text-right"><button type="button" disabled={hasActiveSubscription(user)} onClick={() => { setTarget(user); setConfirmation(''); }} title={hasActiveSubscription(user) ? 'Assinatura ativa: exclusão bloqueada' : 'Excluir conta e dados'} className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={13} /> Excluir</button></td>
                </tr>
              )) : deletedUsers.map(user => (
                <tr key={user.userId} className="text-gray-700 dark:text-gray-200"><td className="px-4 py-3 font-semibold">{user.companyName || 'Nome indisponível'}</td><td className="px-4 py-3 font-mono text-xs">{user.userId}</td><td className="px-4 py-3">{formatDate(user.deletedAt)}</td></tr>
              ))}
            {!loading && !error && (tab === 'inactive' ? inactiveUsers.length === 0 : deletedUsers.length === 0) && <tr><td colSpan={tab === 'inactive' ? 5 : 3} className="px-4 py-8 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{total} usuário(s)</span>
        <div className="flex items-center gap-3">
          <button type="button" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)} aria-label="Página anterior" className="disabled:opacity-40"><ChevronLeft size={18} /></button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(value => value + 1)} aria-label="Próxima página" className="disabled:opacity-40"><ChevronRight size={18} /></button>
        </div>
      </div>

      {target && <ModalOverlay onClose={() => { if (!deleting) setTarget(null); }}>
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400"><AlertTriangle size={22} /><h3 className="text-lg font-bold">Excluir conta permanentemente</h3></div>
          <p className="text-sm text-gray-600 dark:text-gray-300">A conta de <strong>{target.companyName}</strong> e os dados associados serão removidos permanentemente. O histórico guardará o nome, o ID e a data da exclusão.</p>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Digite o e-mail <strong>{target.email}</strong> para confirmar
            <input value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-300" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={deleting} onClick={() => setTarget(null)} className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-200">Cancelar</button>
            <button type="button" disabled={deleting || confirmation.trim() !== target.email} onClick={deleteUser} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40">{deleting ? 'Excluindo...' : 'Excluir definitivamente'}</button>
          </div>
        </div>
      </ModalOverlay>}
    </div>
  );
}
