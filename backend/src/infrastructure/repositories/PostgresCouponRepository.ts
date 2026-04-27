import { pool } from '../database/connection';

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export class PostgresCouponRepository {
  async findAll(): Promise<Coupon[]> {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    return result.rows.map(this.mapRow);
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const result = await pool.query('SELECT * FROM coupons WHERE code = $1', [code]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(data: { code: string; discountPercent: number; maxUses: number; expiresAt?: string | null; isActive: boolean }): Promise<Coupon> {
    const result = await pool.query(
      `INSERT INTO coupons (code, discount_percent, max_uses, expires_at, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.code, data.discountPercent, data.maxUses, data.expiresAt ?? null, data.isActive]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<{ code: string; discountPercent: number; maxUses: number; expiresAt: string | null; isActive: boolean }>): Promise<Coupon | null> {
    const result = await pool.query(
      `UPDATE coupons SET
        code = COALESCE($2, code),
        discount_percent = COALESCE($3, discount_percent),
        max_uses = COALESCE($4, max_uses),
        expires_at = COALESCE($5, expires_at),
        is_active = COALESCE($6, is_active)
       WHERE id = $1 RETURNING *`,
      [id, data.code ?? null, data.discountPercent ?? null, data.maxUses ?? null, data.expiresAt !== undefined ? data.expiresAt : null, data.isActive ?? null]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async incrementUsage(id: string): Promise<void> {
    await pool.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [id]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): Coupon {
    return {
      id: row.id as string,
      code: row.code as string,
      discountPercent: row.discount_percent as number,
      maxUses: row.max_uses as number,
      usedCount: row.used_count as number,
      expiresAt: row.expires_at ? (row.expires_at as Date).toISOString() : null,
      isActive: row.is_active as boolean,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
