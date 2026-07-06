import { pool } from '../database/connection';

export type OrderStatus = 'pending' | 'in_progress' | 'done' | 'delivered' | 'cancelled';
export type PaymentMethodType = 'pix' | 'cash' | 'credit' | 'debit';

export interface OrderPayment {
  id: string;
  amount: number;
  method: PaymentMethodType;
  date: string;
}

export interface OrderItem {
  recipeId?: string;
  recipeName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  clientName: string;
  clientPhone?: string | null;
  recipeId?: string | null;
  recipeName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: string;
  deliveryTime?: string | null;
  status: OrderStatus;
  paid: boolean;
  paidAmount: number;
  payments: OrderPayment[];
  items: OrderItem[];
  notes?: string | null;
  source: 'manual' | 'online';
  createdAt: string;
}

export type OrderInput = Omit<Order, 'id' | 'userId' | 'createdAt'>;

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export class PostgresOrderRepository {
  async findAll(userId: string): Promise<Order[]> {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY delivery_date ASC, created_at DESC',
      [userId]
    );
    return result.rows.map(this.mapRow);
  }

  async findById(id: string, userId: string): Promise<Order | null> {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(userId: string, d: OrderInput): Promise<Order> {
    const result = await pool.query(
      `INSERT INTO orders
        (user_id, client_name, client_phone, recipe_id, recipe_name, quantity, unit_price,
         total_price, delivery_date, delivery_time, status, paid, paid_amount, payments, items, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        userId,
        d.clientName,
        d.clientPhone ?? null,
        isUuid(d.recipeId) ? d.recipeId : null,
        d.recipeName,
        d.quantity ?? 1,
        d.unitPrice ?? 0,
        d.totalPrice ?? 0,
        d.deliveryDate,
        d.deliveryTime ?? null,
        d.status ?? 'pending',
        d.paid ?? false,
        d.paidAmount ?? 0,
        JSON.stringify(d.payments ?? []),
        JSON.stringify(d.items ?? []),
        d.notes ?? null,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, userId: string, d: Partial<OrderInput>): Promise<Order | null> {
    const result = await pool.query(
      `UPDATE orders SET
        client_name   = COALESCE($3, client_name),
        client_phone  = COALESCE($4, client_phone),
        recipe_id     = COALESCE($5, recipe_id),
        recipe_name   = COALESCE($6, recipe_name),
        quantity      = COALESCE($7, quantity),
        unit_price    = COALESCE($8, unit_price),
        total_price   = COALESCE($9, total_price),
        delivery_date = COALESCE($10, delivery_date),
        delivery_time = COALESCE($11, delivery_time),
        status        = COALESCE($12, status),
        paid          = COALESCE($13, paid),
        paid_amount   = COALESCE($14, paid_amount),
        payments      = COALESCE($15, payments),
        items         = COALESCE($16, items),
        notes         = COALESCE($17, notes)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        id,
        userId,
        d.clientName ?? null,
        d.clientPhone ?? null,
        d.recipeId !== undefined && isUuid(d.recipeId) ? d.recipeId : null,
        d.recipeName ?? null,
        d.quantity ?? null,
        d.unitPrice ?? null,
        d.totalPrice ?? null,
        d.deliveryDate ?? null,
        d.deliveryTime ?? null,
        d.status ?? null,
        typeof d.paid === 'boolean' ? d.paid : null,
        d.paidAmount ?? null,
        d.payments !== undefined ? JSON.stringify(d.payments) : null,
        d.items !== undefined ? JSON.stringify(d.items) : null,
        d.notes ?? null,
      ]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 AND user_id = $2', [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): Order {
    const dd = row.delivery_date as Date | string;
    return {
      id: row.id as string,
      userId: row.user_id as string,
      clientName: row.client_name as string,
      clientPhone: (row.client_phone as string) ?? null,
      recipeId: (row.recipe_id as string) ?? null,
      recipeName: row.recipe_name as string,
      quantity: parseFloat(row.quantity as string),
      unitPrice: parseFloat(row.unit_price as string),
      totalPrice: parseFloat(row.total_price as string),
      deliveryDate: dd instanceof Date ? dd.toISOString().split('T')[0] : String(dd).split('T')[0],
      deliveryTime: (row.delivery_time as string) ?? null,
      status: row.status as OrderStatus,
      paid: row.paid as boolean,
      paidAmount: parseFloat(row.paid_amount as string),
      payments: (row.payments as OrderPayment[]) ?? [],
      items: (row.items as OrderItem[]) ?? [],
      notes: (row.notes as string) ?? null,
      deliveryAddress: (row.delivery_address as string) ?? null,
      source: (row.source as 'manual' | 'online') ?? 'manual',
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
