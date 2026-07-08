import { pool } from '../../infrastructure/database/connection';
import { PostgresSaleRepository } from '../../infrastructure/repositories/PostgresSaleRepository';
import { Order, OrderItem } from '../../infrastructure/repositories/PostgresOrderRepository';
import { PaymentMethod } from '../../domain/entities/Sale';

const saleRepo = new PostgresSaleRepository();

/** Traduz o método de pagamento da encomenda para o vocabulário das vendas. */
function salePaymentMethod(order: Order): PaymentMethod | null {
  const last = (order.payments ?? [])[order.payments.length - 1];
  // Sem pagamento registrado, usa a forma escolhida pelo cliente no pedido online
  const method = last?.method ?? order.paymentMethod;
  switch (method) {
    case 'pix': return 'pix';
    case 'cash': return 'dinheiro';
    case 'credit':
    case 'debit': return 'cartao';
    default: return null;
  }
}

/**
 * Encomendas aceitam produto digitado livremente (sem recipe_id), mas vendas
 * exigem uma receita cadastrada. Tenta o id e, na falta, casa pelo nome.
 */
async function resolveRecipeId(userId: string, recipeId: string | null | undefined, recipeName: string): Promise<string | null> {
  if (recipeId) {
    const byId = await pool.query('SELECT id FROM recipes WHERE id = $1 AND user_id = $2', [recipeId, userId]);
    if (byId.rows.length > 0) return recipeId;
  }
  if (recipeName?.trim()) {
    const byName = await pool.query(
      'SELECT id FROM recipes WHERE user_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1',
      [userId, recipeName]
    );
    if (byName.rows.length > 0) return byName.rows[0].id as string;
  }
  return null;
}

/**
 * Finalização automática: registra a(s) venda(s) de uma encomenda entregue.
 * Idempotente — se a encomenda já gerou venda, não cria de novo.
 * Retorna true se ao menos uma venda foi registrada nesta chamada.
 */
export async function registerSalesForDeliveredOrder(order: Order): Promise<boolean> {
  if (await saleRepo.existsForOrder(order.id, order.userId)) return false;

  const items: OrderItem[] = order.items && order.items.length > 0
    ? order.items
    : [{ recipeId: order.recipeId ?? undefined, recipeName: order.recipeName, quantity: order.quantity, unitPrice: order.unitPrice }];

  const paymentMethod = salePaymentMethod(order);
  let created = false;
  for (const item of items) {
    const recipeId = await resolveRecipeId(order.userId, item.recipeId, item.recipeName);
    if (!recipeId && !item.recipeName?.trim()) continue; // item sem receita e sem nome
    // Sem receita cadastrada, a venda é registrada com o nome do produto
    await saleRepo.create({
      recipeId,
      productName: recipeId ? null : item.recipeName,
      // sales.quantity_sold é INTEGER; encomendas aceitam fração
      quantitySold: Math.max(1, Math.round(item.quantity)),
      salePrice: item.unitPrice,
      saleDate: order.deliveryDate,
      notes: `Encomenda de ${order.clientName}`,
      paymentMethod,
      orderId: order.id,
    }, order.userId);
    created = true;
  }

  // Taxa de entrega (pedidos online): o total do pedido inclui a taxa, mas as
  // vendas são registradas por item. A diferença vira um lançamento próprio
  // para o faturamento bater com o valor cobrado do cliente.
  const itemsTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const fee = Math.round((order.totalPrice - itemsTotal) * 100) / 100;
  if (fee > 0) {
    await saleRepo.create({
      recipeId: null,
      productName: 'Taxa de entrega',
      quantitySold: 1,
      salePrice: fee,
      saleDate: order.deliveryDate,
      notes: `Encomenda de ${order.clientName}`,
      paymentMethod,
      orderId: order.id,
    }, order.userId);
    created = true;
  }
  return created;
}

/**
 * Desfaz a automação quando a encomenda deixa de estar entregue
 * (cancelada ou status revertido): remove as vendas geradas por ela.
 */
export async function removeSalesForOrder(orderId: string, userId: string): Promise<number> {
  return saleRepo.deleteByOrderId(orderId, userId);
}
