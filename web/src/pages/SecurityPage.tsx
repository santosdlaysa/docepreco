import { Fragment, useEffect, useState, useRef } from 'react';
import { api, SecurityOverview, RequestLog, IpGeo } from '../lib/api';
import { Skeleton } from '../components';
import {
  RefreshCw, ShieldCheck, ShieldAlert, Ban, KeyRound, Globe,
  ScanSearch, Fingerprint, AlertOctagon, ChevronDown,
} from 'lucide-react';

function statusColor(code: number) {
  if (code < 300) return 'text-green-600';
  if (code < 400) return 'text-blue-600';
  if (code < 500) return 'text-yellow-600';
  return 'text-red-600';
}

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700', POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700', PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

/** Bandeira emoji a partir do código de país ISO-2 (ex.: 'BR' → 🇧🇷). */
function flagEmoji(cc: string | null | undefined): string {
  if (!cc || cc.length !== 2) return '🌐';
  const base = 0x1f1e6;
  const up = cc.toUpperCase();
  return String.fromCodePoint(base + up.charCodeAt(0) - 65, base + up.charCodeAt(1) - 65);
}

/** Origem geográfica do IP: bandeira + cidade/estado + provedor. */
function GeoBadge({ geo }: { geo: IpGeo | null }) {
  if (!geo) return <span className="text-gray-400 text-xs">—</span>;
  if (geo.org === 'Rede privada' && !geo.country) {
    return <span className="text-gray-500 dark:text-gray-400 text-xs">🏠 Rede privada</span>;
  }
  const place = [geo.city, geo.region].filter(Boolean).join('/') || geo.country || 'Desconhecida';
  const prov = geo.isp || geo.org;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs max-w-[240px]"
      title={[geo.country, prov].filter(Boolean).join(' · ')}
    >
      <span className="text-sm leading-none shrink-0">{flagEmoji(geo.countryCode)}</span>
      <span className="text-gray-700 dark:text-gray-200 shrink-0">{place}</span>
      {prov && <span className="text-gray-400 truncate">· {prov}</span>}
    </span>
  );
}

