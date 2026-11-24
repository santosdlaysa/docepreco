import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Search, X } from 'lucide-react';
import { agentMaterials } from '../data/agentMaterials';

export function normalizeMaterialSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export function filterAgentMaterials(materials: typeof agentMaterials, search: string, area: string) {
  const term = normalizeMaterialSearch(search);
  return materials.filter(item => (!area || item.area === area)
    && (!term || normalizeMaterialSearch([
      item.title, item.text, item.area, item.audience ?? '', item.action ?? '',
    ].join(' ')).includes(term)));
}

export function AgentMaterialsPage() {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [manualCopy, setManualCopy] = useState<{ title: string; text: string } | null>(null);
  const manualRef = useRef<HTMLTextAreaElement>(null);

  const areas = useMemo(() => [...new Set(agentMaterials.map(item => item.area))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR')), []);

  const visible = useMemo(() => filterAgentMaterials(agentMaterials, search, area), [search, area]);

  useEffect(() => {
    if (manualCopy) {
      manualRef.current?.focus();
      manualRef.current?.select();
    }
  }, [manualCopy]);

  const copyText = async (item: (typeof agentMaterials)[number]) => {
    setCopyingId(item.id);
    setFeedback('');
    setManualCopy(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(item.text);
      setFeedback(`Texto de “${item.title}” copiado.`);
    } catch {
      setManualCopy({ title: item.title, text: item.text });
    } finally {
      setCopyingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Materiais do time</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Consulte os textos preparados pelos agentes e copie o material desejado. Copiar não envia mensagens.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="agent-material-search" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar material</label>
          <div className="relative">
            <Search size={18} aria-hidden="true" className="absolute left-3 top-3 text-gray-400" />
            <input id="agent-material-search" type="search" value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Busque por tema, texto ou público"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
          </div>
        </div>
        <div className="sm:w-56">
          <label htmlFor="agent-material-area" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Área</label>
          <select id="agent-material-area" value={area} onChange={event => setArea(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
            <option value="">Todas as áreas</option>
            {areas.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-gray-500 dark:text-gray-400">
        {visible.length} de {agentMaterials.length} materiais
      </p>
      <p role="status" aria-live="polite" className="text-sm text-green-700 dark:text-green-300">{feedback}</p>

      {manualCopy && (
        <section aria-labelledby="manual-copy-title" className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-gray-800">
          <div className="flex items-start justify-between gap-3">
            <h3 id="manual-copy-title" className="font-semibold text-gray-900 dark:text-white">Copiar manualmente: {manualCopy.title}</h3>
            <button type="button" onClick={() => setManualCopy(null)} aria-label="Fechar cópia manual"
              className="rounded p-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300"><X size={18} /></button>
          </div>
          <p role="alert" className="my-2 text-sm text-amber-900 dark:text-amber-200">
            Não foi possível copiar automaticamente. O texto abaixo está selecionado; use a opção Copiar do seu dispositivo ou Ctrl+C (Command+C no Mac).
          </p>
          <label htmlFor="agent-manual-copy" className="sr-only">Texto para cópia manual</label>
          <textarea id="agent-manual-copy" ref={manualRef} readOnly value={manualCopy.text} rows={6}
            onFocus={event => event.currentTarget.select()}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
        </section>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-300">Nenhum material encontrado para os filtros selecionados.</p>
          <button type="button" onClick={() => { setSearch(''); setArea(''); }}
            className="mt-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-primary-300">Limpar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          {visible.map(item => (
            <article key={item.id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary-600 dark:text-primary-300">{item.area}</p>
                  <h3 className="mt-1 break-words font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                </div>
                <button type="button" onClick={() => void copyText(item)} disabled={copyingId !== null}
                  aria-label={`Copiar texto de ${item.title}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus:ring-offset-gray-800">
                  <Copy size={15} aria-hidden="true" />{copyingId === item.id ? 'Copiando…' : 'Copiar'}
                </button>
              </div>
              {item.audience && <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-medium">Público:</span> {item.audience}</p>}
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 dark:text-gray-200">{item.text}</p>
              {item.action && <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"><span className="font-medium">Ação:</span> {item.action}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
