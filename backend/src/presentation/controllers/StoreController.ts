import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresStoreRepository } from '../../infrastructure/repositories/PostgresStoreRepository';

const repo = new PostgresStoreRepository();

export class StoreController {
  async getSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const settings = await repo.getSettings(req.userId!);
      res.json({ success: true, data: settings });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao buscar configurações da loja' });
    }
  }

  async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const b = req.body ?? {};
      const settings = await repo.updateSettings(req.userId!, {
        active:          b.active,
        storeName:       b.storeName,
        description:     b.description,
        acceptsDelivery: b.acceptsDelivery,
        acceptsPickup:   b.acceptsPickup,
        minOrderValue:   b.minOrderValue,
        deliveryFee:     b.deliveryFee,
        coverImageUrl:   b.coverImageUrl,
        paymentMethods:  Array.isArray(b.paymentMethods) ? b.paymentMethods : undefined,
      });
      res.json({ success: true, data: settings });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao salvar configurações da loja' });
    }
  }

  async getProducts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const products = await repo.getProducts(req.userId!);
      res.json({ success: true, data: products });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao buscar produtos' });
    }
  }

  async createProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const b = req.body ?? {};
      if (!b.name || b.publicPrice == null) {
        res.status(400).json({ success: false, message: 'Nome e preço são obrigatórios' });
        return;
      }
      const product = await repo.createProduct(req.userId!, {
        name:        String(b.name).trim(),
        description: b.description ?? null,
        photoUrl:    b.photoUrl ?? null,
        publicPrice: Number(b.publicPrice),
        available:   b.available !== false,
        recipeId:    b.recipeId ?? null,
      });
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao criar produto' });
    }
  }

  async updateProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const b = req.body ?? {};
      const patch: Record<string, unknown> = {};
      if (b.name !== undefined)        patch.name        = b.name;
      if ('description' in b)          patch.description = b.description ?? null;
      if ('photoUrl' in b)             patch.photoUrl    = b.photoUrl ?? null;
      if (b.publicPrice !== undefined) patch.publicPrice = Number(b.publicPrice);
      if (b.available !== undefined)   patch.available   = b.available;
      if ('recipeId' in b)             patch.recipeId    = b.recipeId ?? null;
      const product = await repo.updateProduct(req.params.id, req.userId!, patch as any);
      if (!product) {
        res.status(404).json({ success: false, message: 'Produto não encontrado' });
        return;
      }
      res.json({ success: true, data: product });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar produto' });
    }
  }

  async deleteProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await repo.deleteProduct(req.params.id, req.userId!);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Produto não encontrado' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao excluir produto' });
    }
  }
}
