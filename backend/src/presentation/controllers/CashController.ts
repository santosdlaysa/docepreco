import { Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { AuthRequest } from '../middleware/authMiddleware';

/** Monta o resumo financeiro de uma sessão de caixa (vendas + movimentos). */
async function buildSessionSummary(row: Record<string, any>, includeSales: boolean) {
  const sessionId = row.id as string;

  const salesRes = await pool.query(
    `SELECT s.id, s.quantity_sold, s.total_revenue, s.payment_method, s.created_at,
            r.name AS recipe_name
       FROM sales s
       LEFT JOIN recipes r ON r.id = s.recipe_id
      WHERE s.session_id = $1
      ORDER BY s.created_at DESC`,
    [sessionId]
  );

  const byMethod: Record<string, number> = { dinheiro: 0, cartao: 0, pix: 0, outros: 0 };
  let salesTotal = 0;
  for (const s of salesRes.rows) {
    const v = parseFloat(s.total_revenue);
    salesTotal += v;
    const m = (s.payment_method as string) || 'outros';
    byMethod[m] = (byMethod[m] || 0) + v;
  }

  const movRes = await pool.query(
    `SELECT id, type, amount, reason, created_at FROM cash_movements WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );
  let sangriaTotal = 0;
  let suprimentoTotal = 0;
  const movements = movRes.rows.map(m => {
    const amount = parseFloat(m.amount);
    if (m.type === 'sangria') sangriaTotal += amount;
    else if (m.type === 'suprimento') suprimentoTotal += amount;
    return { id: m.id, type: m.type, amount, reason: m.reason, createdAt: m.created_at };
  });

  const openingAmount = parseFloat(row.opening_amount);
  // Esperado em dinheiro = abertura + vendas em dinheiro + suprimentos - sangrias
  const expectedCash = openingAmount + byMethod.dinheiro + suprimentoTotal - sangriaTotal;
  const closingCounted = row.closing_counted != null ? parseFloat(row.closing_counted) : null;
  const difference = closingCounted != null ? closingCounted - expectedCash : null;

  return {
    id: sessionId,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    openingAmount,
    closingCounted,
    notes: row.notes,
    salesTotal,
    salesCount: salesRes.rows.length,
    byMethod,
    sangriaTotal,
    suprimentoTotal,
    expectedCash,
    difference,
    movements,
    sales: includeSales
      ? salesRes.rows.map(s => ({
          id: s.id,
          recipeName: s.recipe_name ?? 'Receita removida',
          quantitySold: Number(s.quantity_sold),
          totalRevenue: parseFloat(s.total_revenue),
          paymentMethod: s.payment_method,
          createdAt: s.created_at,
        }))
      : undefined,
  };
}

async function findOpenSession(userId: string) {
  const res = await pool.query(
    `SELECT * FROM cash_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1`,
    [userId]
  );
  return res.rows[0] ?? null;
}

export class CashController {
  /** GET /api/cash/current — sessão aberta (com resumo e vendas) ou null. */
  async current(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    try {
      const open = await findOpenSession(userId);
      if (!open) { res.json({ success: true, data: null }); return; }
      const summary = await buildSessionSummary(open, true);
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('[Cash] current error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /** POST /api/cash/open — abre um caixa. Body: { openingAmount?, notes? } */
  async open(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const { openingAmount, notes } = req.body as { openingAmount?: number; notes?: string };
    try {
      const existing = await findOpenSession(userId);
      if (existing) { res.status(400).json({ success: false, error: 'Já existe um caixa aberto.' }); return; }
      const result = await pool.query(
        `INSERT INTO cash_sessions (user_id, opening_amount, notes) VALUES ($1, $2, $3) RETURNING *`,
        [userId, Number(openingAmount) || 0, notes || null]
      );
      const summary = await buildSessionSummary(result.rows[0], true);
      res.status(201).json({ success: true, data: summary });
    } catch (error) {
      console.error('[Cash] open error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /** POST /api/cash/close — fecha o caixa aberto. Body: { countedAmount?, notes? } */
  async close(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const { countedAmount, notes } = req.body as { countedAmount?: number; notes?: string };
    try {
      const open = await findOpenSession(userId);
      if (!open) { res.status(400).json({ success: false, error: 'Nenhum caixa aberto.' }); return; }
      const result = await pool.query(
        `UPDATE cash_sessions
            SET status = 'closed', closed_at = NOW(), closing_counted = $2,
                notes = COALESCE($3, notes)
          WHERE id = $1
          RETURNING *`,
        [open.id, countedAmount != null ? Number(countedAmount) : null, notes ?? null]
      );
      const summary = await buildSessionSummary(result.rows[0], true);
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('[Cash] close error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /** POST /api/cash/movements — sangria/suprimento. Body: { type, amount, reason? } */
  async addMovement(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const { type, amount, reason } = req.body as { type?: string; amount?: number; reason?: string };
    if (type !== 'sangria' && type !== 'suprimento') {
      res.status(400).json({ success: false, error: 'type deve ser sangria ou suprimento.' }); return;
    }
    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ success: false, error: 'Informe um valor válido.' }); return;
    }
    try {
      const open = await findOpenSession(userId);
      if (!open) { res.status(400).json({ success: false, error: 'Nenhum caixa aberto.' }); return; }
      await pool.query(
        `INSERT INTO cash_movements (session_id, user_id, type, amount, reason) VALUES ($1, $2, $3, $4, $5)`,
        [open.id, userId, type, Number(amount), reason || null]
      );
      const summary = await buildSessionSummary(open, true);
      res.status(201).json({ success: true, data: summary });
    } catch (error) {
      console.error('[Cash] movement error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /** GET /api/cash/sessions — histórico de caixas (mais recentes primeiro). */
  async listSessions(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    try {
      const result = await pool.query(
        `SELECT * FROM cash_sessions WHERE user_id = $1 ORDER BY opened_at DESC LIMIT 60`,
        [userId]
      );
      const data = await Promise.all(result.rows.map(r => buildSessionSummary(r, false)));
      res.json({ success: true, data });
    } catch (error) {
      console.error('[Cash] list error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }
}
