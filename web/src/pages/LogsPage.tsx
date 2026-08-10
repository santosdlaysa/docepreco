import { useEffect, useState, useRef } from 'react';
import { api, LogEntry } from '../lib/api';
import { Skeleton } from '../components';
import { UserPlus, DollarSign, Star, Lock, RefreshCw, MessagesSquare, QrCode } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TYPE_CONFIG: Record<LogEntry['type'], { icon: LucideIcon; label: string; color: string; iconColor: string }> = {
  new_user:    { icon: UserPlus,   label: 'Novo usuário',       color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-blue-700', iconColor: 'text-blue-600' },
  sale:        { icon: DollarSign, label: 'Venda registrada',   color: 'bg-green-50 dark:bg-green-900/20 border-green-200 text-green-700', iconColor: 'text-green-600' },
  premium_on:  { icon: Star,       label: 'Premium ativado',    color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 text-yellow-700', iconColor: 'text-yellow-500' },
  premium_off: { icon: Lock,       label: 'Premium removido',   color: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400', iconColor: 'text-gray-400' },
  suggestion:  { icon: MessagesSquare, label: 'Nova sugestão', color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-700', iconColor: 'text-indigo-600' },
  pix_request: { icon: QrCode, label: 'Solicitação PIX', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 text-purple-700', iconColor: 'text-purple-600' },
};

function fmtTs(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function LogsSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const data = await api.getLogs(100);
      setLogs(data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 15000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  const counts = logs.reduce((acc, l) => {
    acc[l.type] = (acc[l.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <LogsSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Logs do sistema</h2>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-0.5">
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <div
              onClick={() => setAutoRefresh(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${autoRefresh ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            Auto-refresh (15s)
          </label>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-primary-400 text-gray-600 dark:text-gray-300 hover:text-primary-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(TYPE_CONFIG) as LogEntry['type'][]).map(type => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          return (
            <div key={type} className={`rounded-xl border px-4 py-3 ${cfg.color}`}>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <Icon size={14} className={cfg.iconColor} />
                {cfg.label}
              </p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{counts[type] ?? 0}</p>
              <p className="text-xs opacity-60">nos últimos 100 eventos</p>
            </div>
          );
        })}
      </div>

      {/* Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">Feed de eventos</p>
          <span className="text-xs text-gray-400">{logs.length} eventos</span>
        </div>

        {logs.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhum evento encontrado</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {logs.map((log, i) => {
              const cfg = TYPE_CONFIG[log.type];
              const Icon = cfg.icon;
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${cfg.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{log.label ?? '—'}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{log.detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400" title={fmtTs(log.ts)}>{timeAgo(log.ts)}</p>
                    <p className="text-xs text-gray-300 mt-0.5">{fmtTs(log.ts)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
