import { pool } from '../database/connection';
import { CreatePurchaseInvoiceDTO, PurchaseInvoice, PurchaseInvoiceItem } from '../../domain/entities/PurchaseInvoice';

const money = (value: unknown) => Math.round(Number(value) * 100) / 100;
const qty3 = (value: unknown) => Math.round(Number(value) * 1000) / 1000;

function mapItem(row: any): PurchaseInvoiceItem {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    description: row.description,
    quantity: Number(row.quantity),
    unit: row.unit,
    total: Number(row.total),
    updateIngredientPrice: row.update_ingredient_price,
  };
}

function mapInvoice(row: any, items: PurchaseInvoiceItem[] = []): PurchaseInvoice {
  const date = row.purchase_date instanceof Date
    ? row.purchase_date.toISOString().slice(0, 10)
    : String(row.purchase_date).slice(0, 10);
  return {
    id: row.id,
    userId: row.user_id,
    supplier: row.supplier,
    documentNumber: row.document_number,
    purchaseDate: date,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    freight: Number(row.freight),
    total: Number(row.total),
    notes: row.notes,
    attachmentUrl: row.attachment_url,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresPurchaseInvoiceRepository {
  async findAll(userId: string, month?: string): Promise<PurchaseInvoice[]> {
    const params: unknown[] = [userId];
    let where = 'p.user_id = $1';
    if (month) {
      params.push(month);
      where += ` AND TO_CHAR(p.purchase_date, 'YYYY-MM') = $2`;
    }
    const result = await pool.query(
      `SELECT p.*, COALESCE(json_agg(json_build_object(
         'id', i.id, 'ingredient_id', i.ingredient_id, 'description', i.description,
         'quantity', i.quantity, 'unit', i.unit, 'total', i.total,
         'update_ingredient_price', i.update_ingredient_price
       ) ORDER BY i.created_at) FILTER (WHERE i.id IS NOT NULL), '[]') AS invoice_items
       FROM purchase_invoices p
       LEFT JOIN purchase_invoice_items i ON i.invoice_id = p.id
       WHERE ${where}
       GROUP BY p.id
       ORDER BY p.purchase_date DESC, p.created_at DESC`,
      params
    );
    return result.rows.map(row => mapInvoice(row, row.invoice_items.map(mapItem)));
  }

  async findById(id: string, userId: string): Promise<PurchaseInvoice | null> {
    const result = await pool.query(
      `SELECT p.*, COALESCE(json_agg(json_build_object(
         'id', i.id, 'ingredient_id', i.ingredient_id, 'description', i.description,
         'quantity', i.quantity, 'unit', i.unit, 'total', i.total,
         'update_ingredient_price', i.update_ingredient_price
       ) ORDER BY i.created_at) FILTER (WHERE i.id IS NOT NULL), '[]') AS invoice_items
       FROM purchase_invoices p
       LEFT JOIN purchase_invoice_items i ON i.invoice_id = p.id
       WHERE p.id = $1 AND p.user_id = $2
       GROUP BY p.id`,
      [id, userId]
    );
    const row = result.rows[0];
    return row ? mapInvoice(row, row.invoice_items.map(mapItem)) : null;
  }

  async create(userId: string, data: CreatePurchaseInvoiceDTO): Promise<PurchaseInvoice> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ingredientIds = [...new Set(data.items.map(item => item.ingredientId))];
      const owned = await client.query(
        `SELECT id, name, unit FROM ingredients WHERE user_id = $1 AND id = ANY($2::uuid[])`,
        [userId, ingredientIds]
      );
      if (owned.rowCount !== ingredientIds.length) throw new Error('Um ou mais ingredientes não pertencem ao usuário');
      const ingredientNames = new Map(owned.rows.map(row => [row.id, row.name]));
      const ingredientUnits = new Map(owned.rows.map(row => [row.id, row.unit]));

      const subtotal = money(data.items.reduce((sum, item) => sum + Number(item.total), 0));
      const discount = money(data.discount ?? 0);
      const freight = money(data.freight ?? 0);
      const total = money(subtotal - discount + freight);
      if (total < 0) throw new Error('O total da compra não pode ser negativo');

      const invoiceResult = await client.query(
        `INSERT INTO purchase_invoices
          (user_id, supplier, document_number, purchase_date, payment_method, payment_status,
           subtotal, discount, freight, total, notes, attachment_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [userId, data.supplier.trim(), data.documentNumber?.trim() || null, data.purchaseDate,
         data.paymentMethod?.trim() || null, data.paymentStatus, subtotal, discount, freight,
         total, data.notes?.trim() || null, data.attachmentUrl?.trim() || null]
      );
      const invoiceRow = invoiceResult.rows[0];
      const items: PurchaseInvoiceItem[] = [];

      for (const raw of data.items) {
        const quantity = qty3(raw.quantity);
        const lineTotal = money(raw.total);
        const updatePrice = raw.updateIngredientPrice !== false;
        const description = raw.description?.trim() || ingredientNames.get(raw.ingredientId) || 'Ingrediente';
        if (ingredientUnits.get(raw.ingredientId) !== raw.unit) {
          throw new Error(`A unidade de ${description} deve ser ${ingredientUnits.get(raw.ingredientId)}`);
        }
        const itemResult = await client.query(
          `INSERT INTO purchase_invoice_items
            (invoice_id, ingredient_id, description, quantity, unit, total, update_ingredient_price)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [invoiceRow.id, raw.ingredientId, description, quantity, raw.unit, lineTotal, updatePrice]
        );
        items.push(mapItem(itemResult.rows[0]));

        const stockResult = await client.query(
          `INSERT INTO stock_items (user_id, ingredient_id, quantity, min_quantity, unit)
           VALUES ($1,$2,$3,0,$4)
           ON CONFLICT (user_id, ingredient_id)
           DO UPDATE SET quantity = stock_items.quantity + $3, unit = $4, updated_at = NOW()
           RETURNING quantity`,
          [userId, raw.ingredientId, quantity, raw.unit]
        );
        await client.query(
          `INSERT INTO stock_movements (user_id, ingredient_id, type, quantity, balance, reason)
           VALUES ($1,$2,'in',$3,$4,$5)`,
          [userId, raw.ingredientId, quantity, stockResult.rows[0].quantity,
           `Compra ${data.documentNumber ? `NF ${data.documentNumber}` : data.supplier}`]
        );

        await client.query(
          `INSERT INTO ingredient_price_history (user_id, ingredient_id, price, purchase_quantity, unit)
           VALUES ($1,$2,$3,$4,$5)`,
          [userId, raw.ingredientId, lineTotal, quantity, raw.unit]
        );
        if (updatePrice) {
          await client.query(
            `UPDATE ingredients SET purchase_price = $1, purchase_quantity = $2, unit = $3,
              purchase_unit_label = NULL, purchase_unit_weight = NULL, updated_at = NOW()
             WHERE id = $4 AND user_id = $5`,
            [lineTotal, quantity, raw.unit, raw.ingredientId, userId]
          );
        }
      }

      await client.query('COMMIT');
      return mapInvoice(invoiceRow, items);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
