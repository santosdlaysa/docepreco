import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Search, X } from 'lucide-react';
import { agentMaterials } from '../data/agentMaterials';
import type { NotificationDraft } from '../data/agentMaterials';

interface Props {
  onPrepareNotification?: (draft: NotificationDraft) => void;
}

const categoryOrder = ['Conteúdos para redes sociais', 'Imagens do aplicativo', 'Notificações', 'WhatsApp', 'Atendimento', 'Comercial', 'Suporte', 'Cobranças', 'Campanhas'];
const targetLabels: Record<string, string> = {
  all: 'Todos os usuários', free: 'Plano Free', premium: 'Plano Premium', master: 'Plano Master', expired: 'Assinatura expirada',
};

function materialCategory(item: (typeof agentMaterials)[number]): string {
  return item.category || item.area;
}

export function normalizeMaterialSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export function filterAgentMaterials(materials: typeof agentMaterials, search: string, area: string) {
  const term = normalizeMaterialSearch(search);
  return materials.filter(item => (!area || item.area === area)
    && (!term || normalizeMaterialSearch([
      item.title, item.text, item.area, item.audience ?? '', item.action ?? '', item.category ?? '', item.caption ?? '',
      item.notification?.title ?? '', item.notification?.body ?? '', item.notification?.eligibility ?? '',
    ].join(' ')).includes(term)));
}

