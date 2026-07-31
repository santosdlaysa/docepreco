import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, CookingPot, Loader2, PackageCheck, Users } from 'lucide-react';
import { ToastFn } from '../../components';
import { formatDate, todayISO } from '../format';
import { Order, userApi } from '../userApi';
import { Header, EmptyState, inputClass } from './IngredientsPage';

type ProductionStatus = 'pending' | 'in_progress' | 'done';

const STATUS: Record<ProductionStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em produção',
  done: 'Pronto',
};

/** Ordem de produção gerada automaticamente a partir das encomendas em aberto. */
export function ProductionPage({ toast }: { toast: ToastFn }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await userApi.listOrders());
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const productionOrders = useMemo(() => orders
    // Rascunhos são encomendas incompletas — não entram na fila de produção.
    .filter(order => !['draft', 'delivered', 'cancelled'].includes(order.status))
    .sort((a, b) => `${a.deliveryDate ?? ''}${a.deliveryTime ?? ''}`.localeCompare(`${b.deliveryDate ?? ''}${b.deliveryTime ?? ''}`)), [orders]);

  const byDate = useMemo(() => productionOrders.reduce<Record<string, Order[]>>((groups, order) => {
    (groups[order.deliveryDate ?? ''] ??= []).push(order);
    return groups;
  }, {}), [productionOrders]);

  const updateStatus = async (order: Order, status: ProductionStatus) => {
    setUpdating(order.id);
    try {
      await userApi.updateOrder(order.id, { status });
      setOrders(current => current.map(item => item.id === order.id ? { ...item, status } : item));
      toast.success(status === 'done' ? 'Produção marcada como pronta.' : 'Etapa de produção atualizada.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUpdating(null);
    }
  };

  const totalItems = productionOrders.reduce((total, order) => total + order.quantity, 0);
  const today = todayISO();

  return <div>
    <Header title="Ordem de produção" subtitle="Gerada automaticamente a partir das encomendas em aberto" />

    {loading ? <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary-500" /></div>
      : productionOrders.length === 0 ? <EmptyState icon={CookingPot} text="Nenhuma produção pendente. As novas encomendas aparecerão aqui automaticamente." />
      : <>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <Metric icon={PackageCheck} label="Itens a produzir" value={String(totalItems)} />
          <Metric icon={Users} label="Encomendas" value={String(productionOrders.length)} />
          <Metric icon={CalendarClock} label="Para hoje" value={String(byDate[today]?.length ?? 0)} />
        </div>
        <div className="space-y-5">
          {Object.entries(byDate).map(([date, dateOrders]) => {
            const recipes = dateOrders.reduce<Record<string, number>>((items, order) => {
              items[order.recipeName] = (items[order.recipeName] ?? 0) + order.quantity;
              return items;
            }, {});
            return <section key={date}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-gray-900 dark:text-white">{date === today ? 'Hoje' : formatDate(date)}</h2>
                <span className="text-xs text-gray-500">{dateOrders.length} encomenda{dateOrders.length === 1 ? '' : 's'}</span>
              </div>
              <div className="rounded-xl border border-primary-100 dark:border-primary-900/50 bg-primary-50/50 dark:bg-primary-900/10 p-3 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300 mb-1.5">Resumo para produzir</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-200">
                  {Object.entries(recipes).map(([recipe, quantity]) => <span key={recipe}><b>{quantity}×</b> {recipe}</span>)}
                </div>
              </div>
              <div className="space-y-2">
                {dateOrders.map(order => <article key={order.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{order.quantity}× {order.recipeName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{order.clientName}{order.deliveryTime ? ` · ${order.deliveryTime}` : ''}{order.notes ? ` · ${order.notes}` : ''}</p>
                  </div>
                  <select value={order.status} disabled={updating === order.id} onChange={event => updateStatus(order, event.target.value as ProductionStatus)} className={inputClass + ' !w-auto text-xs py-1.5'}>
                    {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </article>)}
              </div>
            </section>;
          })}
        </div>
      </>}
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof CookingPot; label: string; value: string }) {
  return <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
    <Icon size={17} className="text-primary-500 mb-1" />
    <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>;
}
