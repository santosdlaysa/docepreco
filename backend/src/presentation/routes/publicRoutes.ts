import { Router, Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { sendPushNotifications } from '../../infrastructure/services/pushService';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';

const router = Router();

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users)   AS "totalUsers",
        (SELECT COUNT(*)::int FROM recipes)  AS "totalRecipes"
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Public] stats error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/store/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    // Buscar configurações
    const settingsResult = await pool.query(
      'SELECT * FROM store_settings WHERE slug = $1 AND active = TRUE',
      [slug]
    );
    if (settingsResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Loja não encontrada ou inativa' });
      return;
    }
    const s = settingsResult.rows[0];
    // Buscar info de contato do dono da loja
    const userResult = await pool.query(
      'SELECT phone, instagram_handle FROM users WHERE id = $1',
      [s.user_id]
    );
    const u = userResult.rows[0] ?? {};
    // Buscar produtos disponíveis
    const productsResult = await pool.query(
      'SELECT id, name, description, photo_url, public_price FROM store_products WHERE user_id = $1 AND available = TRUE ORDER BY created_at ASC',
      [s.user_id]
    );
    res.json({
      success: true,
      data: {
        storeName: s.store_name,
        slug: s.slug,
        description: s.description,
        acceptsDelivery: s.accepts_delivery,
        acceptsPickup: s.accepts_pickup,
        minOrderValue: s.min_order_value ? Number(s.min_order_value) : null,
        phone: u.phone ?? null,
        instagramHandle: u.instagram_handle ?? null,
        products: productsResult.rows.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          photoUrl: p.photo_url,
          price: Number(p.public_price),
        })),
      },
    });
  } catch (error) {
    console.error('[Public Store] get error:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

router.post('/store/:slug/orders', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const b = req.body ?? {};

    // Validação básica
    if (!b.clientName || !b.items || !Array.isArray(b.items) || b.items.length === 0) {
      res.status(400).json({ success: false, error: 'Nome e itens são obrigatórios' });
      return;
    }

    // Buscar loja
    const settingsResult = await pool.query(
      'SELECT user_id, store_name, min_order_value FROM store_settings WHERE slug = $1 AND active = TRUE',
      [slug]
    );
    if (settingsResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Loja não encontrada ou inativa' });
      return;
    }
    const { user_id: userId, store_name: storeName, min_order_value: minOrderValue } = settingsResult.rows[0];

    // Buscar preços dos produtos (nunca confiar no preço enviado pelo cliente)
    const productIds = b.items.map((i: any) => i.productId);
    const productsResult = await pool.query(
      'SELECT id, name, public_price FROM store_products WHERE id = ANY($1) AND user_id = $2 AND available = TRUE',
      [productIds, userId]
    );
    const productMap = new Map(productsResult.rows.map(p => [p.id, p]));

    // Montar itens com preços do banco
    const items: Array<{ productId: string; recipeName: string; quantity: number; unitPrice: number }> = [];
    let totalPrice = 0;
    for (const item of b.items) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Number(product.public_price);
      items.push({ productId: product.id, recipeName: product.name, quantity: qty, unitPrice });
      totalPrice += qty * unitPrice;
    }
    if (items.length === 0) {
      res.status(400).json({ success: false, error: 'Nenhum produto válido no pedido' });
      return;
    }
    if (minOrderValue && totalPrice < Number(minOrderValue)) {
      res.status(400).json({ success: false, error: `Pedido mínimo de R$ ${Number(minOrderValue).toFixed(2).replace('.', ',')}` });
      return;
    }

    // Criar pedido (delivery_date = hoje, pois não há data específica no pedido online)
    const deliveryDate = new Date().toISOString().split('T')[0];
    const firstItem = items[0];
    const result = await pool.query(
      `INSERT INTO orders
        (user_id, client_name, client_phone, recipe_name, quantity, unit_price, total_price,
         delivery_date, status, paid, paid_amount, payments, items, notes, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',FALSE,0,'[]',$9,$10,'online')
       RETURNING id`,
      [
        userId,
        String(b.clientName).trim(),
        b.clientPhone ? String(b.clientPhone).trim() : null,
        firstItem.recipeName,
        firstItem.quantity,
        firstItem.unitPrice,
        totalPrice,
        deliveryDate,
        JSON.stringify(items.map(i => ({ recipeId: i.productId, recipeName: i.recipeName, quantity: i.quantity, unitPrice: i.unitPrice }))),
        b.notes ? String(b.notes).trim() : null,
      ]
    );
    const orderId = result.rows[0].id;

    // Push notification para o dono da loja (fire-and-forget)
    try {
      const tokenRepo = new PostgresPushTokenRepository();
      const tokens = await tokenRepo.findByUserId(userId);
      if (tokens.length > 0) {
        const itemsSummary = items.map(i => `${i.quantity}x ${i.recipeName}`).join(', ');
        await sendPushNotifications(
          tokens.map(t => t.token),
          '🛍️ Novo pedido recebido!',
          `${b.clientName} pediu: ${itemsSummary}`,
          { type: 'new_order', orderId }
        );
      }
    } catch (pushErr) {
      console.error('[Public Store] push error:', pushErr);
    }

    res.status(201).json({ success: true, data: { orderId } });
  } catch (error) {
    console.error('[Public Store] order error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar pedido' });
  }
});

export default router;
