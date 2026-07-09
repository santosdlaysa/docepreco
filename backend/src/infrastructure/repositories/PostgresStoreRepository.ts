import { pool } from '../database/connection';
import { DiscountType } from '../../domain/utils/discount';

export interface StoreSettings {
  id: string;
  userId: string;
  active: boolean;
  storeName: string;
  slug: string;
  storeLink: string;
  description?: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue?: number | null;
  deliveryFee?: number | null;
  coverImageUrl?: string | null;
  paymentMethods: string[];
  address?: string | null;
  createdAt: string;
  updatedAt: string;
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
  return {
    id: row.id as string,
    userId: row.user_id as string,
    active: row.active as boolean,
    storeName: row.store_name as string,
    slug,
    storeLink: `${BASE_URL}/${slug}`,
    description: row.description as string | null,
    acceptsDelivery: row.accepts_delivery as boolean,
    acceptsPickup: row.accepts_pickup as boolean,
    minOrderValue: row.min_order_value ? Number(row.min_order_value) : null,
    deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : null,
    coverImageUrl: (row.cover_image_url as string | null) ?? null,
    paymentMethods: (row.payment_methods as string[] | null) ?? ['pix', 'cash', 'credit', 'debit'],
    address: (row.address as string | null) ?? null,
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
    storeName: string;
    description: string | null;
    acceptsDelivery: boolean;
    acceptsPickup: boolean;
    minOrderValue: number | null;
    deliveryFee: number | null;
    coverImageUrl: string | null;
    paymentMethods: string[];
    address: string | null;
  }>): Promise<StoreSettings> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.active !== undefined)         { fields.push(`active = $${idx++}`);           values.push(data.active); }
    if (data.storeName !== undefined)       { fields.push(`store_name = $${idx++}`);       values.push(data.storeName); }
    if ('description' in data)             { fields.push(`description = $${idx++}`);      values.push(data.description ?? null); }
    if (data.acceptsDelivery !== undefined) { fields.push(`accepts_delivery = $${idx++}`); values.push(data.acceptsDelivery); }
    if (data.acceptsPickup !== undefined)   { fields.push(`accepts_pickup = $${idx++}`);   values.push(data.acceptsPickup); }
    if ('minOrderValue' in data)           { fields.push(`min_order_value = $${idx++}`);  values.push(data.minOrderValue ?? null); }
    if ('deliveryFee' in data)             { fields.push(`delivery_fee = $${idx++}`);     values.push(data.deliveryFee ?? null); }
    if ('coverImageUrl' in data)           { fields.push(`cover_image_url = $${idx++}`); values.push(data.coverImageUrl ?? null); }
    if (data.paymentMethods !== undefined)  { fields.push(`payment_methods = $${idx++}`); values.push(JSON.stringify(data.paymentMethods)); }
    if ('address' in data)                 { fields.push(`address = $${idx++}`);          values.push(data.address ?? null); }

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
  }): Promise<StoreProduct> {
    const result = await pool.query(
      `INSERT INTO store_products (user_id, name, description, photo_url, public_price, available, recipe_id, discount_type, discount_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, data.name, data.description ?? null, data.photoUrl ?? null, data.publicPrice, data.available, data.recipeId ?? null, data.discountType ?? null, data.discountValue ?? null]
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
}
