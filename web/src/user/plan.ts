import { PlanTier } from './userApi';
import i18n from '../i18n';

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
  purchases: 'master',
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
    // Getter: traduz no momento do uso (idioma pode mudar depois do carregamento).
    get features() { return i18n.t('account:plan.premium.features', { returnObjects: true }) as string[]; },
  },
  master: {
    key: 'master',
    label: 'Master',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    get features() { return i18n.t('account:plan.master.features', { returnObjects: true }) as string[]; },
  },
};
