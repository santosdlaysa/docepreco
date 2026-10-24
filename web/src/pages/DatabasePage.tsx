import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { ToastFn } from '../components';
import { Play, Clock, Database, ChevronDown, ChevronUp, Trash2, Copy, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

interface Props {
  toast: ToastFn;
}

interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  command: string;
  fields: string[];
  ms: number;
}

interface HistoryEntry {
  sql: string;
  ts: string;
  ok: boolean;
  rowCount?: number;
  command?: string;
  ms?: number;
  error?: string;
}

const QUICK_COMMANDS = [
  {
    label: 'Banco e schema atuais',
    sql: 'SELECT current_database() AS banco, current_schema() AS schema;',
  },
  {
    label: 'Listar tabelas',
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;",
  },
  {
    label: 'Tamanho das tabelas',
    sql: "SELECT relname AS tabela, pg_size_pretty(pg_total_relation_size(relid)) AS tamanho FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 20;",
  },
  {
    label: 'Contar usuários',
    sql: 'SELECT COUNT(*) AS total FROM users;',
  },
  {
    label: 'Últimas mensagens de suporte',
    sql: "SELECT id, user_id, sender_type, LEFT(message, 60) AS message, created_at FROM support_messages ORDER BY created_at DESC LIMIT 10;",
  },
  {
    label: 'Usuários premium',
    sql: 'SELECT company_name, email, premium_until FROM users WHERE is_premium = true ORDER BY premium_until DESC LIMIT 20;',
  },
];

const TABLES_SQL = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;";

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

