/**
 * Dicas de vendas e marketing para a versão web — portado de
 * mobile/src/presentation/utils/{generateInsights,marketingTips}.ts.
 * Os ícones Ionicons do mobile foram substituídos por nomes de ícones
 * lucide-react (resolvidos na página).
 */
import { AppStats, Sale, Recipe } from './userApi';
import i18n from '../i18n';

const tr = (key: string, opts?: Record<string, unknown>) => i18n.t(`finance:${key}`, opts) as string;

/* ── Insights dinâmicos (análise do negócio) ──────────────────────────── */

export type InsightType = 'positive' | 'warning' | 'neutral' | 'tip';

export interface Insight {
  id: string;
  message: string;
  type: InsightType;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function generateInsights(stats: AppStats): Insight[] {
  const insights: Insight[] = [];
  const { monthlySalesCount, monthlyRevenue, recentSales, recipesCount } = stats;

  // Ticket médio
  if (monthlySalesCount > 0) {
    const ticketMedio = monthlyRevenue / monthlySalesCount;
    insights.push({
      id: 'avg-ticket',
      message: tr('tips.insight.avgTicket', { value: fmt(ticketMedio) }),
      type: 'neutral',
    });
    if (monthlySalesCount >= 10 && ticketMedio < 30) {
      insights.push({
        id: 'low-ticket',
        message: tr('tips.insight.lowTicket'),
        type: 'warning',
      });
    }
  }

  // Campeão de vendas
  if (recentSales.length > 0) {
    const salesByRecipe: Record<string, { name: string; total: number }> = {};
    for (const sale of recentSales) {
      if (!salesByRecipe[sale.recipeName]) salesByRecipe[sale.recipeName] = { name: sale.recipeName, total: 0 };
      salesByRecipe[sale.recipeName].total += sale.totalRevenue;
    }
    const top = Object.values(salesByRecipe).sort((a, b) => b.total - a.total)[0];
    if (top) {
      insights.push({
        id: 'top-recipe',
        message: tr('tips.insight.topRecipe', { name: top.name, value: fmt(top.total) }),
        type: 'positive',
      });
    }
  }

  // Sem vendas
  if (monthlySalesCount === 0 && recipesCount > 0) {
    insights.push({
      id: 'no-sales',
      message: tr('tips.insight.noSales'),
      type: 'tip',
    });
  }

  // Sem receitas
  if (recipesCount === 0) {
    insights.push({
      id: 'no-recipes',
      message: tr('tips.insight.noRecipes'),
      type: 'tip',
    });
  }

  // Poucas receitas mas vendendo
  if (recipesCount > 0 && recipesCount <= 2 && monthlySalesCount > 0) {
    insights.push({
      id: 'few-recipes',
      message: tr('tips.insight.fewRecipes', { count: recipesCount }),
      type: 'tip',
    });
  }

  return insights;
}

/**
 * Dicas de precificação: compara o preço médio praticado com o preço sugerido
 * pela ficha técnica e destaca o produto de maior margem e a concentração de
 * faturamento.
 */
export async function buildPricingTips(
  sales: Sale[],
  calculate: (id: string) => Promise<{ suggestedPrice: number; profitMargin: number; costPerUnit: number }>,
): Promise<Insight[]> {
  const tips: Insight[] = [];
  if (sales.length === 0) return tips;

  const agg: Record<string, { name: string; units: number; revenue: number }> = {};
  for (const s of sales) {
    if (!s.recipeId) continue; // vendas de produto (sem receita) não têm cálculo de custo
    const a = agg[s.recipeId] ?? { name: s.recipeName, units: 0, revenue: 0 };
    a.units += s.quantitySold;
    a.revenue += s.totalRevenue;
    agg[s.recipeId] = a;
  }

  const totalRevenue = Object.values(agg).reduce((sum, a) => sum + a.revenue, 0);
  const soldIds = Object.keys(agg);

  const calc: Record<string, { suggestedPrice: number; profitMargin: number; costPerUnit: number }> = {};
  await Promise.all(soldIds.map(async id => {
    try { calc[id] = await calculate(id); } catch { /* ignora */ }
  }));

  // 1. Vendendo abaixo do preço sugerido
  let bestUnderpriced: { name: string; avg: number; suggested: number; gapPct: number } | null = null;
  for (const id of soldIds) {
    const a = agg[id];
    const c = calc[id];
    if (!c || !c.suggestedPrice || a.units === 0) continue;
    const avg = a.revenue / a.units;
    if (avg < c.suggestedPrice * 0.95) {
      const gapPct = ((c.suggestedPrice - avg) / avg) * 100;
      if (!bestUnderpriced || gapPct > bestUnderpriced.gapPct) {
        bestUnderpriced = { name: a.name, avg, suggested: c.suggestedPrice, gapPct };
      }
    }
  }
  if (bestUnderpriced) {
    tips.push({
      id: 'underpriced',
      type: 'warning',
      message: tr('tips.insight.underpriced', { name: bestUnderpriced.name, avg: fmt(bestUnderpriced.avg), suggested: fmt(bestUnderpriced.suggested), gap: bestUnderpriced.gapPct.toFixed(0) }),
    });
  }

  // 2. Produto de maior margem
  let bestMargin: { name: string; margin: number } | null = null;
  for (const id of soldIds) {
    const c = calc[id];
    if (!c) continue;
    if (!bestMargin || c.profitMargin > bestMargin.margin) {
      bestMargin = { name: agg[id].name, margin: c.profitMargin };
    }
  }
  if (bestMargin && bestMargin.margin > 0) {
    tips.push({
      id: 'best-margin',
      type: 'positive',
      message: tr('tips.insight.bestMargin', { name: bestMargin.name, margin: bestMargin.margin.toFixed(0) }),
    });
  }

  // 3. Concentração de faturamento
  if (totalRevenue > 0) {
    const top = Object.values(agg).sort((a, b) => b.revenue - a.revenue)[0];
    const pct = (top.revenue / totalRevenue) * 100;
    if (pct >= 60 && Object.keys(agg).length >= 2) {
      tips.push({
        id: 'concentration',
        type: 'tip',
        message: tr('tips.insight.concentration', { name: top.name, pct: pct.toFixed(0) }),
      });
    }
  }

  return tips;
}

/* ── Dicas de marketing curadas (estáticas) ───────────────────────────── */

export type MarketingCategory =
  | 'instagram' | 'whatsapp' | 'fotos' | 'preco' | 'fidelizacao' | 'datas' | 'captacao';

export interface MarketingTip {
  id: string;
  category: MarketingCategory;
  title: string;
  body: string;
  link?: { url: string; label: string };
}

export interface CategoryMeta {
  key: MarketingCategory;
  label: string;
  /** Nome do ícone lucide-react resolvido na página. */
  icon: string;
  color: string;
  bg: string;
}

/** Rótulo traduzido na hora da leitura (getter), mantendo o formato dos dados. */
const category = (key: MarketingCategory, icon: string, color: string, bg: string): CategoryMeta => ({
  key, icon, color, bg,
  get label() { return tr(`tips.cat.${key}`); },
});

export const MARKETING_CATEGORIES: CategoryMeta[] = [
  category('instagram', 'Instagram', '#C13584', '#FCEAF4'),
  category('whatsapp', 'MessageCircle', '#1FA855', '#E3F7EC'),
  category('fotos', 'Camera', '#2B7DDB', '#E7F1FC'),
  category('preco', 'Tag', '#7C3AED', '#F1E8FB'),
  category('fidelizacao', 'Heart', '#E8537A', '#FCE7ED'),
  category('datas', 'Calendar', '#E0922B', '#FCEFD9'),
  category('captacao', 'Megaphone', '#0E9C8A', '#E1F6F3'),
];

/** Título, texto e rótulo do link vêm do idioma atual (finance.json → tips.items). */
const tip = (id: string, category: MarketingCategory, url?: string): MarketingTip => {
  const t: MarketingTip = {
    id, category,
    get title() { return tr(`tips.items.${id}.title`); },
    get body() { return tr(`tips.items.${id}.body`); },
  };
  if (url) t.link = { url, get label() { return tr(`tips.items.${id}.link`); } };
  return t;
};

export const MARKETING_TIPS: MarketingTip[] = [
  tip('ig-template-story', 'instagram', 'https://canva.link/0e147tvm3mph6ls'),
  tip('ig-template-story-oferta', 'instagram', 'https://canva.link/n8rnl24knb1gyyt'),
  tip('ig-template-logo-loja', 'instagram', 'https://canva.link/4iyz3dsd6ku103p'),
  tip('ig-constancia', 'instagram'),
  tip('ig-reels', 'instagram'),
  tip('ig-bastidores', 'instagram'),
  tip('ig-bio', 'instagram'),
  tip('wa-business', 'whatsapp'),
  tip('wa-rapidez', 'whatsapp'),
  tip('wa-transmissao', 'whatsapp'),
  tip('foto-luz', 'fotos'),
  tip('foto-corte', 'fotos'),
  tip('foto-fundo', 'fotos'),
  tip('preco-combo', 'preco'),
  tip('preco-degustacao', 'preco'),
  tip('preco-ancoragem', 'preco'),
  tip('preco-entrega', 'preco'),
  tip('fid-cartao', 'fidelizacao'),
  tip('fid-posvenda', 'fidelizacao'),
  tip('fid-brinde', 'fidelizacao'),
  tip('data-calendario', 'datas'),
  tip('data-agenda', 'datas'),
  tip('data-kits', 'datas'),
  tip('cap-indicacao', 'captacao'),
  tip('cap-parcerias', 'captacao'),
  tip('cap-amostra', 'captacao'),
  tip('cap-depoimentos', 'captacao'),
];
