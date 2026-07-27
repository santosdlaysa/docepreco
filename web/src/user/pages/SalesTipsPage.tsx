import { useEffect, useState, useCallback } from 'react';
import {
  Lightbulb, AlertTriangle, Info, Rocket, ChevronDown, ChevronUp, ExternalLink,
  LayoutGrid, AtSign, MessageCircle, Camera, Tag, Heart, Calendar, Megaphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { userApi } from '../userApi';
import { ToastFn, TableSkeleton } from '../../components';
import {
  generateInsights, buildPricingTips, Insight, InsightType,
  MARKETING_TIPS, MARKETING_CATEGORIES, MarketingCategory,
} from '../salesTips';

type CatFilter = MarketingCategory | 'all';

const CAT_ICON: Record<string, LucideIcon> = {
  Instagram: AtSign, MessageCircle, Camera, Tag, Heart, Calendar, Megaphone,
};

const INSIGHT_STYLE: Record<InsightType, { icon: LucideIcon; color: string; bg: string }> = {
  positive: { icon: Rocket, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  neutral: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
  tip: { icon: Lightbulb, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
};

export function SalesTipsPage({ toast }: { toast: ToastFn }) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [cat, setCat] = useState<CatFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, sales] = await Promise.all([userApi.getStats(), userApi.listSales()]);
      const base = generateInsights(stats);
      const pricing = await buildPricingTips(sales, userApi.calculateRecipe);
      setInsights([...pricing, ...base]);
    } catch (e) {
      toast.error((e as Error).message);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const tips = cat === 'all' ? MARKETING_TIPS : MARKETING_TIPS.filter(t => t.category === cat);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Dicas de vendas</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Marketing e precificação</p>
      </div>

      {/* Hero */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800 shadow-sm mb-6">
        <Lightbulb size={26} className="text-white" />
        <p className="text-lg font-extrabold text-white mt-2">Venda mais e melhor</p>
        <p className="text-sm text-white/85 mt-1 leading-snug">
          Análises do seu negócio + dicas práticas de marketing e vendas para confeitaria.
        </p>
      </div>

      {/* Análise do negócio (dinâmica) */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
          <TableSkeleton rows={3} cols={1} />
        </div>
      ) : insights.length > 0 && (
        <div className="mb-6">
          <p className="font-semibold text-gray-900 dark:text-white text-sm mb-3">📊 Análise do seu negócio</p>
          <div className="space-y-2.5">
            {insights.map(tip => {
              const st = INSIGHT_STYLE[tip.type];
              const Icon = st.icon;
              return (
                <div key={tip.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${st.bg}`}>
                    <Icon size={20} className={st.color} />
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-100 font-medium leading-snug">{tip.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dicas de marketing curadas */}
      <p className="font-semibold text-gray-900 dark:text-white text-sm mb-3">💡 Dicas de marketing e vendas</p>

      {/* Filtro por categoria */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <CatChip label="Todas" Icon={LayoutGrid} color="#7C3AED" active={cat === 'all'} onClick={() => setCat('all')} />
        {MARKETING_CATEGORIES.map(c => (
          <CatChip
            key={c.key}
            label={c.label}
            Icon={CAT_ICON[c.icon] ?? Tag}
            color={c.color}
            active={cat === c.key}
            onClick={() => setCat(c.key)}
          />
        ))}
      </div>

      <div className="space-y-2.5">
        {tips.map(tip => {
          const meta = MARKETING_CATEGORIES.find(c => c.key === tip.category)!;
          const Icon = CAT_ICON[meta.icon] ?? Tag;
          const open = expanded === tip.id;
          return (
            <div key={tip.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setExpanded(open ? null : tip.id)}
                className="w-full flex items-center gap-3 p-3.5 text-left"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
                  <Icon size={18} style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{tip.title}</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: meta.color }}>{meta.label}</p>
                </div>
                {open ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
              </button>
              {open && (
                <div className="px-3.5 pb-3.5">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed pt-3 border-t border-gray-100 dark:border-gray-700">
                    {tip.body}
                  </p>
                  {tip.link && (
                    <a
                      href={tip.link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl py-2.5 mt-3 transition-colors"
                    >
                      <ExternalLink size={16} /> {tip.link.label}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CatChip({ label, Icon, color, active, onClick }: { label: string; Icon: LucideIcon; color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'text-white border-transparent' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
      }`}
      style={active ? { backgroundColor: color } : undefined}
    >
      <Icon size={14} style={{ color: active ? '#fff' : color }} />
      {label}
    </button>
  );
}
