import rateLimit from 'express-rate-limit';

/**
 * Rate limiting para endpoints sensíveis de autenticação, mitigando brute force
 * de senha e do código de reset (6 dígitos). Chave por IP.
 *
 * Render fica atrás de proxy, então o app deve ter `trust proxy` habilitado para
 * que o IP real (x-forwarded-for) seja usado — ver server.ts.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 tentativas por IP por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

/** Limite mais apertado para validação do código de reset (espaço de 1 milhão). */
export const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

/** Limite leve para a listagem pública de lojas (vitrine) — evita scraping em massa, sem afetar uso normal. */
export const publicListLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisições. Tente novamente em instantes.' },
});

/**
 * Criação de pedido público (sem login) — evita spam de pedidos falsos e o
 * disparo em massa de push notifications para o lojista. Um cliente real
 * dificilmente faz mais de alguns pedidos em poucos minutos.
 */
export const publicOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitos pedidos em sequência. Aguarde alguns minutos e tente novamente.' },
});
