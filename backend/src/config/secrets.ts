import crypto from 'crypto';

/**
 * Segredos e validação de ambiente.
 *
 * IMPORTANTE: leia sempre via funções (lazy). Os módulos de rota/middleware são
 * importados ANTES de `dotenv.config()` rodar em server.ts, então ler
 * `process.env` no topo do módulo pega só as variáveis reais do ambiente
 * (ex.: Render) e não as do arquivo `.env`. Lendo dentro da função, o valor já
 * está disponível no momento da requisição.
 */

/** JWT secret. SEM fallback — lança se ausente (fail-fast). */
export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.trim() === '') {
    throw new Error(
      '[config] JWT_SECRET não configurado. Defina a variável de ambiente antes de iniciar o servidor.'
    );
  }
  return s;
}

/**
 * Comparação de strings em tempo constante (evita timing attacks na checagem de
 * segredos). Retorna false se algum valor for ausente.
 */
export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Valida no boot que os segredos obrigatórios existem. Encerra o processo com
 * mensagem clara se algo faltar — melhor falhar no start do que rodar inseguro.
 */
export function assertRequiredSecrets(): void {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter((k) => !process.env[k] || process.env[k]!.trim() === '');
  if (missing.length > 0) {
    console.error(
      `[config] Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}. ` +
        'Configure-as antes de iniciar o servidor.'
    );
    process.exit(1);
  }
}
