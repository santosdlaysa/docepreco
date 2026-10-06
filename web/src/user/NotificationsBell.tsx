import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { getLang } from '../i18n';
import { Bell, X, Info, AlertTriangle, Gift, ArrowUpCircle, Store, ShoppingBag, ExternalLink } from 'lucide-react';
import { userApi, PlanTier } from './userApi';
import { engagementApi, Banner, getMissingStoreItems, localPref } from './engagementApi';
import { formatBRL } from './format';

const DISMISSED_KEY = 'docepreco_banner_dismissed';
const READ_KEY = 'docepreco_notif_read';
const MAX_ORDERS = 20;

const BANNER_META: Record<Banner['type'], { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30' },
  warning: { icon: AlertTriangle, cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
  promo: { icon: Gift, cls: 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' },
  update: { icon: ArrowUpCircle, cls: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
};

interface OnlineOrder { id: string; clientName: string; totalPrice: number; createdAt: string }

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const locale = getLang() === 'en' ? 'en-US' : 'pt-BR';
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return i18n.t('app:bell.todayAt', { time });
  return i18n.t('app:bell.dateAt', { date: d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }), time });
};

/**
 * Central de avisos (NotificationsScreen do app): banners do admin filtrados
 * por plano, loja com cadastro incompleto e novos pedidos da loja online.
 */
export function NotificationsBell({ tier, onNavigate }: { tier: PlanTier; onNavigate: (page: 'orders' | 'store') => void }) {
  const { t } = useTranslation('app');
  const [open, setOpen] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [missing, setMissing] = useState<{ key: string; label: string }[]>([]);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => localPref.get<string[]>(READ_KEY, []));
  const ref = useRef<HTMLDivElement>(null);
  const isMaster = tier === 'master';

  const load = useCallback(async () => {
    const dismissed = localPref.get<string[]>(DISMISSED_KEY, []);
    await Promise.all([
      engagementApi.getActiveBanners().then(active => {
        // Esquece dispensas de banners que já saíram do ar.
        localPref.set(DISMISSED_KEY, dismissed.filter(id => active.some(b => b.id === id)));
        setBanners(active.filter(b => {
          if (dismissed.includes(b.id)) return false;
          const tp = b.targetPlans;
          return !tp?.length || tp.includes('all') || tp.includes(tier);
        }));
      }).catch(() => {}),
      isMaster
        ? engagementApi.getStoreSettings().then(s => setMissing(getMissingStoreItems(s))).catch(() => setMissing([]))
        : Promise.resolve(setMissing([])),
      isMaster
        ? userApi.listOrders().then(all => setOrders(
            all
              .filter(o => (o as { source?: string }).source === 'online')
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, MAX_ORDERS)
          )).catch(() => setOrders([]))
        : Promise.resolve(setOrders([])),
    ]);
  }, [tier, isMaster]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (open) void load(); }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markRead = (ids: string[]) => {
    const next = Array.from(new Set([...readIds, ...ids]));
    setReadIds(next);
    localPref.set(READ_KEY, next.slice(-300));
  };

  const bannerId = (id: string) => `banner:${id}`;
  const orderId = (id: string) => `order:${id}`;
  const unread =
    banners.filter(b => !readIds.includes(bannerId(b.id))).length +
    orders.filter(o => !readIds.includes(orderId(o.id))).length +
    (missing.length > 0 ? 1 : 0);

  const dismiss = (id: string) => {
    localPref.set(DISMISSED_KEY, [...localPref.get<string[]>(DISMISSED_KEY, []), id]);
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const empty = banners.length === 0 && orders.length === 0 && missing.length === 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label={t('bell.title')}
        title={t('bell.title')}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{t('bell.title')}</p>
            {!empty && (
              <button
                onClick={() => markRead([...banners.map(b => bannerId(b.id)), ...orders.map(o => orderId(o.id))])}
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                {t('bell.markAllRead')}
              </button>
            )}
          </div>

          {empty && <p className="text-sm text-gray-400 text-center py-8">{t('bell.empty')}</p>}

          {missing.length > 0 && (
            <button
              onClick={() => { setOpen(false); onNavigate('store'); }}
              className="w-full text-left flex gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-red-50/60 dark:bg-red-900/10"
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-red-600 bg-red-100 dark:bg-red-900/30"><Store size={16} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t('bell.completeStore')}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{t('bell.missing', { items: missing.map(m => t(`bell.missingItem.${m.key}`, { defaultValue: m.label })).join(', ') })}</span>
              </span>
            </button>
          )}

          {banners.map(b => {
            const meta = BANNER_META[b.type] ?? BANNER_META.info;
            const Icon = meta.icon;
            const isRead = readIds.includes(bannerId(b.id));
            return (
              <div key={b.id} className={`flex gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 ${isRead ? '' : 'bg-primary-50/40 dark:bg-primary-900/10'}`}
                onMouseEnter={() => !isRead && markRead([bannerId(b.id)])}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}><Icon size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{b.message}</p>
                  {b.actionUrl && (
                    <a href={b.actionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-primary-600 hover:underline">
                      {t('bell.learnMore')} <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <button onClick={() => dismiss(b.id)} className="text-gray-300 hover:text-gray-500 shrink-0" aria-label={t('bell.dismiss')}><X size={14} /></button>
              </div>
            );
          })}

          {orders.map(o => {
            const isRead = readIds.includes(orderId(o.id));
            return (
              <button key={o.id}
                onClick={() => { markRead([orderId(o.id)]); setOpen(false); onNavigate('orders'); }}
                className={`w-full text-left flex gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 ${isRead ? '' : 'bg-primary-50/40 dark:bg-primary-900/10'}`}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-green-600 bg-green-50 dark:bg-green-900/30"><ShoppingBag size={16} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t('bell.newOrder', { total: formatBRL(o.totalPrice) })}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{o.clientName} · {fmtWhen(o.createdAt)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