export function AgentMaterialsPage({ onPrepareNotification }: Props = {}) {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [category, setCategory] = useState('');
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [manualCopy, setManualCopy] = useState<{ title: string; text: string } | null>(null);
  const manualRef = useRef<HTMLTextAreaElement>(null);
  const copyTriggerRef = useRef<HTMLButtonElement | null>(null);

  const areas = useMemo(() => [...new Set(agentMaterials.map(item => item.area))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR')), []);

  const filtered = useMemo(() => filterAgentMaterials(agentMaterials, search, area), [search, area]);
  const categories = useMemo(() => [...new Set(agentMaterials.map(materialCategory))].sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex < 0 ? categoryOrder.length : aIndex) - (bIndex < 0 ? categoryOrder.length : bIndex)
      || a.localeCompare(b, 'pt-BR');
  }), []);
  const visible = useMemo(() => filtered.filter(item => !category || materialCategory(item) === category), [filtered, category]);
  const sections = categories.map(name => ({ name, items: visible.filter(item => materialCategory(item) === name) }))
    .filter(section => section.items.length > 0);
  const artCount = agentMaterials.filter(item => item.imageUrl?.startsWith('/agent-materials/')).length;

  useEffect(() => {
    if (manualCopy) {
      manualRef.current?.focus();
      manualRef.current?.select();
    }
  }, [manualCopy]);

  const closeManualCopy = () => {
    setManualCopy(null);
    copyTriggerRef.current?.focus();
  };

  const copyText = async (item: (typeof agentMaterials)[number], trigger: HTMLButtonElement) => {
    copyTriggerRef.current = trigger;
    setCopyingId(item.id);
    setFeedback('');
    setManualCopy(null);
    const text = item.notification ? `${item.notification.title}\n\n${item.notification.body}` : item.text;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setFeedback(`Texto de “${item.title}” copiado.`);
    } catch {
      setManualCopy({ title: item.title, text });
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

      <div role="group" aria-label="Categorias de materiais" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={category === ''} onClick={() => setCategory('')}
          className={`rounded-full border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 ${category === '' ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'}`}>
          Todas ({filtered.length})
        </button>
        {categories.map(name => (
          <button type="button" key={name} aria-pressed={category === name} onClick={() => setCategory(name)}
            className={`rounded-full border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 ${category === name ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'}`}>
            {name} ({filtered.filter(item => materialCategory(item) === name).length})
          </button>
        ))}
      </div>

      {(!category || category === 'Imagens do aplicativo') && (
        <a href="/agent-materials/imagens-aplicativo.zip" download className="inline-block rounded-lg border border-primary-500 px-4 py-2 text-sm font-medium text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-primary-300">
          Baixar todas as imagens do aplicativo (ZIP)
        </a>
      )}
      {artCount === 7 && (!category || category === 'Conteúdos para redes sociais') && (
        <a href="/agent-materials/artes-docepreco.zip" download className="ml-2 inline-block rounded-lg border border-primary-500 px-4 py-2 text-sm font-medium text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-primary-300">
          Baixar todas as artes (ZIP)
        </a>
      )}

      <p role="status" aria-live="polite" className="text-sm text-gray-500 dark:text-gray-400">
        {visible.length} de {agentMaterials.length} materiais
      </p>
      <p role="status" aria-live="polite" className="text-sm text-green-700 dark:text-green-300">{feedback}</p>

      {manualCopy && (
        <section aria-labelledby="manual-copy-title" className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-gray-800">
          <div className="flex items-start justify-between gap-3">
            <h3 id="manual-copy-title" className="font-semibold text-gray-900 dark:text-white">Copiar manualmente: {manualCopy.title}</h3>
            <button type="button" onClick={closeManualCopy} aria-label="Fechar cópia manual"
              className="rounded p-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300"><X size={18} /></button>
          </div>
          <p id="manual-copy-instructions" role="alert" className="my-2 text-sm text-amber-900 dark:text-amber-200">
            Não foi possível copiar automaticamente. O texto abaixo está selecionado; use a opção Copiar do seu dispositivo ou Ctrl+C (Command+C no Mac).
          </p>
          <label htmlFor="agent-manual-copy" className="sr-only">Texto para cópia manual</label>
          <textarea id="agent-manual-copy" ref={manualRef} readOnly value={manualCopy.text} rows={6} aria-describedby="manual-copy-instructions"
            onFocus={event => event.currentTarget.select()}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
        </section>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-300">Nenhum material encontrado para os filtros selecionados.</p>
          <button type="button" onClick={() => { setSearch(''); setArea(''); setCategory(''); }}
            className="mt-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-primary-300">Limpar filtros</button>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map(section => (
          <section key={section.name} aria-label={section.name} className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{section.name} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({section.items.length})</span></h3>
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          {section.items.map(item => (
            <article key={item.id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary-600 dark:text-primary-300">{item.area}</p>
                  <h4 className="mt-1 break-words font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                </div>
                <button type="button" onClick={event => void copyText(item, event.currentTarget)} disabled={copyingId !== null}
                  aria-label={`Copiar texto de ${item.title}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus:ring-offset-gray-800">
                  <Copy size={15} aria-hidden="true" />{copyingId === item.id ? 'Copiando…' : 'Copiar'}
                </button>
              </div>
              {item.imageUrl && (
                <div className="mb-4 space-y-2">
                  {failedImages.includes(item.id) ? (
                    <p role="status" className="rounded-lg bg-gray-100 p-4 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">Não foi possível carregar a imagem deste material.</p>
                  ) : (
                    <img src={item.imageUrl} alt={item.imageAlt || `Arte de ${item.title}`} loading="lazy"
                      onError={() => setFailedImages(previous => previous.includes(item.id) ? previous : [...previous, item.id])}
                      className="max-h-[36rem] w-full rounded-lg border border-gray-100 object-contain dark:border-gray-700" />
                  )}
                  {!failedImages.includes(item.id) && <a href={item.imageUrl} download className="inline-block rounded px-1 py-1 text-sm font-medium text-primary-600 underline focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-primary-300">Baixar imagem de {item.title}</a>}
                </div>
              )}
              {item.audience && <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-medium">Público:</span> {item.audience}</p>}
              {item.caption && (
                <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Legenda pronta para usar</p>
                  <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{item.caption}</p>
                  <button type="button" disabled={copyingId !== null}
                    onClick={event => void copyText({ ...item, text: item.caption!, title: `Legenda — ${item.title}` }, event.currentTarget)}
                    className="mt-2 rounded px-1 py-1 text-sm font-medium text-primary-600 underline focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:text-primary-300">Copiar legenda</button>
                </div>
              )}
              {item.notification ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Prévia da notificação</p>
                    <p className="whitespace-pre-wrap break-words font-semibold text-gray-900 dark:text-white">{item.notification.title}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200">{item.notification.body}</p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300"><span className="font-medium">Público de destino:</span> {targetLabels[item.notification.target] || item.notification.target}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300"><span className="font-medium">Elegibilidade:</span> {item.notification.eligibility}</p>
                  <button type="button" disabled={!onPrepareNotification}
                    onClick={() => {
                      if (onPrepareNotification && item.notification) onPrepareNotification({ ...item.notification });
                    }}
                    className="rounded-lg border border-primary-500 px-3 py-2 text-sm font-medium text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-300">Preparar notificação</button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{onPrepareNotification ? 'Abre o formulário para revisar e selecionar destinatários. Modelos individuais exigem contas específicas. Confira a elegibilidade antes de enviar. Esta ação não envia nem agenda.' : 'A preparação precisa estar disponível neste painel. Você pode copiar o título e o texto acima.'}</p>
                </div>
              ) : <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 dark:text-gray-200">{item.text}</p>}
              {item.action && <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"><span className="font-medium">Ação:</span> {item.action}</p>}
            </article>
          ))}
            </div>
          </section>
          ))}
        </div>
      )}
    </div>
  );
}
