import { Request, Response } from 'express';
import { PostgresCouponRepository } from '../../infrastructure/repositories/PostgresCouponRepository';

const repo = new PostgresCouponRepository();

export class CouponController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findAll() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar cupons' });
    }
  }

  async validate(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const coupon = await repo.findByCode(code.toUpperCase());
      if (!coupon || !coupon.isActive) {
        res.status(404).json({ success: false, error: 'Cupom não encontrado ou inativo' });
        return;
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
        res.status(400).json({ success: false, error: 'Cupom expirado' });
        return;
      }
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
        res.status(400).json({ success: false, error: 'Cupom esgotado' });
        return;
      }
      res.json({ success: true, data: { discountPercent: coupon.discountPercent } });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao validar cupom' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { code, discountPercent, maxUses, expiresAt, isActive } = req.body;
      if (!code || !discountPercent) { res.status(400).json({ success: false, error: 'code e discountPercent são obrigatórios' }); return; }
      const item = await repo.create({ code: code.toUpperCase(), discountPercent, maxUses: maxUses ?? 0, expiresAt, isActive: isActive ?? true });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar cupom' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const item = await repo.update(req.params.id, req.body);
      if (!item) { res.status(404).json({ success: false, error: 'Cupom não encontrado' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar cupom' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id);
      if (!deleted) { res.status(404).json({ success: false, error: 'Cupom não encontrado' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir cupom' });
    }
  }
}
