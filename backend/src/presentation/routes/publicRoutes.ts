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
        deliveryFee: s.delivery_fee ? Number(s.delivery_fee) : null,
        coverImageUrl: s.cover_image_url ?? null,
        paymentMethods: s.payment_methods ?? ['pix', 'cash', 'credit', 'debit'],
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
      'SELECT user_id, store_name, min_order_value, delivery_fee, payment_methods FROM store_settings WHERE slug = $1 AND active = TRUE',
      [slug]
    );
    if (settingsResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Loja não encontrada ou inativa' });
      return;
    }
    const { user_id: userId, store_name: storeName, min_order_value: minOrderValue, delivery_fee: deliveryFeeRaw, payment_methods: paymentMethodsRaw } = settingsResult.rows[0];
    const deliveryFee = deliveryFeeRaw ? Number(deliveryFeeRaw) : 0;
    const acceptedMethods: string[] = Array.isArray(paymentMethodsRaw) ? paymentMethodsRaw : ['pix', 'cash', 'credit', 'debit'];

    // Forma de pagamento escolhida pelo cliente (opcional para compatibilidade com páginas antigas em cache)
    const paymentMethod: string | null = b.paymentMethod ? String(b.paymentMethod) : null;
    if (paymentMethod && !acceptedMethods.includes(paymentMethod)) {
      res.status(400).json({ success: false, error: 'Forma de pagamento não aceita pela loja' });
      return;
    }
    const changeForNum = Number(b.changeFor);
    const changeFor = paymentMethod === 'cash' && Number.isFinite(changeForNum) && changeForNum > 0 ? changeForNum : null;

    // Buscar preços dos produtos (nunca confiar no preço enviado pelo cliente)
    const productIds = b.items.map((i: any) => i.productId);
    const productsResult = await pool.query(
      'SELECT id, name, public_price, recipe_id FROM store_products WHERE id = ANY($1) AND user_id = $2 AND available = TRUE',
      [productIds, userId]
    );
    const productMap = new Map(productsResult.rows.map(p => [p.id, p]));

    // Montar itens com preços do banco
    const items: Array<{ productId: string; recipeId: string | null; recipeName: string; quantity: number; unitPrice: number }> = [];
    let totalPrice = 0;
    for (const item of b.items) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Number(product.public_price);
      items.push({ productId: product.id, recipeId: product.recipe_id ?? null, recipeName: product.name, quantity: qty, unitPrice });
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

    // Aplicar taxa de entrega quando o tipo for 'delivery'
    const isDelivery = b.deliveryType === 'delivery';
    const appliedDeliveryFee = isDelivery && deliveryFee > 0 ? deliveryFee : 0;
    const totalWithFee = totalPrice + appliedDeliveryFee;

    // Criar pedido (delivery_date = hoje, pois não há data específica no pedido online)
    const deliveryDate = new Date().toISOString().split('T')[0];
    const firstItem = items[0];
    const result = await pool.query(
      `INSERT INTO orders
        (user_id, client_name, client_phone, recipe_name, quantity, unit_price, total_price,
         delivery_date, status, paid, paid_amount, payments, items, notes, source, delivery_address,
         payment_method, change_for, order_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',FALSE,0,'[]',$9,$10,'online',$11,$12,$13,
         (SELECT COALESCE(MAX(order_number), 0) + 1 FROM orders WHERE user_id = $1))
       RETURNING id, order_number`,
      [
        userId,
        String(b.clientName).trim(),
        b.clientPhone ? String(b.clientPhone).trim() : null,
        firstItem.recipeName,
        firstItem.quantity,
        firstItem.unitPrice,
        totalWithFee,
        deliveryDate,
        JSON.stringify(items.map(i => ({ recipeId: i.recipeId, recipeName: i.recipeName, quantity: i.quantity, unitPrice: i.unitPrice }))),
        b.notes ? String(b.notes).trim() : null,
        b.deliveryAddress ? String(b.deliveryAddress).trim() : null,
        paymentMethod,
        changeFor,
      ]
    );
    const orderId = result.rows[0].id;
    const orderNumber = result.rows[0].order_number != null ? Number(result.rows[0].order_number) : null;

    // Push notification para o dono da loja (fire-and-forget)
    try {
      const tokenRepo = new PostgresPushTokenRepository();
      const tokens = await tokenRepo.findByUserId(userId);
      if (tokens.length > 0) {
        const itemsSummary = items.map(i => `${i.quantity}x ${i.recipeName}`).join(', ');
        const phoneInfo = b.clientPhone ? ` • ${String(b.clientPhone).trim()}` : '';
        const addrInfo = isDelivery && b.deliveryAddress ? ` • ${String(b.deliveryAddress).trim()}` : '';
        const methodLabels: Record<string, string> = { pix: 'Pix', cash: 'Dinheiro', credit: 'Crédito', debit: 'Débito' };
        const changeInfo = changeFor ? ` (troco p/ R$ ${changeFor.toFixed(2).replace('.', ',')})` : '';
        const payInfo = paymentMethod ? ` • ${methodLabels[paymentMethod] ?? paymentMethod}${changeInfo}` : '';
        await sendPushNotifications(
          tokens.map(t => t.token),
          `🛍️ Novo pedido${orderNumber ? ` #${orderNumber}` : ''} recebido!`,
          `${b.clientName}${phoneInfo}: ${itemsSummary}${addrInfo}${payInfo}`,
          { type: 'new_order', orderId }
        );
      }
    } catch (pushErr) {
      console.error('[Public Store] push error:', pushErr);
    }

    res.status(201).json({ success: true, data: { orderId, orderNumber } });
  } catch (error) {
    console.error('[Public Store] order error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar pedido' });
  }
});

router.get('/store/:slug/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { slug, orderId } = req.params;
    const storeResult = await pool.query(
      'SELECT user_id FROM store_settings WHERE slug = $1 AND active = TRUE',
      [slug]
    );
    if (storeResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Loja não encontrada' });
      return;
    }
    const userId = storeResult.rows[0].user_id;
    const orderResult = await pool.query(
      `SELECT id, client_name, status, total_price, items, delivery_address, source, payment_method, change_for, order_number, created_at
       FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );
    if (orderResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Pedido não encontrado' });
      return;
    }
    const o = orderResult.rows[0];
    res.json({
      success: true,
      data: {
        id: o.id,
        clientName: o.client_name,
        status: o.status,
        totalPrice: Number(o.total_price),
        items: o.items ?? [],
        deliveryAddress: o.delivery_address ?? null,
        paymentMethod: o.payment_method ?? null,
        changeFor: o.change_for != null ? Number(o.change_for) : null,
        orderNumber: o.order_number != null ? Number(o.order_number) : null,
        createdAt: o.created_at,
      },
    });
  } catch (error) {
    console.error('[Public Store] order status error:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

export default router;
