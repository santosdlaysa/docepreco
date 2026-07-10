import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresStoreRepository } from '../../infrastructure/repositories/PostgresStoreRepository';
import { geocodeStoreLocation } from '../../infrastructure/services/geocodingService';

const repo = new PostgresStoreRepository();

// Geocodifica em segundo plano (não atrasa a resposta). Só sobrescreve as
// coordenadas quando encontra resultado — falha de rede não apaga o que já existe.
function refreshCoordinates(userId: string, address: string | null, city: string | null): void {
  void geocodeStoreLocation(address, city)
    .then(coords => {
      if (coords) return repo.updateCoordinates(userId, coords.latitude, coords.longitude);
      if (!address && !city) return repo.updateCoordinates(userId, null, null);
    })
    .catch(err => console.error('[Store] geocode error:', err));
}

export class StoreController {
  async getSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const settings = await repo.getSettings(req.userId!);
      // Backfill preguiçoso: lojas criadas antes das coordenadas geocodificam ao abrir o painel.
      if (settings.latitude == null && (settings.address || settings.city)) {
        refreshCoordinates(req.userId!, settings.address ?? null, settings.city ?? null);
      }
      res.json({ success: true, data: settings });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao buscar configurações da loja' });
    }
  }

  async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const b = req.body ?? {};
      // Só inclui os campos presentes no body — um update parcial (ex.: só `active`)
      // não pode apagar imagem, logo, endereço etc. (o repo interpreta chave presente
      // com valor null/undefined como "limpar o campo").
      const patch: Record<string, unknown> = {};
      if (b.active !== undefined)           patch.active          = b.active;
      if (b.storeName !== undefined)        patch.storeName       = b.storeName;
      if ('description' in b)               patch.description     = b.description ?? null;
      if (b.acceptsDelivery !== undefined)  patch.acceptsDelivery = b.acceptsDelivery;
      if (b.acceptsPickup !== undefined)    patch.acceptsPickup   = b.acceptsPickup;
      if ('minOrderValue' in b)             patch.minOrderValue   = b.minOrderValue ?? null;
      if ('deliveryFee' in b)               patch.deliveryFee     = b.deliveryFee ?? null;
      if ('coverImageUrl' in b)             patch.coverImageUrl   = b.coverImageUrl ?? null;
      if ('logoUrl' in b)                   patch.logoUrl         = b.logoUrl ?? null;
      if (Array.isArray(b.paymentMethods))  patch.paymentMethods  = b.paymentMethods;
      if ('address' in b)                   patch.address         = b.address ?? null;
      if ('city' in b)                      patch.city            = b.city ?? null;
      if ('category' in b)                  patch.category        = b.category ?? null;
      if (b.useBusinessHours !== undefined) patch.useBusinessHours = b.useBusinessHours;
      if (Array.isArray(b.businessHours))   patch.businessHours   = b.businessHours;
      const settings = await repo.updateSettings(req.userId!, patch as any);
      if ('address' in b || 'city' in b) {
        refreshCoordinates(req.userId!, settings.address ?? null, settings.city ?? null);
      }
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
        name:          String(b.name).trim(),
        description:   b.description ?? null,
        photoUrl:      b.photoUrl ?? null,
        publicPrice:   Number(b.publicPrice),
        available:     b.available !== false,
        recipeId:      b.recipeId ?? null,
        discountType:  b.discountType ?? null,
        discountValue: b.discountValue != null ? Number(b.discountValue) : null,
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
      if ('discountType' in b)         patch.discountType = b.discountType ?? null;
      if ('discountValue' in b)        patch.discountValue = b.discountValue != null ? Number(b.discountValue) : null;
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

  async getAddons(req: AuthRequest, res: Response): Promise<void> {
    try {
      const addons = await repo.getAddons(req.userId!);
      res.json({ success: true, data: addons });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao buscar adicionais' });
    }
  }

  async createAddon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const b = req.body ?? {};
      const name = typeof b.name === 'string' ? b.name.trim() : '';
      const price = Number(b.price);
      if (!name || !Number.isFinite(price) || price < 0) {
        res.status(400).json({ success: false, message: 'Nome e preço válido são obrigatórios' });
        return;
      }
      const addon = await repo.createAddon(req.userId!, {
        name,
        price,
        available: b.available !== false,
      });
      res.status(201).json({ success: true, data: addon });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao criar adicional' });
    }
  }

  async updateAddon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const b = req.body ?? {};
      const patch: Partial<{ name: string; price: number; available: boolean }> = {};
      if (b.name !== undefined) {
        const name = String(b.name).trim();
        if (!name) {
          res.status(400).json({ success: false, message: 'Nome não pode ser vazio' });
          return;
        }
        patch.name = name;
      }
      if (b.price !== undefined) {
        const price = Number(b.price);
        if (!Number.isFinite(price) || price < 0) {
          res.status(400).json({ success: false, message: 'Preço inválido' });
          return;
        }
        patch.price = price;
      }
      if (b.available !== undefined) patch.available = Boolean(b.available);
      const addon = await repo.updateAddon(req.params.id, req.userId!, patch);
      if (!addon) {
        res.status(404).json({ success: false, message: 'Adicional não encontrado' });
        return;
      }
      res.json({ success: true, data: addon });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar adicional' });
    }
  }

  async deleteAddon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await repo.deleteAddon(req.params.id, req.userId!);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Adicional não encontrado' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao excluir adicional' });
    }
  }
}
