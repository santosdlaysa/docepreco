import { PlanTier } from './userApi';

/**
 * Requisito de plano por página do app do confeiteiro. Espelha os guards do
 * mobile (guardMaster / guardScreen):
 *  - Master: Loja, Financeiro, Estoque, Dicas de vendas.
 *  - Premium: Clientes, Encomendas, Temporadas.
 *  - Livre (não listado): Caixa, Painel (relatórios), Receitas, Ingredientes,
 *    Vendas, Produção, Perfil.
 *
 * Obs.: o Painel (reports) fica livre de propósito — é o dashboard inicial;
 * bloqueá-lo jogaria o usuário Free direto num paywall ao entrar.
 */
export const PAGE_REQUIREMENT: Record<string, Exclude<PlanTier, 'free'>> = {
  store: 'master',
  finance: 'master',
  stock: 'master',
  tips: 'master',
  clients: 'premium',
  orders: 'premium',
  seasons: 'premium',
};

const TIER_RANK: Record<PlanTier, number> = { free: 0, premium: 1, master: 2 };

/** O tier atende ao requisito? (master satisfaz premium; premium satisfaz free.) */
export function tierSatisfies(tier: PlanTier, required: PlanTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[required];
}

export interface TierMeta {
  key: Exclude<PlanTier, 'free'>;
  label: string;
  /** Classes de cor do cadeado/realce. */
  color: string;
  bg: string;
  /** O que o plano desbloqueia (para o paywall). */
  features: string[];
}

export const TIER_META: Record<Exclude<PlanTier, 'free'>, TierMeta> = {
  premium: {
    key: 'premium',
    label: 'Premium',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    features: [
      'Relatórios avançados do negócio',
      'Gestão de clientes e aniversários',
      'Encomendas com agenda e status',
      'Precificação por temporada (Páscoa, Natal…)',
      'Histórico de preços de ingredientes',
      'Receitas ilimitadas e PDF com sua marca',
    ],
  },
  master: {
    key: 'master',
    label: 'Master',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    features: [
      'Tudo do Premium, e mais:',
      'Loja online com link para clientes',
      'Gestão financeira completa (DRE)',
      'Controle de estoque com baixa automática',
      'Dicas de vendas e precificação',
    ],
  },
};
