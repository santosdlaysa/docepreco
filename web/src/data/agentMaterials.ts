import dailyMaterials from './agentDailyMaterials.json';
import materials from './agentMaterials.json';
import notificationTemplates from './agentNotificationTemplates.json';
import generatedImages from './agentGeneratedImages.json';

export interface NotificationDraft {
  title: string;
  body: string;
  target: string;
  eligibility?: string;
  requiresIndividualTargeting?: boolean;
  recipients?: Array<{ id: string; companyName: string; email: string; isActive: boolean }>;
}

export interface AgentMaterial {
  id: string;
  area: string;
  title: string;
  text: string;
  audience?: string;
  action?: string;
  category?: string;
  imageUrl?: string;
  imageAlt?: string;
  caption?: string;
  notification?: NotificationDraft;
}

// Curated templates only. Never include account data or financial snapshots here:
// frontend assets can be downloaded independently of the admin login.
const images: Record<string, string> = generatedImages;
const appImages = [
  { id: 'inicio', title: 'Visão geral', file: 'mobile-screen-2.jpg' },
  { id: 'receitas', title: 'Receitas', file: 'mobile-screen-3.jpg' },
  { id: 'ingredientes', title: 'Ingredientes', file: 'mobile-screen-4.jpg' },
  { id: 'vendas', title: 'Vendas', file: 'mobile-screen-5.jpg' },
  { id: 'relatorios', title: 'Relatórios', file: 'mobile-screen-1.jpg' },
  { id: 'loja', title: 'Loja online', file: 'mobile-screen-loja.jpg' },
  { id: 'cardapio', title: 'Cardápio', file: 'mobile-screen-cardapio.jpg' },
];
const pushTitles: Record<string, string> = {
  'copy-N1': 'Comece por uma receita',
  'copy-N2': 'Precisa de ajuda?',
  'copy-N3': 'Confira seus custos',
};
const individualTemplates = new Set([
  'notif-novo-pedido', 'notif-estoque-baixo', 'notif-resumo-vendas',
  'notif-vencimento-proximo', 'notif-falha-renovacao',
]);

export const agentMaterials: AgentMaterial[] = [
  ...dailyMaterials,
  ...materials.map((item): AgentMaterial => {
    const isPush = item.id.startsWith('copy-N');
    const category = item.area === 'Conteúdo' ? 'Conteúdos para redes sociais'
      : isPush ? 'Notificações' : item.area === 'Copy' ? 'WhatsApp'
      : item.area === 'Marketing' ? 'Campanhas' : item.area;
    return {
      ...item,
      title: pushTitles[item.id] ?? item.title,
      category,
      ...(item.area === 'Conteúdo' ? {
        caption: item.id === 'conteudo-C4' ? "Acréscimo e margem usam bases diferentes. Com custo de R$ 10, acrescentar 50% resulta em preço de R$ 15. A diferença de R$ 5 representa aproximadamente 33,33% do preço de venda. Essa conta considera os custos informados e não garante lucro líquido. Confira também despesas e taxas aplicáveis antes de definir seu preço." : item.text.match(/(?:^|\s)Legenda(?:\/apoio)?:\s*([\s\S]*?)(?:\nVisual:|\nAção:|$)/)?.[1].trim(),
      } : {}),
      ...(images[item.id] ? {
        imageUrl: `/agent-materials/${images[item.id]}`,
        imageAlt: `Arte do DocePreço: ${item.title}`,
      } : {}),
      ...(isPush ? {
        notification: {
          title: pushTitles[item.id] ?? item.title,
          body: item.text,
          target: 'free',
          eligibility: `${item.audience ?? ''} Conferir a condição individual; o grupo Gratuito não filtra criação de receita.`,
        },
      } : {}),
    };
  }),
  ...notificationTemplates.map(item => ({
    id: item.id,
    area: 'Copy',
    category: 'Notificações',
    title: item.title,
    text: item.body,
    audience: item.eligibility,
    action: item.action,
    notification: { title: item.title, body: item.body, target: item.target, eligibility: item.eligibility, requiresIndividualTargeting: individualTemplates.has(item.id) },
  })),
  ...appImages.map(item => ({
    id: `imagem-${item.id}`,
    area: 'Conteúdo',
    category: 'Imagens do aplicativo',
    title: `Tela real: ${item.title}`,
    text: `Conheça ${item.title.toLocaleLowerCase('pt-BR')} no DocePreço. Organize sua rotina de confeitaria com as informações do seu negócio.`,
    action: 'Captura real já utilizada no site. Confira a versão atual antes de divulgar; valores da demonstração não são promessa de resultado.',
    imageUrl: `/${item.file}`,
    imageAlt: `Captura real da tela ${item.title} do DocePreço`,
  })),
];
