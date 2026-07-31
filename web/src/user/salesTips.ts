/**
 * Dicas de vendas e marketing para a versão web — portado de
 * mobile/src/presentation/utils/{generateInsights,marketingTips}.ts.
 * Os ícones Ionicons do mobile foram substituídos por nomes de ícones
 * lucide-react (resolvidos na página).
 */
import { AppStats, Sale, Recipe } from './userApi';

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
      message: `Seu ticket médio é ${fmt(ticketMedio)} por venda.`,
      type: 'neutral',
    });
    if (monthlySalesCount >= 10 && ticketMedio < 30) {
      insights.push({
        id: 'low-ticket',
        message: 'Você vende bastante, mas o ticket médio está baixo. Considere revisar seus preços!',
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
        message: `"${top.name}" é o campeão de vendas recente, com ${fmt(top.total)} faturados.`,
        type: 'positive',
      });
    }
  }

  // Sem vendas
  if (monthlySalesCount === 0 && recipesCount > 0) {
    insights.push({
      id: 'no-sales',
      message: 'Você ainda não registrou vendas este mês. Registre suas vendas para acompanhar o faturamento!',
      type: 'tip',
    });
  }

  // Sem receitas
  if (recipesCount === 0) {
    insights.push({
      id: 'no-recipes',
      message: 'Crie sua primeira receita para começar a precificar seus produtos!',
      type: 'tip',
    });
  }

  // Poucas receitas mas vendendo
  if (recipesCount > 0 && recipesCount <= 2 && monthlySalesCount > 0) {
    insights.push({
      id: 'few-recipes',
      message: `Você tem só ${recipesCount} receita${recipesCount > 1 ? 's' : ''}. Diversificar o cardápio pode aumentar seu faturamento!`,
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
      message: `Você vende "${bestUnderpriced.name}" a ${fmt(bestUnderpriced.avg)}, mas o preço sugerido é ${fmt(bestUnderpriced.suggested)} (+${bestUnderpriced.gapPct.toFixed(0)}%). Ajustar pode aumentar seu lucro.`,
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
      message: `"${bestMargin.name}" tem a maior margem (${bestMargin.margin.toFixed(0)}%). Divulgue mais esse produto para lucrar mais com o mesmo esforço.`,
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
        message: `"${top.name}" representa ${pct.toFixed(0)}% do seu faturamento. Diversifique para não depender de um só produto.`,
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

export const MARKETING_CATEGORIES: CategoryMeta[] = [
  { key: 'instagram',   label: 'Instagram',       icon: 'Instagram',     color: '#C13584', bg: '#FCEAF4' },
  { key: 'whatsapp',    label: 'WhatsApp',        icon: 'MessageCircle', color: '#1FA855', bg: '#E3F7EC' },
  { key: 'fotos',       label: 'Fotos',           icon: 'Camera',        color: '#2B7DDB', bg: '#E7F1FC' },
  { key: 'preco',       label: 'Preço & ofertas', icon: 'Tag',           color: '#7C3AED', bg: '#F1E8FB' },
  { key: 'fidelizacao', label: 'Fidelização',     icon: 'Heart',         color: '#E8537A', bg: '#FCE7ED' },
  { key: 'datas',       label: 'Datas',           icon: 'Calendar',      color: '#E0922B', bg: '#FCEFD9' },
  { key: 'captacao',    label: 'Atrair clientes', icon: 'Megaphone',     color: '#0E9C8A', bg: '#E1F6F3' },
];

export const MARKETING_TIPS: MarketingTip[] = [
  {
    id: 'ig-template-story', category: 'instagram',
    title: 'Template de Story pronto no Canva',
    body: 'Não sabe como deixar o Story bonito? Use um modelo pronto: é só trocar a foto e o texto pelo seu doce e publicar. Toque no botão abaixo para abrir o template no Canva e personalizar em minutos.',
    link: { url: 'https://canva.link/0e147tvm3mph6ls', label: 'Abrir template de Story no Canva' },
  },
  {
    id: 'ig-template-story-oferta', category: 'instagram',
    title: 'Template de Story OFERTA pronto no Canva',
    body: 'Não sabe como deixar o Story bonito? Use um modelo pronto: é só trocar a foto e o texto pelo seu doce e publicar. Toque no botão abaixo para abrir o template no Canva e personalizar em minutos.',
    link: { url: 'https://canva.link/n8rnl24knb1gyyt', label: 'Abrir template de Story oferta no Canva' },
  },
  {
    id: 'ig-template-logo-loja', category: 'instagram',
    title: 'Logo editável para sua loja',
    body: 'Toque no botão abaixo para abrir o template no Canva e personalizar em minutos.',
    link: { url: 'https://canva.link/4iyz3dsd6ku103p', label: 'Abrir logo editável no Canva' },
  },
  {
    id: 'ig-constancia', category: 'instagram',
    title: 'Apareça com constância',
    body: 'O algoritmo premia quem posta com frequência. Defina uma rotina realista (ex.: 3 posts no feed por semana + Stories diários) e mantenha. Constância vale mais que perfeição — é melhor postar simples toda semana do que sumir por um mês.',
  },
  {
    id: 'ig-reels', category: 'instagram',
    title: 'Reels de "fazendo o doce" engajam mais',
    body: 'Vídeos curtos mostrando o passo a passo, o recheio escorrendo ou a montagem alcançam muito mais gente do que fotos paradas. Grave 15–30s, use uma música em alta e mostre o resultado final logo nos primeiros segundos.',
  },
  {
    id: 'ig-bastidores', category: 'instagram',
    title: 'Use os Stories para criar desejo',
    body: 'Mostre os bastidores: ingredientes chegando, a cozinha, o doce saindo do forno, o cliente recebendo. Isso gera conexão e confiança. Encerre com um convite claro: "Chama no direct para encomendar".',
  },
  {
    id: 'ig-bio', category: 'instagram',
    title: 'Bio e destaques que vendem',
    body: 'Sua bio deve dizer em 1 linha o que você faz e como pedir (link do WhatsApp). Organize os Destaques como um cardápio: "Sabores", "Preços", "Como encomendar", "Clientes felizes". Quem chega no seu perfil precisa saber comprar em 10 segundos.',
  },
  {
    id: 'wa-business', category: 'whatsapp',
    title: 'Use o WhatsApp Business com catálogo',
    body: 'O WhatsApp Business é gratuito e deixa você montar um catálogo com fotos e preços. O cliente navega e já escolhe sem você precisar repetir tudo. Configure também o horário de atendimento e a mensagem de saudação.',
  },
  {
    id: 'wa-rapidez', category: 'whatsapp',
    title: 'Responder rápido fecha mais venda',
    body: 'A maioria das vendas se perde por demora na resposta. Use as "respostas rápidas" do WhatsApp Business para mandar tabela de preços, sabores e prazos em segundos. Quanto mais ágil, maior a chance de fechar antes do cliente procurar outra confeiteira.',
  },
  {
    id: 'wa-transmissao', category: 'whatsapp',
    title: 'Lista de transmissão para novidades',
    body: 'Crie listas de transmissão para avisar clientes sobre novos sabores, promoções e abertura de agenda de datas comemorativas. Diferente do grupo, cada um recebe como mensagem individual — mais pessoal e sem incomodar.',
  },
  {
    id: 'foto-luz', category: 'fotos',
    title: 'Luz natural é seu melhor estúdio',
    body: 'Fotografe perto de uma janela, de dia, sem flash. A luz natural deixa o doce apetitoso e com cores reais. Evite luz amarela de lâmpada, que deixa a foto "suja". A foto é sua vitrine — vale mais que mil palavras.',
  },
  {
    id: 'foto-corte', category: 'fotos',
    title: 'Mostre o recheio',
    body: 'Foto de doce cortado, com o recheio aparecendo, desperta muito mais desejo. Brigadeiro mordido, bolo de pote em camadas, coxinha aberta. O cliente compra com os olhos — mostre a parte mais gostosa.',
  },
  {
    id: 'foto-fundo', category: 'fotos',
    title: 'Fundo limpo, foco no doce',
    body: 'Tire a bagunça do enquadramento. Um fundo neutro (mármore, madeira clara, um pano liso) faz o produto se destacar. Aproxime a câmera e deixe o doce ser a estrela.',
  },
  {
    id: 'preco-combo', category: 'preco',
    title: 'Combos aumentam o ticket médio',
    body: 'Em vez de vender 1 unidade, ofereça kits: "caixa com 6 sabores", "combo café da tarde", "kit festa com 50 docinhos". O cliente gasta mais por pedido e você ganha tempo produzindo em lote. Dê um pequeno desconto no combo para incentivar.',
  },
  {
    id: 'preco-degustacao', category: 'preco',
    title: 'Kit degustação para novos clientes',
    body: 'Um kit pequeno com vários sabores é a porta de entrada perfeita. O cliente experimenta tudo, descobre o favorito e volta para comprar a versão cheia. Custa pouco para você e converte indeciso em cliente fiel.',
  },
  {
    id: 'preco-ancoragem', category: 'preco',
    title: 'Ofereça 3 opções de tamanho',
    body: 'Quando você mostra P, M e G, a maioria escolhe o do meio — e você guia a venda. Ter uma opção "premium" mais cara também faz as outras parecerem mais acessíveis. Nunca ofereça só uma opção: dê ao cliente o poder de escolher para cima.',
  },
  {
    id: 'preco-entrega', category: 'preco',
    title: 'Deixe a taxa de entrega clara',
    body: 'Informe o valor da entrega antes de fechar, para não gerar atrito no fim. Ofereça frete grátis acima de um valor mínimo ("entrega grátis acima de R$ 60") — isso empurra o cliente a comprar mais para "compensar o frete".',
  },
  {
    id: 'fid-cartao', category: 'fidelizacao',
    title: 'Cartão fidelidade',
    body: 'A cada X compras, um brinde ou desconto. Simples e poderoso: dá motivo para o cliente voltar sempre em você e não na concorrência. Pode ser um cartãozinho carimbado ou um controle no caderninho mesmo.',
  },
  {
    id: 'fid-posvenda', category: 'fidelizacao',
    title: 'Pós-venda que encanta',
    body: 'No dia seguinte à entrega, mande uma mensagem: "Oi! Que bom que escolheu meus doces 💛 Deu tudo certo na festa?". Esse cuidado faz o cliente lembrar de você e indicar. Custa 30 segundos e vale muitas recompras.',
  },
  {
    id: 'fid-brinde', category: 'fidelizacao',
    title: 'Brinde surpresa no pedido',
    body: 'Inclua um docinho extra ou um bilhete escrito à mão de vez em quando. A surpresa gera foto, story marcando você e propaganda gratuita. Pequenos mimos criam clientes apaixonados.',
  },
  {
    id: 'data-calendario', category: 'datas',
    title: 'Planeje o calendário do ano',
    body: 'Páscoa, Dia das Mães, Namorados, Festa Junina, Dia das Crianças e Natal são picos de venda. Marque no calendário e prepare cardápio, fotos e divulgação com antecedência. Quem se antecipa pega as melhores encomendas.',
  },
  {
    id: 'data-agenda', category: 'datas',
    title: 'Abra a agenda com antecedência',
    body: 'Anuncie "Agenda de Páscoa aberta!" semanas antes e crie urgência: "Vagas limitadas". Ofereça desconto para quem encomenda cedo. Isso organiza sua produção e garante caixa antes da data.',
  },
  {
    id: 'data-kits', category: 'datas',
    title: 'Kits temáticos da data',
    body: 'Monte kits exclusivos para cada ocasião: "Caixa Dia das Mães", "Cesta de Páscoa", "Box romântico". Embalagem temática justifica preço maior e vira presente pronto — o cliente compra a experiência, não só o doce.',
  },
  {
    id: 'cap-indicacao', category: 'captacao',
    title: 'Peça indicação (e recompense)',
    body: 'Cliente satisfeito indica se você pedir. Ofereça um benefício: "Indique uma amiga e ganhe 10% no próximo pedido". O boca a boca é a propaganda mais barata e que mais converte na confeitaria.',
  },
  {
    id: 'cap-parcerias', category: 'captacao',
    title: 'Parcerias locais',
    body: 'Cafés, floriculturas, salões e papelarias atendem o mesmo público que você. Proponha deixar seus doces à venda ou trocar indicação. Uma parceria boa coloca seu produto na frente de clientes novos sem gastar com anúncio.',
  },
  {
    id: 'cap-amostra', category: 'captacao',
    title: 'Amostras para quem tem alcance',
    body: 'Envie um kit cortesia para uma microinfluenciadora ou pessoa querida do seu bairro. Um story marcando você pode trazer dezenas de pedidos. Escolha quem fala com o seu público local, não precisa ser alguém famoso.',
  },
  {
    id: 'cap-depoimentos', category: 'captacao',
    title: 'Colecione e mostre depoimentos',
    body: 'Print de elogio no WhatsApp, foto do cliente com o doce, comentário feliz — guarde tudo e poste nos Stories e Destaques. Prova social vence a desconfiança de quem ainda não comprou de você.',
  },
];