const HISTORY_KEY = 'db_query_history';
const MAX_HISTORY = 20;

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveHistory(h: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)));
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function DatabasePage({ toast }: Props) {
  const [sql, setSql] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [tables, setTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<{ name: string; type: string; nullable: string }[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const loadTables = async () => {
    setTablesLoading(true);
    setTablesError(null);
    try {
      const res = await api.executeDbQuery(TABLES_SQL);
      setTables(res.rows.map(row => row.table_name).filter((name): name is string => typeof name === 'string'));
    } catch (e: any) {
      setTablesError(e?.message ?? 'Não foi possível listar as tabelas.');
    } finally {
      setTablesLoading(false);
    }
  };

  useEffect(() => { void loadTables(); }, []);

  useEffect(() => {
    if (!selectedTable) return;
    let active = true;
    setColumns([]);
    setColumnsLoading(true);
    setColumnsError(false);
    const query = `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${quoteLiteral(selectedTable)} ORDER BY ordinal_position;`;
    api.executeDbQuery(query)
      .then(res => {
        if (active) setColumns(res.rows.map(row => ({
          name: String(row.column_name),
          type: String(row.data_type),
          nullable: String(row.is_nullable),
        })));
      })
      .catch(() => { if (active) setColumnsError(true); })
      .finally(() => { if (active) setColumnsLoading(false); });
    return () => { active = false; };
  }, [selectedTable]);

  const suggest = (query: string) => {
    setSql(query);
    textareaRef.current?.focus();
  };

  const run = async () => {
    const trimmed = sql.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.executeDbQuery(trimmed);
      setResult(res);
      const entry: HistoryEntry = { sql: trimmed, ts: new Date().toISOString(), ok: true, rowCount: res.rowCount, command: res.command, ms: res.ms };
      const h = [entry, ...history];
      setHistory(h);
      saveHistory(h);
      toast.success(`${res.command} — ${res.rowCount} linha(s) em ${res.ms}ms`);
    } catch (e: any) {
      const msg = e?.message ?? 'Erro desconhecido';
      setError(msg);
      const entry: HistoryEntry = { sql: trimmed, ts: new Date().toISOString(), ok: false, error: msg };
      const h = [entry, ...history];
      setHistory(h);
      saveHistory(h);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.rows, null, 2));
    toast.success('Resultado copiado!');
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    toast.success('Histórico limpo.');
  };

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center">
          <Database size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Console SQL</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Execute queries diretamente no banco de produção</p>
        </div>
      </div>

      {/* Access information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <h3 className="font-semibold text-gray-900 dark:text-white">Onde acessar o banco</h3>
        <p><strong>Neste painel:</strong> Administração → Sistema → Console SQL. As consultas usam o PostgreSQL configurado no backend de produção.</p>
        <p><strong>Acesso externo:</strong> abra o serviço PostgreSQL no <a href="https://dashboard.render.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline">painel da Render <ExternalLink size={12} /></a> e consulte a seção Connect. A conexão do backend é definida pela variável <code className="font-mono text-xs">DATABASE_URL</code>; credenciais não são exibidas aqui.</p>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Atenção:</span> Qualquer comando executado aqui afeta o banco de produção diretamente. Não há confirmação ou rollback automático. Use com cuidado.
        </p>
      </div>

      {/* Live database tables */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tabelas do banco</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Schema public · {tables.length} tabela(s) encontradas</p>
          </div>
          <button type="button" onClick={() => void loadTables()} disabled={tablesLoading} className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50">
            <RefreshCw size={13} className={tablesLoading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
        <div className="p-4 space-y-3">
          <input
            value={tableFilter}
            onChange={e => setTableFilter(e.target.value)}
            placeholder="Buscar tabela pelo nome"
            aria-label="Buscar tabela pelo nome"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          {tablesError && <p className="text-sm text-red-600 dark:text-red-400">{tablesError}</p>}
          {tablesLoading && tables.length === 0 && <p className="text-sm text-gray-500">Carregando tabelas...</p>}
          {!tablesLoading && !tablesError && tables.length === 0 && <p className="text-sm text-gray-500">Nenhuma tabela encontrada.</p>}
          <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
            {tables.filter(name => name.toLowerCase().includes(tableFilter.toLowerCase())).map(name => (
              <button key={name} type="button" onClick={() => setSelectedTable(name)} aria-pressed={selectedTable === name}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-mono border transition-colors ${selectedTable === name ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-primary-300'}`}>
                {name}
              </button>
            ))}
          </div>
          {tables.length > 0 && !tables.some(name => name.toLowerCase().includes(tableFilter.toLowerCase())) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma tabela corresponde à busca.</p>
          )}
          {selectedTable && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{selectedTable}</p>
              {columnsLoading ? <p className="text-xs text-gray-500">Carregando colunas...</p> : (
                <div className="flex flex-wrap gap-1.5">
                  {columns.map(column => <span key={column.name} title={`${column.type} · ${column.nullable === 'YES' ? 'aceita NULL' : 'obrigatória'}`} className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-mono text-gray-700 dark:text-gray-300">{column.name} <span className="text-gray-400">{column.type}</span></span>)}
                </div>
              )}
              {columnsError && <p className="text-xs text-red-600 dark:text-red-400">Não foi possível carregar as colunas desta tabela.</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => suggest(`SELECT COUNT(*) AS total FROM ${quoteIdentifier(selectedTable)};`)} className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Contar registros</button>
                <button type="button" onClick={() => suggest(`SELECT * FROM ${quoteIdentifier(selectedTable)} LIMIT 20;`)} className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Ver 20 registros</button>
                <button type="button" onClick={() => suggest(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${quoteLiteral(selectedTable)} ORDER BY ordinal_position;`)} className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Listar colunas</button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">As sugestões apenas preenchem o editor. Revise o SQL antes de executar.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick commands */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowQuick(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span>Comandos sugeridos</span>
          {showQuick ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showQuick && (
          <div className="border-t border-gray-100 dark:border-gray-700 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => { setSql(cmd.sql); textareaRef.current?.focus(); }}
                className="text-left text-xs px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-200 hover:text-primary-700 dark:hover:text-primary-300 transition-colors border border-gray-100 dark:border-gray-600 hover:border-primary-200 dark:hover:border-primary-700"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SQL</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">Ctrl+Enter para executar</span>
        </div>
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={e => setSql(e.target.value)}
          onKeyDown={handleKey}
          placeholder="SELECT COUNT(*) AS total FROM users;"
          rows={6}
          className="w-full px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100 bg-transparent placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none resize-y"
          spellCheck={false}
        />
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <button
            onClick={() => setSql('')}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            Limpar
          </button>
          <button
            onClick={run}
            disabled={!sql.trim() || loading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 text-white text-sm font-semibold transition-colors"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play size={14} />
            )}
            Executar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Erro</p>
          <pre className="text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap font-mono">{error}</pre>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resultado</span>
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-mono font-semibold">{result.command}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{result.rowCount} linha(s)</span>
              <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <Clock size={11} /> {result.ms}ms
              </span>
            </div>
            {result.rows.length > 0 && (
              <button onClick={copyResult} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <Copy size={12} /> Copiar JSON
              </button>
            )}
          </div>

          {result.rows.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
              {result.command === 'SELECT' ? 'Nenhuma linha retornada' : 'Comando executado com sucesso'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-max">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {result.fields.map(f => (
                      <th key={f} className="px-4 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      {result.fields.map(f => {
                        const val = row[f];
                        const display = val === null ? <span className="text-gray-300 dark:text-gray-600 italic">null</span>
                          : typeof val === 'object' ? <span className="font-mono text-indigo-600 dark:text-indigo-400">{JSON.stringify(val)}</span>
                          : String(val);
                        return (
                          <td key={f} className="px-4 py-2 text-gray-700 dark:text-gray-300 font-mono whitespace-nowrap max-w-xs truncate">
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span>Histórico ({history.length})</span>
            <div className="flex items-center gap-2">
              <span
                role="button"
                tabIndex={0}
                onClick={e => { e.stopPropagation(); clearHistory(); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); clearHistory(); } }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} /> Limpar
              </span>
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>
          {showHistory && (
            <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setSql(h.sql)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{fmtTime(h.ts)}</span>
                    {h.command && <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">{h.command}</span>}
                    {h.ms !== undefined && <span className="text-[11px] text-gray-400 dark:text-gray-500">{h.ms}ms</span>}
                    {h.error && <span className="text-[11px] text-red-500 dark:text-red-400 truncate">{h.error.slice(0, 60)}</span>}
                  </div>
                  <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{h.sql}</pre>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
