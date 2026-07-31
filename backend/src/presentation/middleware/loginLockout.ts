import { Request, Response, NextFunction } from 'express';

/**
 * Bloqueio de login POR CONTA (e-mail), complementar ao rate limit por IP.
 *
 * Motivação: o limite por IP (rateLimiter.ts) não protege contra brute force
 * direcionado a uma conta específica quando o atacante troca de IP — caso
 * clássico de quem vem atrás de um proxy compartilhado (ex.: proxy da Google /
 * Data Saver, VPNs) ou rotaciona IPs. Aqui o freio é na conta-alvo: após
 * MAX_FAILS senhas erradas seguidas no mesmo e-mail, novas tentativas são
 * recusadas por LOCK_MS, independente do IP de origem.
 *
 * Estado em memória (Map): simples, sem dependência nova. Se o processo
 * reiniciar (deploy/restart do Render), os contadores zeram — aceitável, pois
 * a janela de bloqueio é curta e o objetivo é frear rajadas, não bloquear para
 * sempre. Para persistência entre reinícios, migrar para Postgres/Redis.
 */

const MAX_FAILS = 5; // senhas erradas seguidas antes de travar a conta
const LOCK_MS = 15 * 60 * 1000; // duração do bloqueio
const FAIL_WINDOW_MS = 15 * 60 * 1000; // falhas mais antigas que isso são esquecidas
const MAX_ENTRIES = 50_000; // teto de segurança contra crescimento do Map

export const LOCK_MINUTES = LOCK_MS / 60000;

interface Entry {
  fails: number;
  firstFailAt: number;
  lockedUntil: number;
}

const attempts = new Map<string, Entry>();

/** Normaliza a chave para casar com o lookup de e-mail do login (case-insensitive). */
function keyOf(email: string): string {
  return String(email).trim().toLowerCase();
}

/** Remove entradas expiradas — chamado de forma oportunista para conter memória. */
function prune(now: number): void {
  for (const [k, e] of attempts) {
    const expired = e.lockedUntil <= now && now - e.firstFailAt > FAIL_WINDOW_MS;
    if (expired) attempts.delete(k);
  }
}

/** Milissegundos restantes de bloqueio para o e-mail, ou 0 se não estiver bloqueado. */
export function lockRemainingMs(email: string, now = Date.now()): number {
  const e = attempts.get(keyOf(email));
  if (!e) return 0;
  return e.lockedUntil > now ? e.lockedUntil - now : 0;
}

/**
 * Registra uma falha de login. Retorna se a conta ficou bloqueada agora
 * (`justLocked`) — usado para disparar o alerta uma única vez na transição.
 */
export function recordLoginFailure(email: string, now = Date.now()): { locked: boolean; justLocked: boolean; fails: number } {
  const key = keyOf(email);
  if (attempts.size > MAX_ENTRIES) prune(now);

  let e = attempts.get(key);
  // Reinicia a contagem se a última falha foi há muito tempo (janela expirada)
  // e a conta não está em bloqueio ativo.
  if (!e || (e.lockedUntil <= now && now - e.firstFailAt > FAIL_WINDOW_MS)) {
    e = { fails: 0, firstFailAt: now, lockedUntil: 0 };
    attempts.set(key, e);
  }

  const wasLocked = e.lockedUntil > now;
  e.fails += 1;

  let justLocked = false;
  if (!wasLocked && e.fails >= MAX_FAILS) {
    e.lockedUntil = now + LOCK_MS;
    justLocked = true;
  }

  return { locked: e.lockedUntil > now, justLocked, fails: e.fails };
}

/** Zera o contador de falhas após um login bem-sucedido. */
export function resetLoginFailures(email: string): void {
  attempts.delete(keyOf(email));
}

/**
 * Middleware para o POST /login: barra a requisição antes de tocar no banco se
 * a conta estiver em bloqueio. Responde 429 com Retry-After.
 */
export function loginLockout(req: Request, res: Response, next: NextFunction): void {
  const email = req.body?.email;
  if (!email) {
    next();
    return;
  }
  const remaining = lockRemainingMs(email);
  if (remaining > 0) {
    const minutes = Math.ceil(remaining / 60000);
    res.setHeader('Retry-After', String(Math.ceil(remaining / 1000)));
    res.status(429).json({
      success: false,
      error: `Muitas tentativas com senha incorreta. Esta conta foi temporariamente bloqueada. Tente novamente em ${minutes} min ou redefina sua senha.`,
    });
    return;
  }
  next();
}
