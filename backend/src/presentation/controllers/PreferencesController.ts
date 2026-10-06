import { Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * Preferências da confeiteira que antes ficavam só no aparelho/navegador
 * (moeda, sistema de unidades, idioma e personalização do PDF do orçamento).
 * Guardadas na conta para web e app ficarem iguais.
 *   GET /api/auth/preferences  → objeto (vazio se nunca salvou)
 *   PUT /api/auth/preferences  → mescla os campos enviados (parcial)
 */
const CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'NZD', 'ARS', 'CLP', 'COP', 'MXN'];
const MAX_LOGO_CHARS = 700_000; // ~500 KB de imagem em base64

export interface UserPreferences {
  currency?: string;
  unitSystem?: 'metric' | 'imperial';
  lang?: 'pt' | 'en';
  pdf?: { brandColor?: string; companySlogan?: string; hideWatermark?: boolean; logoBase64?: string | null };
}

/** Mantém só campos conhecidos e válidos; o resto é descartado. */
export function sanitizePreferences(input: unknown): UserPreferences {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out: UserPreferences = {};
  if (typeof b.currency === 'string' && CURRENCIES.includes(b.currency)) out.currency = b.currency;
  if (b.unitSystem === 'metric' || b.unitSystem === 'imperial') out.unitSystem = b.unitSystem;
  if (b.lang === 'pt' || b.lang === 'en') out.lang = b.lang;
  if (b.pdf && typeof b.pdf === 'object') {
    const p = b.pdf as Record<string, unknown>;
    const pdf: NonNullable<UserPreferences['pdf']> = {};
    if (typeof p.brandColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(p.brandColor)) pdf.brandColor = p.brandColor;
    if (typeof p.companySlogan === 'string') pdf.companySlogan = p.companySlogan.slice(0, 120);
    if (typeof p.hideWatermark === 'boolean') pdf.hideWatermark = p.hideWatermark;
    if (p.logoBase64 === null || p.logoBase64 === '') pdf.logoBase64 = null;
    else if (typeof p.logoBase64 === 'string' && p.logoBase64.length <= MAX_LOGO_CHARS
      && /^(data:image\/(png|jpe?g|webp);base64,)?[A-Za-z0-9+/=\s]+$/.test(p.logoBase64)) pdf.logoBase64 = p.logoBase64;
    if (Object.keys(pdf).length) out.pdf = pdf;
  }
  return out;
}

export class PreferencesController {
  async get(req: AuthRequest, res: Response): Promise<void> {
    try {
      const r = await pool.query(`SELECT preferences FROM users WHERE id = $1`, [req.userId]);
      res.json({ success: true, data: r.rows[0]?.preferences ?? {} });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao carregar preferências' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patch = sanitizePreferences(req.body);
      const cur = await pool.query(`SELECT preferences FROM users WHERE id = $1`, [req.userId]);
      if (cur.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }
      const prev = (cur.rows[0].preferences ?? {}) as UserPreferences;
      const next: UserPreferences = { ...prev, ...patch, ...(patch.pdf ? { pdf: { ...prev.pdf, ...patch.pdf } } : {}) };
      const r = await pool.query(`UPDATE users SET preferences = $2 WHERE id = $1 RETURNING preferences`, [req.userId, JSON.stringify(next)]);
      res.json({ success: true, data: r.rows[0].preferences });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao salvar preferências' });
    }
  }
}
