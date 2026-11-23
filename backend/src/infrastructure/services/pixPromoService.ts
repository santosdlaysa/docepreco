import { pool } from '../database/connection';

/**
 * Promoção PIX global (ex.: Black Friday): desconto automático no PIX avulso de
 * assinatura para TODOS os usuários, dentro de uma janela de datas. Configurada
 * pelo painel admin e guardada em app_settings('pix_promo').
 */
export interface PixPromo {
  enabled: boolean;
  discountPercent: number;
  title: string;
  startsAt: string | null; // ISO
  endsAt: string | null; // ISO
}

export const PIX_PROMO_KEY = 'pix_promo';

export const DEFAULT_PIX_PROMO: PixPromo = {
  enabled: false,
  discountPercent: 10,
  title: 'Black Friday',
  startsAt: null,
  endsAt: null,
};

export async function getPixPromoConfig(): Promise<PixPromo> {
  const result = await pool.query(`SELECT value FROM app_settings WHERE key = $1`, [PIX_PROMO_KEY]);
  if (result.rows.length === 0) return DEFAULT_PIX_PROMO;
  try {
    const parsed = JSON.parse(result.rows[0].value) as Partial<PixPromo>;
    return {
      enabled: parsed.enabled === true,
      discountPercent: Number.isInteger(parsed.discountPercent) ? parsed.discountPercent! : DEFAULT_PIX_PROMO.discountPercent,
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : DEFAULT_PIX_PROMO.title,
      startsAt: parsed.startsAt ?? null,
      endsAt: parsed.endsAt ?? null,
    };
  } catch {
    return DEFAULT_PIX_PROMO;
  }
}

export function isPromoLive(promo: PixPromo, now = new Date()): boolean {
  if (!promo.enabled || promo.discountPercent < 1) return false;
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now.getTime()) return false;
  if (promo.endsAt && new Date(promo.endsAt).getTime() <= now.getTime()) return false;
  return true;
}

/** Promoção vigente agora (ou null). */
export async function getLivePixPromo(): Promise<PixPromo | null> {
  const promo = await getPixPromoConfig();
  return isPromoLive(promo) ? promo : null;
}

export function validatePixPromo(input: unknown): { promo?: PixPromo; error?: string } {
  const body = (input ?? {}) as Partial<PixPromo>;
  if (typeof body.enabled !== 'boolean') return { error: 'enabled deve ser booleano' };
  if (!Number.isInteger(body.discountPercent) || body.discountPercent! < 1 || body.discountPercent! > 90) {
    return { error: 'discountPercent deve ser um inteiro entre 1 e 90' };
  }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 40) : '';
  if (!title) return { error: 'Informe o nome da campanha' };
  const parseDate = (v: unknown): string | null | 'invalid' => {
    if (v === null || v === undefined || v === '') return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? 'invalid' : d.toISOString();
  };
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if (startsAt === 'invalid' || endsAt === 'invalid') return { error: 'Datas inválidas' };
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return { error: 'A data de término deve ser depois do início' };
  }
  return { promo: { enabled: body.enabled, discountPercent: body.discountPercent!, title, startsAt, endsAt } };
}

export async function savePixPromo(promo: PixPromo): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [PIX_PROMO_KEY, JSON.stringify(promo)]
  );
}