/** Lista de requisições reais de um IP, exibida ao expandir a linha. */
function IpRequestList({ logs, loading }: { logs: RequestLog[] | undefined; loading: boolean }) {
  if (loading) {
    return <div className="px-5 py-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>;
  }
  if (!logs || logs.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-6">Nenhuma requisição com erro registrada para este IP na janela.</p>;
  }
  return (
    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
      {logs.map(l => (
        <div key={l.id} className="px-5 py-2 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded ${METHOD_COLOR[l.method] ?? 'bg-gray-100 text-gray-600'}`}>{l.method}</span>
            <span className="font-mono text-gray-700 dark:text-gray-200 truncate flex-1 min-w-0" title={l.path}>{l.path}</span>
            <span className={`shrink-0 font-bold ${statusColor(l.statusCode)}`}>{l.statusCode}</span>
            <span className="shrink-0 text-gray-400 text-xs" title={fmtTs(l.ts)}>{timeAgo(l.ts)}</span>
          </div>
          {(l.errorMessage || l.bodyEmail) && (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs pl-1">
              {l.bodyEmail && <span className="text-purple-600">e-mail: {l.bodyEmail}</span>}
              {l.errorMessage && <span className="text-red-600 font-mono">{l.errorMessage}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const WINDOWS: { label: string; hours: number }[] = [
  { label: '1h', hours: 1 },
  { label: '24h', hours: 24 },
  { label: '7 dias', hours: 168 },
];

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
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

function StatCard({ icon: Icon, label, value, tone }: {
  icon: typeof ShieldCheck; label: string; value: number | string;
  tone: 'gray' | 'red' | 'orange' | 'yellow' | 'blue';
}) {
  const tones: Record<string, string> = {
    gray:   'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300',
    red:    'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-600',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 text-orange-600',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 text-yellow-600',
    blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-blue-600',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-medium flex items-center gap-1.5">
        <Icon size={14} />
        {label}
      </p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function SectionCard({ icon: Icon, title, count, empty, children }: {
  icon: typeof ShieldCheck; title: string; count: number; empty: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <p className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
          <Icon size={16} className="text-gray-400" />
          {title}
        </p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${count > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">{empty}</p>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  );
}

function SecuritySkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-5 w-full" />)}
        </div>
      ))}
    </div>
  );
}

const th = 'text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-5 py-2';
const td = 'px-5 py-2.5 text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap';

export function SecurityPage() {
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expandedIp, setExpandedIp] = useState<string | null>(null);
  const [ipLogs, setIpLogs] = useState<Record<string, RequestLog[]>>({});
  const [ipLoading, setIpLoading] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const d = await api.getSecurityOverview(hours);
      setData(d);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleIp = async (ip: string) => {
    if (expandedIp === ip) { setExpandedIp(null); return; }
    setExpandedIp(ip);
    if (!ipLogs[ip]) {
      setIpLoading(ip);
      try {
        const logs = await api.getRequestLogs({ ip, onlyErrors: true, limit: 100 });
        setIpLogs(prev => ({ ...prev, [ip]: logs }));
      } catch (e) {
        console.error(e);
      } finally {
        setIpLoading(null);
      }
    }
  };

  useEffect(() => { setLoading(true); setExpandedIp(null); setIpLogs({}); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hours]);

  useEffect(() => {
    if (autoRefresh) intervalRef.current = setInterval(load, 30000);
    else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [autoRefresh, hours]);

  if (loading || !data) return <SecuritySkeleton />;

  const t = data.totals;
  const threatCount = data.suspiciousIps.length + data.failedLogins.length + data.adminProbes.length;
  const allClear = threatCount === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {allClear
              ? <ShieldCheck size={22} className="text-green-500" />
              : <ShieldAlert size={22} className="text-red-500" />}
            Segurança
          </h2>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-0.5">
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            {WINDOWS.map(w => (
              <button
                key={w.hours}
                onClick={() => setHours(w.hours)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  hours === w.hours
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <div
              onClick={() => setAutoRefresh(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${autoRefresh ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            Auto (30s)
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

      {/* Banner de status */}
      <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
        allClear
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 text-green-700 dark:text-green-300'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-700 dark:text-red-300'
      }`}>
        {allClear ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        <p className="text-sm font-medium">
          {allClear
            ? `Nenhum padrão suspeito na janela analisada.`
            : `${threatCount} ${threatCount === 1 ? 'padrão suspeito detectado' : 'padrões suspeitos detectados'}.`}
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Globe} label="Requisições" value={t.total} tone="gray" />
        <StatCard icon={AlertOctagon} label="Erros 4xx" value={t.err4xx} tone="orange" />
        <StatCard icon={Ban} label="Não autorizado" value={t.unauthorized} tone="red" />
        <StatCard icon={ShieldAlert} label="Rate limit (429)" value={t.rateLimited} tone="yellow" />
        <StatCard icon={Fingerprint} label="IPs distintos" value={t.distinctIps} tone="blue" />
      </div>

      {/* IPs suspeitos */}
      <SectionCard icon={ShieldAlert} title="IPs com mais erros" count={data.suspiciousIps.length}
        empty="Nenhum IP acumulando erros.">
        <table className="w-full min-w-[720px]">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className={`${th} w-6`}></th>
              <th className={th}>IP</th>
              <th className={th}>Origem</th>
              <th className={th}>Total erros</th>
              <th className={th}>401/403</th>
              <th className={th}>429</th>
              <th className={th}>404</th>
              <th className={th}>Último</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {data.suspiciousIps.map(r => {
              const open = expandedIp === r.ip;
              return (
                <Fragment key={r.ip}>
                  <tr onClick={() => toggleIp(r.ip)}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${open ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}>
                    <td className={`${td} pr-0`}>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
                    </td>
                    <td className={`${td} font-mono`}>{r.ip}</td>
                    <td className={td}><GeoBadge geo={r.geo} /></td>
                    <td className={`${td} font-bold`}>{r.total}</td>
                    <td className={td}>{r.unauthorized > 0 ? <span className="text-red-600 font-semibold">{r.unauthorized}</span> : '—'}</td>
                    <td className={td}>{r.rateLimited > 0 ? <span className="text-yellow-600 font-semibold">{r.rateLimited}</span> : '—'}</td>
                    <td className={td}>{r.notFound || '—'}</td>
                    <td className={`${td} text-gray-400 text-xs`} title={fmtTs(r.lastSeen)}>{timeAgo(r.lastSeen)}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={8} className="bg-gray-50/60 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700 p-0">
                        <IpRequestList logs={ipLogs[r.ip]} loading={ipLoading === r.ip} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </SectionCard>

      {/* Falhas de login */}
      <SectionCard icon={KeyRound} title="Falhas de login por e-mail" count={data.failedLogins.length}
        empty="Nenhuma sequência de login falho.">
        <table className="w-full min-w-[520px]">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className={th}>E-mail tentado</th>
              <th className={th}>Tentativas</th>
              <th className={th}>IPs distintos</th>
              <th className={th}>Última</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {data.failedLogins.map(r => (
              <tr key={r.email} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className={`${td} font-medium text-purple-600`}>{r.email}</td>
                <td className={`${td} font-bold ${r.attempts >= 10 ? 'text-red-600' : ''}`}>{r.attempts}</td>
                <td className={td}>{r.ips}</td>
                <td className={`${td} text-gray-400 text-xs`} title={fmtTs(r.lastAttempt)}>{timeAgo(r.lastAttempt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Tentativas em rotas admin */}
      <SectionCard icon={Ban} title="Tentativas em rotas admin (bloqueadas)" count={data.adminProbes.length}
        empty="Nenhuma tentativa não autorizada no painel.">
        <table className="w-full min-w-[560px]">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className={`${th} w-6`}></th>
              <th className={th}>IP</th>
              <th className={th}>Origem</th>
              <th className={th}>Tentativas</th>
              <th className={th}>Último</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {data.adminProbes.map(r => {
              const open = expandedIp === r.ip;
              return (
                <Fragment key={r.ip}>
                  <tr onClick={() => toggleIp(r.ip)}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${open ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}>
                    <td className={`${td} pr-0`}>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
                    </td>
                    <td className={`${td} font-mono`}>{r.ip}</td>
                    <td className={td}><GeoBadge geo={r.geo} /></td>
                    <td className={`${td} font-bold text-red-600`}>{r.attempts}</td>
                    <td className={`${td} text-gray-400 text-xs`} title={fmtTs(r.lastSeen)}>{timeAgo(r.lastSeen)}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={5} className="bg-gray-50/60 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700 p-0">
                        <IpRequestList logs={ipLogs[r.ip]} loading={ipLoading === r.ip} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </SectionCard>

      {/* Rotas 404 (scan) */}
      <SectionCard icon={ScanSearch} title="Rotas inexistentes mais acessadas (possível scan)" count={data.notFoundPaths.length}
        empty="Nenhuma varredura de rotas 404 relevante.">
        <table className="w-full min-w-[520px]">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className={th}>Rota</th>
              <th className={th}>Acessos</th>
              <th className={th}>IPs distintos</th>
              <th className={th}>Último</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {data.notFoundPaths.map(r => (
              <tr key={r.path} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className={`${td} font-mono max-w-xs truncate`} title={r.path}>{r.path}</td>
                <td className={`${td} font-bold`}>{r.hits}</td>
                <td className={td}>{r.ips}</td>
                <td className={`${td} text-gray-400 text-xs`} title={fmtTs(r.lastSeen)}>{timeAgo(r.lastSeen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <p className="text-xs text-gray-400 text-center pt-2">
        Alertas automáticos destes padrões são enviados ao Telegram a cada 10 min (ative/desative em <span className="font-medium">Telegram → Alerta de segurança</span>).
      </p>
    </div>
  );
}
