import { Pool, PoolClient } from 'pg';
import { pool } from '../../infrastructure/database/connection';
import { PostgresSaleRepository } from '../../infrastructure/repositories/PostgresSaleRepository';
import { CreateSaleDTO, Sale } from '../../domain/entities/Sale';
import { canCreateMore, getFreeSaleLimit, PREMIUM_ERROR_CODES } from '../../domain/services/premium';
import { normalizeDateToISO } from '../../domain/utils/date';

export class SaleRegistrationError extends Error {
  constructor(message: string, readonly status = 400, readonly code?: string) { super(message); }
}

/** Shared by the app and WhatsApp; caller may supply its current transaction. */
export async function registerSale(userId: string, data: CreateSaleDTO, transaction?: PoolClient, whatsappMessageId?: string): Promise<Sale> {
  if (!transaction) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sale = await registerSale(userId, data, client, whatsappMessageId);
      await client.query('COMMIT');
      return sale;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  const db = transaction;
  if (!Number.isSafeInteger(data.quantitySold) || data.quantitySold <= 0 || data.quantitySold > 100000 ||
      !Number.isFinite(data.salePrice) || data.salePrice <= 0 || data.salePrice > 1000000 ||
      data.quantitySold * data.salePrice > 99999999.99 ||
      (data.discount !== undefined && (!Number.isFinite(data.discount) || data.discount < 0 || data.discount > data.quantitySold * data.salePrice))) {
    throw new SaleRegistrationError('Quantidade, preço ou desconto inválidos.');
  }
  const date = normalizeDateToISO(data.saleDate);
  if (!date) throw new SaleRegistrationError('Data da venda inválida. Use o formato dd/mm/aaaa.');
  if (data.paymentMethod && !['dinheiro', 'cartao', 'credito', 'debito', 'pix'].includes(data.paymentMethod)) {
    throw new SaleRegistrationError('Forma de pagamento inválida.');
  }
  // Serialize quota checks for both app requests and WhatsApp confirmations.
  const users = await db.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
  const user = users.rows[0];
  if (!user) throw new SaleRegistrationError('Usuário não encontrado.', 401);
  const repo = new PostgresSaleRepository(db as Pick<Pool, 'query'>);
  if (whatsappMessageId) {
    const existing = await db.query('SELECT id FROM sales WHERE whatsapp_message_id=$1 AND user_id=$2', [whatsappMessageId, userId]);
    if (existing.rows[0]) return (await repo.findById(existing.rows[0].id, userId))!;
  }
  const count = await db.query('SELECT COUNT(*)::int AS count FROM sales WHERE user_id=$1', [userId]);
  const limit = await getFreeSaleLimit();
  if (!canCreateMore({ isPremium: user.is_premium, premiumUntil: user.premium_until }, 'sales', count.rows[0].count, limit)) {
    throw new SaleRegistrationError(`Você atingiu o limite de ${limit} vendas do plano gratuito.`, 403, PREMIUM_ERROR_CODES.sales);
  }
  const sale = await repo.create({ ...data, saleDate: date }, userId);
  if (whatsappMessageId) await db.query('UPDATE sales SET whatsapp_message_id=$1 WHERE id=$2', [whatsappMessageId, sale.id]);
  return sale;
}
