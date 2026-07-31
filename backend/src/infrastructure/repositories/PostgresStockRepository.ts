import { pool } from '../database/connection';
import {
  StockItem,
  StockMovement,
  StockDeductItem,
  LowStockAlert,
} from '../../domain/entities/StockItem';

function mapItem(row: any): StockItem {
  return {
    id: row.id,
    userId: row.user_id,
    ingredientId: row.ingredient_id,
    quantity: parseFloat(row.quantity),
    minQuantity: parseFloat(row.min_quantity),
    unit: row.unit,
    updatedAt: row.updated_at,
  };
}

function mapMovement(row: any): StockMovement {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    type: row.type,
    quantity: parseFloat(row.quantity),
    balance: parseFloat(row.balance),
    reason: row.reason,
    createdAt: row.created_at,
  };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export class PostgresStockRepository {
  async getState(userId: string): Promise<{ items: StockItem[]; movements: StockMovement[] }> {
    const [itemsRes, movesRes] = await Promise.all([
      pool.query(`SELECT * FROM stock_items WHERE user_id = $1`, [userId]),
      pool.query(
        `SELECT * FROM stock_movements WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [userId]
      ),
    ]);
    return {
      items: itemsRes.rows.map(mapItem),
      movements: movesRes.rows.map(mapMovement),
    };
  }

  /** Define o saldo absoluto (inventário manual) — movimento 'set'. */
  async setQuantity(
    userId: string,
    ingredientId: string,
    quantity: number,
    minQuantity: number,
    unit: string
  ): Promise<StockItem> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const upsert = await client.query(
        `INSERT INTO stock_items (user_id, ingredient_id, quantity, min_quantity, unit)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, ingredient_id)
         DO UPDATE SET quantity = $3, min_quantity = $4, unit = $5, updated_at = NOW()
         RETURNING *`,
        [userId, ingredientId, round3(quantity), round3(minQuantity), unit]
      );
      const item = mapItem(upsert.rows[0]);
      await client.query(
        `INSERT INTO stock_movements (user_id, ingredient_id, type, quantity, balance, reason)
         VALUES ($1, $2, 'set', $3, $4, $5)`,
        [userId, ingredientId, item.quantity, item.quantity, 'Ajuste de inventário']
      );
      await client.query('COMMIT');
      return item;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Soma ao saldo (reposição) — movimento 'in'. */
  async addEntry(
    userId: string,
    ingredientId: string,
    quantity: number,
    unit: string,
    reason?: string | null
  ): Promise<StockItem> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const upsert = await client.query(
        `INSERT INTO stock_items (user_id, ingredient_id, quantity, min_quantity, unit)
         VALUES ($1, $2, $3, 0, $4)
         ON CONFLICT (user_id, ingredient_id)
         DO UPDATE SET quantity = stock_items.quantity + $3, unit = $4, updated_at = NOW()
         RETURNING *`,
        [userId, ingredientId, round3(quantity), unit]
      );
      const item = mapItem(upsert.rows[0]);
      await client.query(
        `INSERT INTO stock_movements (user_id, ingredient_id, type, quantity, balance, reason)
         VALUES ($1, $2, 'in', $3, $4, $5)`,
        [userId, ingredientId, round3(quantity), item.quantity, reason ?? 'Reposição']
      );
      await client.query('COMMIT');
      return item;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Aplica a baixa automática de uma venda. Só desconta ingredientes que já
   * têm saldo controlado (com stock_item). Retorna os itens que ficaram
   * abaixo do estoque mínimo ou zerados, para alerta.
   */
  async deduct(userId: string, items: StockDeductItem[]): Promise<LowStockAlert[]> {
    const lowStock: LowStockAlert[] = [];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const it of items) {
        const qty = round3(it.quantity);
        if (!it.ingredientId || qty <= 0) continue;
        const upd = await client.query(
          `UPDATE stock_items
           SET quantity = ROUND((quantity - $3)::numeric, 3), updated_at = NOW()
           WHERE user_id = $1 AND ingredient_id = $2
           RETURNING *`,
          [userId, it.ingredientId, qty]
        );
        if (upd.rowCount === 0) continue; // ingrediente não controlado → ignora
        const item = mapItem(upd.rows[0]);
        await client.query(
          `INSERT INTO stock_movements (user_id, ingredient_id, type, quantity, balance, reason)
           VALUES ($1, $2, 'out', $3, $4, $5)`,
          [userId, it.ingredientId, qty, item.quantity, it.reason ?? 'Venda']
        );
        if (item.quantity <= item.minQuantity || item.quantity <= 0) {
          lowStock.push({
            ingredientId: item.ingredientId,
            balance: item.quantity,
            minQuantity: item.minQuantity,
          });
        }
      }
      await client.query('COMMIT');
      return lowStock;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
