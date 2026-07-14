import { useEffect, useState, useCallback } from 'react';
import { api, AdminStore } from '../lib/api';
import { TableSkeleton, ToastFn } from '../components';
import { Search, ChevronLeft, ChevronRight, RefreshCw, ExternalLink, MessageCircle, Store, Truck, ShoppingBag, Crown } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Ativa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      Inativa
    </span>
  );
}

function PlanBadge({ planTier, isPremium }: { planTier: AdminStore['planTier']; isPremium: boolean }) {
  if (!isPremium || planTier === 'free') return <span className="text-xs text-gray-400">Gratuito</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
      <Crown size={12} />
      {planTier === 'master' ? 'Master' : 'Premium'}
    </span>
  );
}

type ActiveFilter = 'active' | 'inactive' | 'all';

export function StoresPage({ toast }: Props) {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<ActiveFilter>('active');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listStores({
        search: debouncedSearch || undefined,
        page,
        active: filter === 'all' ? null : filter === 'active',
      });
      setStores(data.stores);
      setTotal(data.total);
      setActiveCount(data.activeCount);
      setInactiveCount(data.inactiveCount);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar lojas');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, filter, toast]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const FILTERS: { id: ActiveFilter; label: string; count: number | null }[] = [
    { id: 'active', label: 'Ativas', count: activeCount },
    { id: 'inactive', label: 'Inativas', count: inactiveCount },
    { id: 'all', label: 'Todas', count: activeCount + inactiveCount },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Lojas online</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{total} {total === 1 ? 'loja' : 'lojas'}</span>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Busca + filtro de status */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por loja, slug, cidade, confeitaria ou email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1); }}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
              {f.count != null && (
                <span className={`ml-1.5 text-xs ${filter === f.id ? 'text-primary-100' : 'text-gray-400'}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Loja</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Dono</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Telefone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Plano</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Cidade</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Entrega</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Produtos</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Criada em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && (
                <tr>
                  <td colSpan={10}>
                    <TableSkeleton rows={8} cols={7} />
                  </td>
                </tr>
              )}
              {!loading && stores.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400">Nenhuma loja encontrada</td>
                </tr>
              )}
              {!loading && stores.map((s, i) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {s.logoUrl ? (
                        <img src={s.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <Store size={14} className="text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{s.storeName}</p>
                        <p className="text-xs text-gray-400 truncate">/{s.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={s.active} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900 dark:text-white font-medium truncate max-w-44" title={s.companyName}>{s.companyName}</p>
                    <p className="text-xs text-gray-400 truncate max-w-44" title={s.email}>{s.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {s.phone ? (
                      <a
                        href={`https://wa.me/${s.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 flex items-center gap-1 whitespace-nowrap"
                      >
                        <MessageCircle size={14} />
                        {formatPhone(s.phone)}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge planTier={s.planTier} isPremium={s.isPremium} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.city || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {s.acceptsDelivery && (
                        <span title="Aceita entrega" className="text-blue-500"><Truck size={15} /></span>
                      )}
                      {s.acceptsPickup && (
                        <span title="Aceita retirada" className="text-amber-500"><ShoppingBag size={15} /></span>
                      )}
                      {!s.acceptsDelivery && !s.acceptsPickup && <span className="text-gray-300">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-200">{s.productCount}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`/loja/${s.slug}?preview=1&userId=${s.userId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir visualização da loja"
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-medium whitespace-nowrap"
                    >
                      <ExternalLink size={13} />
                      Ver loja
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Próxima
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
