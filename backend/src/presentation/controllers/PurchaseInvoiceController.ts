import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresPurchaseInvoiceRepository } from '../../infrastructure/repositories/PostgresPurchaseInvoiceRepository';

const repo = new PostgresPurchaseInvoiceRepository();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_UNITS = new Set(['g', 'kg', 'ml', 'l', 'unit', 'oz', 'lb', 'fl_oz', 'cup', 'tbsp', 'tsp']);

export class PurchaseInvoiceController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const month = typeof req.query.month === 'string' ? req.query.month : undefined;
      res.json({ success: true, data: await repo.findAll(req.userId!, month) });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao carregar compras' });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const invoice = await repo.findById(req.params.id, req.userId!);
      if (!invoice) {
        res.status(404).json({ success: false, error: 'Nota de compra não encontrada' });
        return;
      }
      res.json({ success: true, data: invoice });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao carregar a compra' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { supplier, documentNumber, purchaseDate, paymentMethod, paymentStatus = 'paid',
        discount = 0, freight = 0, notes, attachmentUrl, items } = req.body ?? {};
      if (!String(supplier ?? '').trim()) return void res.status(400).json({ success: false, error: 'Informe o fornecedor' });
      if (!DATE_RE.test(String(purchaseDate ?? ''))) return void res.status(400).json({ success: false, error: 'Data da compra inválida' });
      if (!['paid', 'pending'].includes(paymentStatus)) return void res.status(400).json({ success: false, error: 'Situação de pagamento inválida' });
      if (!Array.isArray(items) || items.length === 0) return void res.status(400).json({ success: false, error: 'Inclua pelo menos um item' });
      if (!Number.isFinite(Number(discount)) || !Number.isFinite(Number(freight)) || Number(discount) < 0 || Number(freight) < 0) return void res.status(400).json({ success: false, error: 'Desconto e frete devem ser valores válidos' });
      for (const item of items) {
        if (!item.ingredientId || !Number.isFinite(Number(item.quantity)) || !Number.isFinite(Number(item.total)) || Number(item.quantity) <= 0 || Number(item.total) <= 0 || !VALID_UNITS.has(item.unit)) {
          return void res.status(400).json({ success: false, error: 'Preencha ingrediente, quantidade, unidade e valor de todos os itens' });
        }
      }
      const invoice = await repo.create(req.userId!, {
        supplier, documentNumber, purchaseDate, paymentMethod, paymentStatus,
        discount: Number(discount), freight: Number(freight), notes, attachmentUrl,
        items: items.map((item: any) => ({ ...item, quantity: Number(item.quantity), total: Number(item.total) })),
      });
      res.status(201).json({ success: true, data: invoice });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.locals.errorMessage = message;
      const validationError = message.includes('não pertencem') || message.includes('unidade de') || message.includes('não pode ser negativo');
      res.status(validationError ? 400 : 500).json({ success: false, error: validationError ? message : 'Erro ao registrar a compra' });
    }
  }
}
