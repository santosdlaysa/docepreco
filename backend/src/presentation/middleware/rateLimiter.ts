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
