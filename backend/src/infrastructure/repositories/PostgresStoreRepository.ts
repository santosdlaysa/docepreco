import { pool } from '../database/connection';
import { DiscountType } from '../../domain/utils/discount';
import { DayHours, isStoreOpenNow } from '../../domain/utils/businessHours';
import { MASTER_PLAN_ACTIVE_SQL } from '../../domain/services/premium';

export interface StoreSettings {
  id: string;
  userId: string;
  active: boolean;
  acceptingOrders: boolean;
  storeName: string;
  slug: string;
  storeLink: string;
  description?: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue?: number | null;
  deliveryFee?: number | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  paymentMethods: string[];
  /** Chave PIX de recebimento da loja (normalizada). Null = loja ainda não configurou. */
  pixKey?: string | null;
  pixKeyType?: string | null;
  /** Nome que aparece como recebedor no PIX (padrão: nome da loja). */
  pixReceiverName?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  useBusinessHours: boolean;
  businessHours: DayHours[];
  isOpenNow: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceStoreSummary {
  storeName: string;
  slug: string;
  description?: string | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue?: number | null;
  deliveryFee?: number | null;
  city?: string | null;
  category?: string | null;
  distanceKm?: number | null;
  /** Loja aberta agora (toggle manual + horário de funcionamento). Fechada aparece na lista, mas esmaecida. */
  isOpen: boolean;
}

export interface StoreProduct {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  publicPrice: number;
  available: boolean;
  recipeId?: string | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  /** Saldo de estoque para pedidos online. NULL = ilimitado. */
  stock?: number | null;
  /** Categoria no cardápio (texto livre). NULL = sem categoria ("Outros"). */
  category?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreAddon {
  id: string;
  userId: string;
  name: string;
  price: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

const BASE_URL = process.env.STORE_BASE_URL || 'https://docepreco.site/loja';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function mapSettings(row: Record<string, unknown>): StoreSettings {
  const slug = row.slug as string;
  const useBusinessHours = (row.use_business_hours as boolean) ?? false;
  const businessHours = (row.business_hours as DayHours[] | null) ?? [];
  return {
    id: row.id as string,
    userId: row.user_id as string,
    active: row.active as boolean,
    acceptingOrders: (row.accepting_orders as boolean) ?? true,
    storeName: row.store_name as string,
    slug,
    storeLink: `${BASE_URL}/${slug}`,
    description: row.description as string | null,
    acceptsDelivery: row.accepts_delivery as boolean,
    acceptsPickup: row.accepts_pickup as boolean,
    minOrderValue: row.min_order_value ? Number(row.min_order_value) : null,
    deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : null,
    coverImageUrl: (row.cover_image_url as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    paymentMethods: (row.payment_methods as string[] | null) ?? ['pix', 'cash', 'credit', 'debit'],
    pixKey: (row.pix_key as string | null) ?? null,
    pixKeyType: (row.pix_key_type as string | null) ?? null,
    pixReceiverName: (row.pix_receiver_name as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    category: (row.category as string | null) ?? null,
    useBusinessHours,
    businessHours,
    isOpenNow: isStoreOpenNow({ active: row.active as boolean, accepting_orders: (row.accepting_orders as boolean) ?? true, use_business_hours: useBusinessHours, business_hours: businessHours }),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

function mapMarketplaceStore(row: Record<string, unknown>): MarketplaceStoreSummary {
  return {
    storeName: row.store_name as string,
    slug: row.slug as string,
    description: row.description as string | null,
    coverImageUrl: (row.cover_image_url as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    acceptsDelivery: row.accepts_delivery as boolean,
    acceptsPickup: row.accepts_pickup as boolean,
    minOrderValue: row.min_order_value != null ? Number(row.min_order_value) : null,
    deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : null,
    city: (row.city as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    distanceKm: row.distance_km != null ? Math.round(Number(row.distance_km) * 10) / 10 : null,
    isOpen: isStoreOpenNow(row as Parameters<typeof isStoreOpenNow>[0]),
  };
}

function mapAddon(row: Record<string, unknown>): StoreAddon {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    price: Number(row.price),
    available: row.available as boolean,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

function mapProduct(row: Record<string, unknown>): StoreProduct {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    photoUrl: row.photo_url as string | null,
    publicPrice: Number(row.public_price),
    available: row.available as boolean,
    recipeId: row.recipe_id as string | null,
    discountType: (row.discount_type as DiscountType | null) ?? null,
    discountValue: row.discount_value != null ? Number(row.discount_value) : null,
    stock: row.stock != null ? Number(row.stock) : null,
    category: (row.category as string | null) ?? null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export class PostgresStoreRepository {
  async getSettings(userId: string): Promise<StoreSettings> {
    const existing = await pool.query(
      'SELECT * FROM store_settings WHERE user_id = $1',
      [userId]
    );
    if (existing.rows.length > 0) return mapSettings(existing.rows[0]);

    // Cria configuração inicial baseada no nome da empresa
    const userRow = await pool.query('SELECT company_name FROM users WHERE id = $1', [userId]);
    const companyName: string = userRow.rows[0]?.company_name ?? 'minha-loja';
    const baseSlug = slugify(companyName);

    // Garante slug único
    let slug = baseSlug;
    let attempt = 0;
    while (true) {
      const collision = await pool.query(
        'SELECT id FROM store_settings WHERE slug = $1 AND user_id <> $2',
        [slug, userId]
      );
      if (collision.rows.length === 0) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const result = await pool.query(
      `INSERT INTO store_settings (user_id, active, store_name, slug, accepts_delivery, accepts_pickup)
       VALUES ($1, FALSE, $2, $3, TRUE, TRUE)
       RETURNING *`,
      [userId, companyName, slug]
    );
    return mapSettings(result.rows[0]);
  }

  async updateSettings(userId: string, data: Partial<{
    active: boolean;
    acceptingOrders: boolean;
    storeName: string;
    description: string | null;
    acceptsDelivery: boolean;
    acceptsPickup: boolean;
    minOrderValue: number | null;
    deliveryFee: number | null;
    coverImageUrl: string | null;
    logoUrl: string | null;
    paymentMethods: string[];
    pixKey: string | null;
    pixKeyType: string | null;
    pixReceiverName: string | null;
    address: string | null;
    city: string | null;
    category: string | null;
    useBusinessHours: boolean;
    businessHours: DayHours[];
  }>): Promise<StoreSettings> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.active !== undefined)         { fields.push(`active = $${idx++}`);           values.push(data.active); }
    if (data.acceptingOrders !== undefined) { fields.push(`accepting_orders = $${idx++}`); values.push(data.acceptingOrders); }
    if (data.storeName !== undefined)       { fields.push(`store_name = $${idx++}`);       values.push(data.storeName); }
    if ('description' in data)             { fields.push(`description = $${idx++}`);      values.push(data.description ?? null); }
    if (data.acceptsDelivery !== undefined) { fields.push(`accepts_delivery = $${idx++}`); values.push(data.acceptsDelivery); }
    if (data.acceptsPickup !== undefined)   { fields.push(`accepts_pickup = $${idx++}`);   values.push(data.acceptsPickup); }
    if ('minOrderValue' in data)           { fields.push(`min_order_value = $${idx++}`);  values.push(data.minOrderValue ?? null); }
    if ('deliveryFee' in data)             { fields.push(`delivery_fee = $${idx++}`);     values.push(data.deliveryFee ?? null); }
    if ('coverImageUrl' in data)           { fields.push(`cover_image_url = $${idx++}`); values.push(data.coverImageUrl ?? null); }
    if ('logoUrl' in data)                 { fields.push(`logo_url = $${idx++}`);        values.push(data.logoUrl ?? null); }
    if (data.paymentMethods !== undefined)  { fields.push(`payment_methods = $${idx++}`); values.push(JSON.stringify(data.paymentMethods)); }
    if ('pixKey' in data)                  { fields.push(`pix_key = $${idx++}`);          values.push(data.pixKey ?? null); }
    if ('pixKeyType' in data)              { fields.push(`pix_key_type = $${idx++}`);     values.push(data.pixKeyType ?? null); }
    if ('pixReceiverName' in data)         { fields.push(`pix_receiver_name = $${idx++}`); values.push(data.pixReceiverName ?? null); }
    if ('address' in data)                 { fields.push(`address = $${idx++}`);          values.push(data.address ?? null); }
    if ('city' in data)                    { fields.push(`city = $${idx++}`);             values.push(data.city ?? null); }
    if ('category' in data)                { fields.push(`category = $${idx++}`);         values.push(data.category ?? null); }
    if (data.useBusinessHours !== undefined) { fields.push(`use_business_hours = $${idx++}`); values.push(data.useBusinessHours); }
    if (data.businessHours !== undefined)    { fields.push(`business_hours = $${idx++}`);     values.push(JSON.stringify(data.businessHours)); }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE store_settings SET ${fields.join(', ')} WHERE user_id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return this.getSettings(userId);
    }
    return mapSettings(result.rows[0]);
  }

  async updateCoordinates(userId: string, latitude: number | null, longitude: number | null): Promise<void> {
    await pool.query(
      'UPDATE store_settings SET latitude = $1, longitude = $2 WHERE user_id = $3',
      [latitude, longitude, userId]
    );
  }

  async listMarketplaceStores(filters: {
    search?: string;
    category?: string;
    city?: string;
    sort?: 'distance' | 'fee_asc';
    freeDelivery?: boolean;
    lat?: number;
    lng?: number;
    page: number;
    limit: number;
  }): Promise<{ stores: MarketplaceStoreSummary[]; total: number }> {
    const search = filters.search?.trim() || null;
    const category = filters.category?.trim() || null;
    const city = filters.city?.trim() || null;
    const freeDelivery = filters.freeDelivery === true;
    const hasCoords = Number.isFinite(filters.lat) && Number.isFinite(filters.lng);
    const lat = hasCoords ? filters.lat! : null;
    const lng = hasCoords ? filters.lng! : null;
    // Ordenar por distância sem coordenadas do cliente não faz sentido — cai na ordem padrão.
    const sort = filters.sort === 'distance' && !hasCoords ? null : filters.sort ?? null;
    const limit = Math.min(Math.max(filters.limit, 1), 50);
    const offset = Math.max(filters.page - 1, 0) * limit;

    // Lojas fechadas (toggle manual ou fora do horário) continuam na lista — o PWA
    // as mostra esmaecidas com selo "Fechada". A ordenação abertas-primeiro é feita
    // em JS dentro da página, pois o horário de funcionamento é avaliado em JS.
    // Loja é exclusiva do Master: lojas de quem não é Master (ou expirou) saem do marketplace (MASTER_PLAN_ACTIVE_SQL).
    // distance_km via fórmula de Haversine; lojas sem coordenadas ficam por último (NULLS LAST).
    const rows = await pool.query(
      `SELECT * FROM (
         SELECT st.store_name, st.slug, st.description, st.cover_image_url, st.logo_url,
                st.accepts_delivery, st.accepts_pickup, st.min_order_value, st.delivery_fee,
                st.city, st.category, st.active, st.accepting_orders, st.use_business_hours, st.business_hours,
                CASE WHEN $4::double precision IS NOT NULL AND st.latitude IS NOT NULL AND st.longitude IS NOT NULL THEN
                  2 * 6371 * asin(sqrt(
                    power(sin(radians((st.latitude - $4::double precision) / 2)), 2) +
                    cos(radians($4::double precision)) * cos(radians(st.latitude)) *
                    power(sin(radians((st.longitude - $5::double precision) / 2)), 2)
                  ))
                END AS distance_km
         FROM store_settings st
         JOIN users u ON u.id = st.user_id
         WHERE st.active = TRUE
           AND ${MASTER_PLAN_ACTIVE_SQL}
           AND ($1::text IS NULL OR st.store_name ILIKE '%' || $1 || '%')
           AND ($2::text IS NULL OR st.category = $2)
           AND ($3::text IS NULL OR st.city ILIKE $3)
           AND ($6::boolean IS NOT TRUE OR (st.accepts_delivery = TRUE AND st.delivery_fee = 0))
       ) s
       ORDER BY
         CASE WHEN $7::text = 'distance' THEN s.distance_km END ASC NULLS LAST,
         CASE WHEN $7::text = 'fee_asc' THEN (CASE WHEN s.accepts_delivery THEN s.delivery_fee END) END ASC NULLS LAST,
         s.store_name ASC
       LIMIT $8 OFFSET $9`,
      [search, category, city ? `%${city}%` : null, lat, lng, freeDelivery, sort, limit, offset]
    );
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM store_settings st
       JOIN users u ON u.id = st.user_id
       WHERE st.active = TRUE
         AND ${MASTER_PLAN_ACTIVE_SQL}
         AND ($1::text IS NULL OR st.store_name ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR st.category = $2)
         AND ($3::text IS NULL OR st.city ILIKE $3)
         AND ($4::boolean IS NOT TRUE OR (st.accepts_delivery = TRUE AND st.delivery_fee = 0))`,
      [search, category, city ? `%${city}%` : null, freeDelivery]
    );
    const total = count.rows[0]?.total ?? 0;

    const stores = rows.rows
      .map(mapMarketplaceStore)
      .sort((a, b) => Number(b.isOpen) - Number(a.isOpen));
    return { stores, total };
  }

  async getProducts(userId: string): Promise<StoreProduct[]> {
    const result = await pool.query(
      'SELECT * FROM store_products WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    return result.rows.map(mapProduct);
  }

  async createProduct(userId: string, data: {
    name: string;
    description?: string | null;
    photoUrl?: string | null;
    publicPrice: number;
    available: boolean;
    recipeId?: string | null;
    discountType?: DiscountType | null;
    discountValue?: number | null;
    stock?: number | null;
    category?: string | null;
  }): Promise<StoreProduct> {
    const result = await pool.query(
      `INSERT INTO store_products (user_id, name, description, photo_url, public_price, available, recipe_id, discount_type, discount_value, stock, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, data.name, data.description ?? null, data.photoUrl ?? null, data.publicPrice, data.available, data.recipeId ?? null, data.discountType ?? null, data.discountValue ?? null, data.stock ?? null, data.category ?? null]
    );
    return mapProduct(result.rows[0]);
  }

  async updateProduct(id: string, userId: string, data: Partial<{
    name: string;
    description: string | null;
    photoUrl: string | null;
    publicPrice: number;
    available: boolean;
    recipeId: string | null;
    discountType: DiscountType | null;
    discountValue: number | null;
    stock: number | null;
    category: string | null;
  }>): Promise<StoreProduct | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined)        { fields.push(`name = $${idx++}`);         values.push(data.name); }
    if ('description' in data)          { fields.push(`description = $${idx++}`);  values.push(data.description ?? null); }
    if ('photoUrl' in data)             { fields.push(`photo_url = $${idx++}`);    values.push(data.photoUrl ?? null); }
    if (data.publicPrice !== undefined) { fields.push(`public_price = $${idx++}`); values.push(data.publicPrice); }
    if (data.available !== undefined)   { fields.push(`available = $${idx++}`);    values.push(data.available); }
    if ('recipeId' in data)             { fields.push(`recipe_id = $${idx++}`);    values.push(data.recipeId ?? null); }
    if ('discountType' in data)         { fields.push(`discount_type = $${idx++}`); values.push(data.discountType ?? null); }
    if ('discountValue' in data)        { fields.push(`discount_value = $${idx++}`); values.push(data.discountValue ?? null); }
    if ('stock' in data)                { fields.push(`stock = $${idx++}`);          values.push(data.stock ?? null); }
    if ('category' in data)             { fields.push(`category = $${idx++}`);       values.push(data.category ?? null); }

    if (fields.length === 0) return this.getProductById(id, userId);

    fields.push(`updated_at = NOW()`);
    values.push(id, userId);

    const result = await pool.query(
      `UPDATE store_products SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return mapProduct(result.rows[0]);
  }

  async deleteProduct(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM store_products WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private async getProductById(id: string, userId: string): Promise<StoreProduct | null> {
    const result = await pool.query(
      'SELECT * FROM store_products WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) return null;
    return mapProduct(result.rows[0]);
  }

  async getAddons(userId: string): Promise<StoreAddon[]> {
    const result = await pool.query(
      'SELECT * FROM store_addons WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    return result.rows.map(mapAddon);
  }

  async createAddon(userId: string, data: { name: string; price: number; available: boolean }): Promise<StoreAddon> {
    const result = await pool.query(
      `INSERT INTO store_addons (user_id, name, price, available)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, data.name, data.price, data.available]
    );
    return mapAddon(result.rows[0]);
  }

  async updateAddon(id: string, userId: string, data: Partial<{ name: string; price: number; available: boolean }>): Promise<StoreAddon | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined)      { fields.push(`name = $${idx++}`);      values.push(data.name); }
    if (data.price !== undefined)     { fields.push(`price = $${idx++}`);     values.push(data.price); }
    if (data.available !== undefined) { fields.push(`available = $${idx++}`); values.push(data.available); }

    if (fields.length === 0) {
      const existing = await pool.query('SELECT * FROM store_addons WHERE id = $1 AND user_id = $2', [id, userId]);
      return existing.rows.length > 0 ? mapAddon(existing.rows[0]) : null;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, userId);

    const result = await pool.query(
      `UPDATE store_addons SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return mapAddon(result.rows[0]);
  }

  async deleteAddon(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM store_addons WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
