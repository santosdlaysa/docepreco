import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, X, ChevronRight, Sparkles, ChevronLeft, Megaphone } from 'lucide-react';
import { userApi } from './userApi';
import { engagementApi, CarouselBanner, localPref } from './engagementApi';

type GuidePage = 'ingredients' | 'recipes' | 'sales';
const GUIDE_DISMISSED_KEY = 'docepreco_beginner_guide_dismissed';

/**
 * "Primeiros passos" (BeginnerGuideScreen do app): checklist com progresso
 * calculado pelos dados reais da conta. Some quando tudo foi feito ou ao dispensar.
 */
export function BeginnerGuide({ onNavigate }: { onNavigate: (page: GuidePage) => void }) {
  const [dismissed, setDismissed] = useState(() => localPref.get<boolean>(GUIDE_DISMISSED_KEY, false));
  const [counts, setCounts] = useState<{ ingredients: number; recipes: number; sales: number } | null>(null);

  useEffect(() => {
    if (dismissed) return;
    Promise.all([
      userApi.listIngredients().then(r => r.length).catch(() => 0),
      userApi.listRecipes().then(r => r.length).catch(() => 0),
      userApi.listSales().then(r => r.length).catch(() => 0),
    ]).then(([ingredients, recipes, sales]) => setCounts({ ingredients, recipes, sales }));
  }, [dismissed]);

  if (dismissed || !counts) return null;

  const steps: { title: string; desc: string; action: string; page: GuidePage; done: boolean }[] = [
    { title: 'Cadastre seus ingredientes', desc: 'Nome, quantidade da embalagem e o preço que você pagou.', action: 'Cadastrar ingrediente', page: 'ingredients', done: counts.ingredients >= 1 },
    { title: 'Crie sua primeira receita', desc: 'Monte a receita com os ingredientes — o custo é calculado sozinho.', action: 'Criar receita', page: 'recipes', done: counts.recipes >= 1 },
    { title: 'Defina o acréscimo sobre o custo', desc: 'Na receita, escolha o percentual (ex.: 100%) para chegar ao preço de venda.', action: 'Ver receitas', page: 'recipes', done: counts.recipes >= 1 },
    { title: 'Registre sua primeira venda', desc: 'Acompanhe faturamento e lucro nos relatórios.', action: 'Registrar venda', page: 'sales', done: counts.sales >= 1 },
  ];
  const doneCount = steps.filter(s => s.done).length;
  if (doneCount === steps.length) return null;
  const next = steps.find(s => !s.done);

  const dismiss = () => { localPref.set(GUIDE_DISMISSED_KEY, true); setDismissed(true); };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-primary-200 dark:border-primary-900/50 p-4 mb-4">
      <div className="flex items-start gap-2">
        <Sparkles size={18} className="text-primary-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">Primeiros passos</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{doneCount} de {steps.length} concluídos — siga os passos para começar a precificar com segurança.</p>
        </div>
        <button onClick={dismiss} className="text-gray-300 hover:text-gray-500" aria-label="Dispensar primeiros passos" title="Não mostrar mais"><X size={16} /></button>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 mt-3 overflow-hidden">
        <div className="h-full bg-primary-500 transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-3 space-y-1">
        {steps.map(s => (
          <li key={s.title}>
            <button
              onClick={() => onNavigate(s.page)}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${s === next ? 'bg-primary-50/60 dark:bg-primary-900/20' : ''}`}
            >
              {s.done ? <CheckCircle2 size={18} className="text-green-500 shrink-0" /> : <Circle size={18} className="text-gray-300 shrink-0" />}
              <span className="flex-1 min-w-0">
                <span className={`block text-sm font-medium ${s.done ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{s.title}</span>
                {!s.done && <span className="block text-xs text-gray-500 dark:text-gray-400">{s.desc}</span>}
              </span>
              {!s.done && <span className="text-xs font-semibold text-primary-600 shrink-0 hidden sm:inline">{s.action}</span>}
              {!s.done && <ChevronRight size={16} className="text-primary-500 shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Carrossel de anúncios patrocinados (o mesmo da Home do app) + atalho para anunciar. */
export function SponsoredCarousel({ onAnnounce }: { onAnnounce: () => void }) {
  const [items, setItems] = useState<CarouselBanner[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => { engagementApi.getCarousel().then(setItems).catch(() => setItems([])); }, []);
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <button onClick={onAnnounce} className="w-full mb-4 flex items-center gap-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600">
        <Megaphone size={16} /> Anuncie sua confeitaria para todas as usuárias do DocePreço
      </button>
    );
  }

  const b = items[idx % items.length];
  const content = (
    <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[16/5] sm:aspect-[16/4]">
      {b.imageUrl
        ? <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex flex-col justify-center px-5 bg-gradient-to-br from-primary-500 to-primary-600 text-white"><p className="font-bold">{b.title}</p><p className="text-sm text-white/90">{b.message}</p></div>}
      <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-black/50 text-white rounded px-1.5 py-0.5">Patrocinado</span>
    </div>
  );

  return (
    <div className="mb-4">
      <div className="relative">
        {b.actionUrl ? <a href={b.actionUrl} target="_blank" rel="noopener noreferrer">{content}</a> : content}
        {items.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + items.length) % items.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1" aria-label="Anterior"><ChevronLeft size={16} /></button>
            <button onClick={() => setIdx(i => (i + 1) % items.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1" aria-label="Próximo"><ChevronRight size={16} /></button>
          </>
        )}
      </div>
      <button onClick={onAnnounce} className="mt-1.5 text-xs font-medium text-primary-600 hover:underline">Anuncie aqui também</button>
    </div>
  );
}
