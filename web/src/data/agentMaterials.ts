import materials from './agentMaterials.json';
import notificationTemplates from './agentNotificationTemplates.json';

export interface NotificationDraft {
  title: string;
  body: string;
  target: string;
  eligibility?: string;
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
  notification?: NotificationDraft;
}

// Curated templates only. Never include account data or financial snapshots here:
// frontend assets can be downloaded independently of the admin login.
const images: Record<string, string> = {
  'conteudo-C1': 'C1-custo-ingredientes.png',
  'conteudo-C2': 'C2-rendimento.png',
  'conteudo-C3': 'C3-custos-adicionais.png',
  'conteudo-C4': 'C4-margem.png',
  'conteudo-C5': 'C5-atualizacao-valores.png',
  'conteudo-C6': 'C6-organizacao-vendas.png',
  'conteudo-C7': 'C7-rotina-app.png',
};
const pushTitles: Record<string, string> = {
  'copy-N1': 'Comece por uma receita',
  'copy-N2': 'Precisa de ajuda?',
  'copy-N3': 'Confira seus custos',
};

export const agentMaterials: AgentMaterial[] = [
  ...materials.map((item): AgentMaterial => {
    const isPush = item.id.startsWith('copy-N');
    const category = item.area === 'Conteúdo' ? 'Conteúdos para redes sociais'
      : isPush ? 'Notificações' : item.area === 'Copy' ? 'WhatsApp'
      : item.area === 'Marketing' ? 'Campanhas' : item.area;
    return {
      ...item,
      title: pushTitles[item.id] ?? item.title,
      category,
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
    notification: { title: item.title, body: item.body, target: item.target, eligibility: item.eligibility },
  })),
];
