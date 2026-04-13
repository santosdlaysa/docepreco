import { useEffect, useState, useRef } from 'react';
import { api, RequestLog } from '../lib/api';

const METHOD_COLOR: Record<string, string> = {
  GET:    'bg-blue-100 text-blue-700',
  POST:   'bg-green-100 text-green-700',
  PUT:    'bg-yellow-100 text-yellow-700',
  PATCH:  'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
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

export function RequestLogsPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
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
    ? logs.filter(l => l.path.toLowerCase().includes(search.toLowerCase()))
    : logs;

  const methodCounts = logs.reduce((acc, l) => {
    acc[l.method] = (acc[l.method] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const errorCount = logs.filter(l => l.statusCode >= 400).length;
  const avgDuration = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.durationMs, 0) / logs.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rotas acessadas</h2>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-0.5">
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <div
              onClick={() => setAutoRefresh(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${autoRefresh ? 'bg-primary-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            Auto-refresh (10s)
          </label>
          <button
            onClick={load}
            className="text-sm bg-white border border-gray-300 hover:border-primary-400 text-gray-600 hover:text-primary-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            ↻ Atualizar
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border px-4 py-3 bg-gray-50 border-gray-200">
          <p className="text-xs font-medium text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{logs.length}</p>
          <p className="text-xs text-gray-400">últimas requisições</p>
        </div>
        <div className="rounded-xl border px-4 py-3 bg-red-50 border-red-200">
          <p className="text-xs font-medium text-red-600">Erros (4xx/5xx)</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{errorCount}</p>
          <p className="text-xs text-red-400">{logs.length ? Math.round(errorCount / logs.length * 100) : 0}% do total</p>
        </div>
        <div className="rounded-xl border px-4 py-3 bg-blue-50 border-blue-200">
          <p className="text-xs font-medium text-blue-600">Tempo médio</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{avgDuration}ms</p>
          <p className="text-xs text-blue-400">por requisição</p>
        </div>
        <div className="rounded-xl border px-4 py-3 bg-green-50 border-green-200">
          <p className="text-xs font-medium text-green-600">Métodos</p>
          <p className="text-sm font-bold text-green-700 mt-1">
            {Object.entries(methodCounts).map(([m, c]) => `${m}:${c}`).join(' · ') || '—'}
          </p>
          <p className="text-xs text-green-400">distribuição</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Filtrar por rota..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">Todos os métodos</option>
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="font-semibold text-gray-900 text-sm">Feed de requisições</p>
          <span className="text-xs text-gray-400">{filtered.length} registros</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Nenhuma requisição encontrada</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {filtered.map(log => (
              <div key={log.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors text-sm">
                <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${METHOD_COLOR[log.method] ?? 'bg-gray-100 text-gray-600'}`}>
                  {log.method}
                </span>
                <span className="flex-1 font-mono text-gray-700 truncate" title={log.path}>{log.path}</span>
                <span className={`shrink-0 font-bold ${statusColor(log.statusCode)}`}>{log.statusCode}</span>
                <span className="shrink-0 text-gray-400 text-xs w-14 text-right">{log.durationMs}ms</span>
                <span className="shrink-0 text-gray-300 text-xs w-20 text-right hidden lg:block">{log.ip ?? '—'}</span>
                <div className="shrink-0 text-right w-24">
                  <p className="text-xs text-gray-400" title={fmtTs(log.ts)}>{timeAgo(log.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
