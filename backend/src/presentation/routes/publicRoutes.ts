import { Router, Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { sendPushNotifications } from '../../infrastructure/services/pushService';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { PostgresStoreRepository } from '../../infrastructure/repositories/PostgresStoreRepository';
import { computeDiscountAmount, DiscountType } from '../../domain/utils/discount';
import { isStoreOpenNow } from '../../domain/utils/businessHours';
import { publicListLimiter, publicOrderLimiter } from '../middleware/rateLimiter';

const router = Router();
const storeRepo = new PostgresStoreRepository();

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

router.get('/stores', publicListLimiter, async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : undefined;
    const sort = sortRaw === 'distance' || sortRaw === 'fee_asc' ? sortRaw : undefined;
    const freeDelivery = req.query.freeDelivery === 'true' || req.query.freeDelivery === '1';
    const latRaw = Number(req.query.lat);
    const lngRaw = Number(req.query.lng);
    const hasCoords = Number.isFinite(latRaw) && Number.isFinite(lngRaw) && Math.abs(latRaw) <= 90 && Math.abs(lngRaw) <= 180;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const { stores, total } = await storeRepo.listMarketplaceStores({
      search, category, city, sort, freeDelivery,
      lat: hasCoords ? latRaw : undefined,
      lng: hasCoords ? lngRaw : undefined,
      page, limit,
    });
    res.json({ success: true, data: { stores, page, limit, total } });
  } catch (error) {
    console.error('[Public Stores] list error:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

router.get('/customer/orders', publicListLimiter, async (req: Request, res: Response) => {
  try {
    const rawPhone = typeof req.query.phone === 'string' ? req.query.phone : '';
    const phone = rawPhone.replace(/\D/g, '');
    if (phone.length < 8) {
      res.status(400).json({ success: false, error: 'Telefone inválido' });
      return;
    }
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.total_price, o.items, o.created_at,
              o.delivery_address, o.payment_method,
              s.store_name, s.slug, s.cover_image_url, s.logo_url
       FROM orders o
       JOIN store_settings s ON s.user_id = o.user_id
       WHERE o.source = 'online'
         AND regexp_replace(o.client_phone, '\\D', '', 'g') = $1
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [phone]
    );
    res.json({
      success: true,
      data: result.rows.map(o => ({
        orderId: o.id,
        orderNumber: o.order_number != null ? Number(o.order_number) : null,
        status: o.status,
        totalPrice: Number(o.total_price),
        items: o.items ?? [],
        createdAt: o.created_at,
        deliveryAddress: o.delivery_address,
        paymentMethod: o.payment_method,
        storeName: o.store_name,
        storeSlug: o.slug,
        storeImageUrl: o.logo_url ?? o.cover_image_url ?? null,
      })),
    });
  } catch (error) {
    console.error('[Public Customer] orders error:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// Vitrine de itens das lojas da região — produtos mais recentes de lojas abertas,
// exibidos acima da lista de lojas no marketplace.
router.get('/products/featured', publicListLimiter, async (req: Request, res: Response) => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 30);
    // Busca com folga: lojas fechadas pelo horário de funcionamento são filtradas em JS.
    const result = await pool.query(
      `SELECT p.id, p.name, p.photo_url, p.public_price, p.discount_type, p.discount_value,
              s.store_name, s.slug AS store_slug, s.active, s.use_business_hours, s.business_hours
       FROM store_products p
       JOIN store_settings s ON s.user_id = p.user_id
       WHERE p.available = TRUE AND s.active = TRUE
         AND ($1::text = '' OR s.city ILIKE '%' || $1 || '%')
       ORDER BY p.created_at DESC
       LIMIT $2`,
      [city, limit * 2]
    );
    const products = result.rows
      .filter(p => isStoreOpenNow({ active: p.active, use_business_hours: p.use_business_hours, business_hours: p.business_hours }))
      .slice(0, limit)
      .map(p => {
        const publicPrice = Number(p.public_price);
        const discountAmount = computeDiscountAmount(publicPrice, p.discount_type as DiscountType | null, p.discount_value != null ? Number(p.discount_value) : null);
        return {
          id: p.id,
          name: p.name,
          photoUrl: p.photo_url,
          price: publicPrice - discountAmount,
          originalPrice: discountAmount > 0 ? publicPrice : undefined,
          storeName: p.store_name,
          storeSlug: p.store_slug,
        };
      });
    res.json({ success: true, data: { products } });
  } catch (error) {
    console.error('[Public Products] featured error:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

router.get('/products/search', publicListLimiter, async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) {
      res.json({ success: true, data: { products: [] } });
      return;
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.photo_url, p.public_price, p.discount_type, p.discount_value,
              s.store_name, s.slug AS store_slug, s.active, s.use_business_hours, s.business_hours
       FROM store_products p
       JOIN store_settings s ON s.user_id = p.user_id
       WHERE p.available = TRUE AND s.active = TRUE
         AND p.name ILIKE '%' || $1 || '%'
       ORDER BY p.name ASC
       LIMIT $2`,
      [q, limit]
    );
    res.json({
      success: true,
      data: {
        products: result.rows.filter(p => isStoreOpenNow({ active: p.active, use_business_hours: p.use_business_hours, business_hours: p.business_hours })).map(p => {
          const publicPrice = Number(p.public_price);
          const discountAmount = computeDiscountAmount(publicPrice, p.discount_type as DiscountType | null, p.discount_value != null ? Number(p.discount_value) : null);
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            photoUrl: p.photo_url,
            price: publicPrice - discountAmount,
            originalPrice: discountAmount > 0 ? publicPrice : undefined,
            storeName: p.store_name,
            storeSlug: p.store_slug,
          };
        }),
      },
    });
  } catch (error) {
    console.error('[Public Products] search error:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

router.get('/store/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    // Buscar configurações
    const settingsResult = await pool.query(
      'SELECT * FROM store_settings WHERE slug = $1',
      [slug]
    );
    if (settingsResult.rows.length === 0 || !isStoreOpenNow(settingsResult.rows[0])) {
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
      'SELECT id, name, description, photo_url, public_price, discount_type, discount_value FROM store_products WHERE user_id = $1 AND available = TRUE ORDER BY created_at ASC',
      [s.user_id]
    );
    // Itens adicionais disponíveis — o cliente escolhe no detalhe do produto
    const addonsResult = await pool.query(
      'SELECT id, name, price FROM store_addons WHERE user_id = $1 AND available = TRUE ORDER BY created_at ASC',
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
        logoUrl: s.logo_url ?? null,
        paymentMethods: s.payment_methods ?? ['pix', 'cash', 'credit', 'debit'],
        address: s.address ?? null,
        phone: u.phone ?? null,
        instagramHandle: u.instagram_handle ?? null,
        products: productsResult.rows.map(p => {
          const publicPrice = Number(p.public_price);
          const discountAmount = computeDiscountAmount(publicPrice, p.discount_type as DiscountType | null, p.discount_value != null ? Number(p.discount_value) : null);
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            photoUrl: p.photo_url,
            price: publicPrice - discountAmount,
            originalPrice: discountAmount > 0 ? publicPrice : undefined,
          };
        }),
        addons: addonsResult.rows.map(a => ({
          id: a.id,
          name: a.name,
          price: Number(a.price),
        })),
      },
    });
  } catch (error) {
    console.error('[Public Store] get error:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

router.post('/store/:slug/orders', publicOrderLimiter, async (req: Request, res: Response) => {
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
      'SELECT user_id, store_name, min_order_value, delivery_fee, payment_methods, active, use_business_hours, business_hours FROM store_settings WHERE slug = $1',
      [slug]
    );
    if (settingsResult.rows.length === 0 || !isStoreOpenNow(settingsResult.rows[0])) {
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
      'SELECT id, name, public_price, recipe_id, discount_type, discount_value FROM store_products WHERE id = ANY($1) AND user_id = $2 AND available = TRUE',
      [productIds, userId]
    );
    const productMap = new Map(productsResult.rows.map(p => [p.id, p]));

    // Adicionais da loja (preço sempre do banco, nunca do cliente)
    const addonsResult = await pool.query(
      'SELECT id, name, price FROM store_addons WHERE user_id = $1 AND available = TRUE',
      [userId]
    );
    const addonMap = new Map(addonsResult.rows.map(a => [a.id, a]));

    // Montar itens com preços do banco, já com o desconto do produto aplicado.
    // Adicionais entram no preço unitário (por unidade do produto) e ficam listados no item.
    const items: Array<{ productId: string; recipeId: string | null; recipeName: string; quantity: number; unitPrice: number; discount: number; addons: Array<{ id: string; name: string; price: number }> }> = [];
    let totalPrice = 0;
    for (const item of b.items) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const addonIds: string[] = Array.isArray(item.addonIds) ? item.addonIds : [];
      const addons = addonIds
        .map(id => addonMap.get(id))
        .filter(Boolean)
        .map((a: any) => ({ id: a.id as string, name: a.name as string, price: Number(a.price) }));
      const addonsPerUnit = addons.reduce((sum, a) => sum + a.price, 0);
      const productPrice = Number(product.public_price);
      const unitPrice = Math.round((productPrice + addonsPerUnit) * 100) / 100;
      const discountPerUnit = computeDiscountAmount(productPrice, product.discount_type as DiscountType | null, product.discount_value != null ? Number(product.discount_value) : null);
      const discount = Math.round(discountPerUnit * qty * 100) / 100;
      items.push({ productId: product.id, recipeId: product.recipe_id ?? null, recipeName: product.name, quantity: qty, unitPrice, discount, addons });
      totalPrice += qty * unitPrice - discount;
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
        JSON.stringify(items.map(i => ({ productId: i.productId, recipeId: i.recipeId, recipeName: i.recipeName, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount, addons: i.addons }))),
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
        const itemsSummary = items
          .map(i => `${i.quantity}x ${i.recipeName}${i.addons.length ? ` (+ ${i.addons.map(a => a.name).join(', ')})` : ''}`)
          .join(', ');
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
