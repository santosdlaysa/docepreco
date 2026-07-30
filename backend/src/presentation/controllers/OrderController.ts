import { Request, Response } from 'express';
import { PostgresOrderRepository, Order } from '../../infrastructure/repositories/PostgresOrderRepository';
import { registerSalesForDeliveredOrder, removeSalesForOrder } from '../../application/services/OrderSaleAutomation';
import { normalizeDateToISO } from '../../domain/utils/date';

const repo = new PostgresOrderRepository();
const ORDER_STATUSES = new Set(['pending', 'in_progress', 'done', 'delivered', 'cancelled']);

function hasInvalidStatus(body: Record<string, unknown>): boolean {
  return body.status !== undefined &&
    (typeof body.status !== 'string' || !ORDER_STATUSES.has(body.status));
}

/**
 * Integração encomendas → vendas. Quando o status muda nesta requisição:
 * entregue registra a venda automaticamente; qualquer outro status desfaz
 * a venda gerada (só existe venda vinculada se a encomenda foi entregue).
 * Falha aqui não bloqueia a atualização da encomenda.
 */
async function syncSaleForStatusChange(order: Order, requestedStatus: unknown): Promise<boolean> {
  if (typeof requestedStatus !== 'string') return false;
  try {
    if (requestedStatus === 'delivered' && order.status === 'delivered') {
      return await registerSalesForDeliveredOrder(order);
    }
    if (requestedStatus !== 'delivered') {
      await removeSalesForOrder(order.id, order.userId);
    }
  } catch (error) {
    console.error('Falha ao sincronizar venda da encomenda', order.id, error);
  }
  return false;
}

export class OrderController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const orders = await repo.findAll(userId);
      res.json({ success: true, data: orders });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao buscar encomendas' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const order = await repo.findById(req.params.id, userId);
      if (!order) {
        res.status(404).json({ success: false, message: 'Encomenda não encontrada' });
        return;
      }
      res.json({ success: true, data: order });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao buscar encomenda' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const b = req.body ?? {};
      if (!b.clientName || !b.recipeName || !b.deliveryDate) {
        res.status(400).json({ success: false, message: 'Dados inválidos' });
        return;
      }
      if (hasInvalidStatus(b)) {
        res.status(400).json({ success: false, message: 'Status inválido' });
        return;
      }
      // Normaliza a data de entrega (aceita dd/mm/aaaa além de ISO) e rejeita
      // datas inexistentes como 31/06 — o insert cru quebrava com
      // "date/time field value out of range".
      const deliveryDate = normalizeDateToISO(b.deliveryDate);
      if (!deliveryDate) {
        res.status(400).json({ success: false, message: 'Data de entrega inválida. Use o formato dd/mm/aaaa.' });
        return;
      }
      const order = await repo.create(userId, { ...b, deliveryDate });
      const saleRegistered = await syncSaleForStatusChange(order, b.status);
      res.status(201).json({ success: true, data: { ...order, saleRegistered } });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao criar encomenda' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const b = req.body ?? {};
      if (hasInvalidStatus(b)) {
        res.status(400).json({ success: false, message: 'Status inválido' });
        return;
      }
      // Se a data de entrega vier na atualização, normaliza e valida antes do
      // update (mesmo motivo do create: datas inexistentes quebravam o insert).
      if (b.deliveryDate !== undefined) {
        const deliveryDate = normalizeDateToISO(b.deliveryDate);
        if (!deliveryDate) {
          res.status(400).json({ success: false, message: 'Data de entrega inválida. Use o formato dd/mm/aaaa.' });
          return;
        }
        b.deliveryDate = deliveryDate;
      }
      const order = await repo.update(req.params.id, userId, b);
      if (!order) {
        res.status(404).json({ success: false, message: 'Encomenda não encontrada' });
        return;
      }
      const saleRegistered = await syncSaleForStatusChange(order, b.status);
      res.json({ success: true, data: { ...order, saleRegistered } });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar encomenda' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const deleted = await repo.delete(req.params.id, userId);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Encomenda não encontrada' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao excluir encomenda' });
    }
  }
}
