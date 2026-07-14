import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, PackageOpen, Power, ShoppingBag, Store } from 'lucide-react';
import { ToastFn, TableSkeleton } from '../../components';
import { formatBRL } from '../format';
import { MyStore, userApi } from '../userApi';
import { EmptyState, Header } from './IngredientsPage';

function StatusPill({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ${
        on
          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-green-500' : 'bg-gray-400'}`} />
      {on ? onText : offText}
    </span>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  saving,
  onChange,
}: {
  icon: typeof Power;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  saving?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-primary-600 dark:text-primary-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
          checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
        {saving && (
          <Loader2 size={12} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-spin-slow" />
        )}
      </button>
    </div>
  );
}

export function StorePage({ toast }: { toast: ToastFn }) {
  const [store, setStore] = useState<MyStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<'active' | 'acceptingOrders' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStore(await userApi.getMyStore());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (field: 'active' | 'acceptingOrders', value: boolean) => {
    if (!store) return;
    setSavingField(field);
    const previous = store;
    const next = { ...store, [field]: value };
    setStore(next);
    try {
      const updated = await userApi.updateMyStore({ [field]: value });
      setStore(updated);
      toast.success(
        field === 'active'
          ? value ? 'Loja publicada.' : 'Loja removida da vitrine pública.'
          : value ? 'Loja aberta para pedidos.' : 'Loja fechada para pedidos.'
      );
    } catch (e) {
      setStore(previous);
      toast.error((e as Error).message);
    } finally {
      setSavingField(null);
    }
  };

  const acceptingOrders = store?.acceptingOrders ?? store?.active ?? false;
  const publicUrl = store ? `/loja/${store.slug}` : '';

  return (
    <div>
      <Header title="Loja online" subtitle="Controle a publicação e o recebimento de pedidos" />

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TableSkeleton rows={5} cols={3} />
        </div>
      ) : !store ? (
        <EmptyState icon={Store} text="Loja online não configurada para esta conta." />
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{store.storeName}</p>
                {store.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{store.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <StatusPill on={store.active} onText="Publicada" offText="Não publicada" />
                  <StatusPill on={acceptingOrders} onText="Aberta para pedidos" offText="Fechada para pedidos" />
                </div>
              </div>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <ExternalLink size={15} />
                Ver loja
              </a>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <ToggleRow
              icon={Store}
              title="Loja publicada"
              description="Quando desligada, a loja sai da vitrine pública e o link pode ficar indisponível para clientes."
              checked={store.active}
              saving={savingField === 'active'}
              onChange={value => updateStatus('active', value)}
            />
            <ToggleRow
              icon={Power}
              title="Recebendo pedidos"
              description="Quando desligada, a loja continua visível, mostra “Loja fechada” e bloqueia novos pedidos."
              checked={acceptingOrders}
              disabled={!store.active}
              saving={savingField === 'acceptingOrders'}
              onChange={value => updateStatus('acceptingOrders', value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-400">Produtos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{store.products.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-400">Atendimento</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                {[store.acceptsDelivery && 'Entrega', store.acceptsPickup && 'Retirada'].filter(Boolean).join(' e ') || '-'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-400">Pedido mínimo</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                {store.minOrderValue != null ? formatBRL(store.minOrderValue) : '-'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <ShoppingBag size={16} className="text-primary-500" />
              <p className="font-semibold text-gray-900 dark:text-white">Itens da loja</p>
            </div>
            {store.products.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center">
                <PackageOpen size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto no cardápio.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {store.products.map(product => (
                  <div key={product.id} className="px-4 py-3 flex items-center gap-3">
                    {product.photoUrl && (
                      <img src={product.photoUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-gray-400 truncate">{product.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatBRL(product.publicPrice)}</p>
                      <p className={`text-[11px] font-medium ${product.available ? 'text-green-600' : 'text-gray-400'}`}>
                        {product.available ? 'Disponível' : 'Indisponível'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
