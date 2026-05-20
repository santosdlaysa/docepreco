import { useEffect, useState, useRef } from 'react';
import { api, RequestLog } from '../lib/api';
import { Skeleton } from '../components';
import { RefreshCw, Activity, AlertOctagon, Clock, BarChart3, Search, ChevronDown } from 'lucide-react';

const METHOD_COLOR: Record<string, string> = {
  GET:    'bg-blue-100 text-blue-700 border-blue-200',
  POST:   'bg-green-100 text-green-700 border-green-200',
  PUT:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  PATCH:  'bg-orange-100 text-orange-700 border-orange-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

function statusColor(code: number) {
  if (code < 300) return 'text-green-600';
  if (code < 400) return 'text-blue-600';
  if (code < 500) return 'text-yellow-600';
  return 'text-red-600';
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

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function RequestLogsSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-12 rounded" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RequestLogsPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const data = await api.getRequestLogs({
        limit: 200,
        method: methodFilter || undefined,
        search: search || undefined,
      });
      setLogs(data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [methodFilter]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 10000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, methodFilter, search]);

  const filtered = search
    ? logs.filter(l => l.path.toLowerCase().includes(search.toLowerCase()) || (l.bodyEmail && l.bodyEmail.toLowerCase().includes(search.toLowerCase())))
    : logs;

  const methodCounts = logs.reduce((acc, l) => {
    acc[l.method] = (acc[l.method] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const errorCount = logs.filter(l => l.statusCode >= 400).length;
  const avgDuration = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.durationMs, 0) / logs.length)
    : 0;

  if (loading) return <RequestLogsSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rotas acessadas</h2>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-0.5">
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <div
              onClick={() => setAutoRefresh(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${autoRefresh ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            Auto-refresh (10s)
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
        <div className="rounded-xl border px-4 py-3 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Activity size={14} className="text-gray-400" />
            Total
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{logs.length}</p>
          <p className="text-xs text-gray-400">últimas requisições</p>
        </div>
        <div className="rounded-xl border px-4 py-3 bg-red-50 dark:bg-red-900/20 border-red-200">
          <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
            <AlertOctagon size={14} />
            Erros (4xx/5xx)
          </p>
          <p className="text-2xl font-bold text-red-700 mt-1">{errorCount}</p>
          <p className="text-xs text-red-400">{logs.length ? Math.round(errorCount / logs.length * 100) : 0}% do total</p>
        </div>
        <div className="rounded-xl border px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <p className="text-xs font-medium text-blue-600 flex items-center gap-1.5">
            <Clock size={14} />
            Tempo médio
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{avgDuration}ms</p>
          <p className="text-xs text-blue-400">por requisição</p>
        </div>
        <div className="rounded-xl border px-4 py-3 bg-green-50 dark:bg-green-900/20 border-green-200">
          <p className="text-xs font-medium text-green-600 flex items-center gap-1.5">
            <BarChart3 size={14} />
            Métodos
          </p>
          <p className="text-sm font-bold text-green-700 mt-1">
            {Object.entries(methodCounts).map(([m, c]) => `${m}:${c}`).join(' · ') || '—'}
          </p>
          <p className="text-xs text-green-400">distribuição</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar por rota ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">Todos os métodos</option>
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">Feed de requisições</p>
          <span className="text-xs text-gray-400">{filtered.length} registros</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhuma requisição encontrada</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {filtered.map(log => {
              const isExpanded = expandedId === log.id;
              const hasError = log.statusCode >= 400;
              return (
                <div key={log.id}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className={`flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                  >
                    <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded border ${METHOD_COLOR[log.method] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                      {log.method}
                    </span>
                    <span className="flex-1 font-mono text-gray-700 dark:text-gray-200 truncate" title={log.path}>
                      {log.path}
                      {log.bodyEmail && <span className="ml-2 text-xs text-purple-600 font-sans font-medium">{log.bodyEmail}</span>}
                    </span>
                    <span className={`shrink-0 font-bold ${statusColor(log.statusCode)}`}>{log.statusCode}</span>
                    <span className="shrink-0 text-gray-400 text-xs w-14 text-right">{log.durationMs}ms</span>
                    <span className="shrink-0 text-gray-300 text-xs w-20 text-right hidden lg:block">{log.ip ?? '—'}</span>
                    <div className="shrink-0 text-right w-24">
                      <p className="text-xs text-gray-400" title={fmtTs(log.ts)}>{timeAgo(log.ts)}</p>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 text-sm space-y-1.5">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1.5 text-gray-600 dark:text-gray-300">
                        <div><span className="text-gray-400 text-xs">Rota:</span> <span className="font-mono">{log.path}</span></div>
                        <div><span className="text-gray-400 text-xs">Status:</span> <span className={`font-bold ${statusColor(log.statusCode)}`}>{log.statusCode}</span></div>
                        <div><span className="text-gray-400 text-xs">Duração:</span> {log.durationMs}ms</div>
                        <div><span className="text-gray-400 text-xs">IP:</span> {log.ip ?? '—'}</div>
                        {log.bodyEmail && <div><span className="text-gray-400 text-xs">Email:</span> <span className="text-purple-600 font-medium">{log.bodyEmail}</span></div>}
                        <div className="col-span-2 lg:col-span-4"><span className="text-gray-400 text-xs">Data:</span> {fmtTs(log.ts)}</div>
                      </div>
                      {hasError && (
                        <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-medium text-red-600 mb-0.5">Erro:</p>
                          <p className="text-red-700 font-mono text-xs">{log.errorMessage || 'Sem descrição disponível'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
