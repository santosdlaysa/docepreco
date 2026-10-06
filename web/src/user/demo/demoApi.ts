import type {
  Recipe, Ingredient, CalculationResult, Sale, Order, CashSession, StockItem, Client, Expense,
  PurchaseInvoice, Season, StoreProduct, StoreAddon, SupportMessage, PriceEntry,
} from '../userApi';
import type { ReferralData } from '../engagementApi';
import type { ProductionPlan } from '../productionPlan';
import { getIngredientUsageCost } from '../ingredientPricing';
import { getSubRecipeUsageCost } from '../subRecipePricing';
import { computeUsageForSale } from '../stockDeduction';
import { convertUnitOrNull } from '../units';
import { getDemoDb, saveDemoDb, DEMO_BLOCKED_EVENT } from './demoMode';
import i18n from '../../i18n';
import type { DemoDb, DemoCashSession } from './demoData';

/**
 * "Servidor" local do modo demonstração: atende as mesmas rotas que a web usa,
 * a partir dos dados de exemplo. Como no app (demoApi do mobile), as alterações
 * valem só dentro da demonstração; pagamentos, envios e dados da conta ficam
 * bloqueados com o convite para criar a conta (useDemoGuard). Nenhuma chamada
 * vai para a API real.
 */

export class DemoError extends Error {
  status: number;
  code: string;
  constructor(message: string, code: 'DEMO_BLOCKED' | 'DEMO_UNAVAILABLE' | 'DEMO_NOT_FOUND', status = 403) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function blocked(): never {
  try { window.dispatchEvent(new CustomEvent(DEMO_BLOCKED_EVENT)); } catch { /* sem window */ }
  throw new DemoError(i18n.t('app:demo.blockedMessage'), 'DEMO_BLOCKED');
}
const unavailable = (): never => { throw new DemoError(i18n.t('app:demo.unavailable'), 'DEMO_UNAVAILABLE', 404); };
// O rótulo vem em português do chamador; em inglês usa um genérico ("Item not found.").
const notFound = (what: string): never => {
  const label = i18n.language === 'en' ? i18n.t('app:demo.notFoundItem') : what;
  throw new DemoError(i18n.t('app:demo.notFound', { what: label }), 'DEMO_NOT_FOUND', 404);
};

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function nextId(db: DemoDb, prefix: string): string {
  db.seq += 1;
  return `demo-${prefix}-${db.seq}`;
}

/* ── Cálculos ─────────────────────────────────────────────────────────── */

function calculate(db: DemoDb, recipe: Recipe): CalculationResult {
  let ingredientsCost = 0;
  for (const row of recipe.ingredients) {
    const ing = db.ingredients.find(i => i.id === row.ingredientId);
    if (!ing) continue;
    try { ingredientsCost += getIngredientUsageCost(ing, row.quantityUsed, row.unit); } catch { /* unidade incompatível */ }
  }
  let subRecipesCost = 0;
  for (const row of recipe.subRecipes ?? []) {
    const sub = db.recipes.find(r => r.id === row.subRecipeId);
    if (!sub) continue;
    try { subRecipesCost += getSubRecipeUsageCost(sub, db.ingredients, row.quantityUsed, row.unit); } catch { /* sem rendimento */ }
  }
  const additionalCostTotal = recipe.additionalCosts.reduce((s, c) => s + c.value * (c.costType === 'unit' ? recipe.yield : 1), 0);
  const totalCost = ingredientsCost + subRecipesCost + additionalCostTotal;
  const costPerUnit = recipe.yield > 0 ? totalCost / recipe.yield : 0;
  const suggestedPrice = costPerUnit * (1 + recipe.profitMargin / 100);
  return {
    totalCost: round2(totalCost),
    costPerUnit,
    suggestedPrice: round2(suggestedPrice),
    estimatedProfit: round2((suggestedPrice - costPerUnit) * recipe.yield),
    profitMargin: recipe.profitMargin,
    ingredientsCost: round2(ingredientsCost),
    additionalCostTotal: round2(additionalCostTotal),
    subRecipesCost: round2(subRecipesCost),
  };
}

function buildSale(db: DemoDb, body: Record<string, unknown>, base?: Sale): Sale {
  const recipeId = (body.recipeId ?? base?.recipeId ?? null) as string | null;
  const recipe = recipeId ? db.recipes.find(r => r.id === recipeId) : undefined;
  const quantitySold = Number(body.quantitySold ?? base?.quantitySold ?? 1) || 1;
  const salePrice = Number(body.salePrice ?? base?.salePrice ?? 0) || 0;
  const discount = Math.min(Number(body.discount ?? base?.discount ?? 0) || 0, quantitySold * salePrice);
  return {
    ...(base ?? {}),
    ...(body as Partial<Sale>),
    id: base?.id ?? nextId(db, 'sale'),
    recipeId: recipeId as string,
    recipeName: recipe?.name ?? (body.productName as string) ?? base?.recipeName ?? 'Produto avulso',
    quantitySold,
    salePrice,
    discount,
    totalRevenue: round2(quantitySold * salePrice - discount),
    saleDate: (body.saleDate as string) ?? base?.saleDate ?? today(),
    createdAt: base?.createdAt ?? now(),
  };
}

function orderTotals(o: Order): Order {
  const items = o.items && o.items.length > 0 ? o.items : [{ recipeId: o.recipeId, recipeName: o.recipeName, quantity: o.quantity, unitPrice: o.unitPrice }];
  const totalPrice = o.totalPrice || round2(items.reduce((s, i) => s + i.quantity * i.unitPrice - (('discount' in i && i.discount) || 0), 0));
  const payments = o.payments ?? [];
  const paidAmount = payments.length > 0 ? round2(payments.reduce((s, p) => s + p.amount, 0)) : (o.paidAmount ?? 0);
  const covered = totalPrice > 0 && paidAmount >= totalPrice - 0.005;
  return { ...o, totalPrice, payments, paidAmount, paid: payments.length > 0 ? covered : (!!o.paid || covered) };
}

/** Ao entregar, registra as vendas da encomenda (como OrderSaleAutomation no backend). */
function registerOrderSales(db: DemoDb, o: Order): void {
  const items = o.items && o.items.length > 0 ? o.items : [{ recipeId: o.recipeId, recipeName: o.recipeName, quantity: o.quantity, unitPrice: o.unitPrice, discount: 0 }];
  for (const it of items) {
    db.sales.unshift(buildSale(db, {
      recipeId: it.recipeId ?? null, productName: it.recipeName, quantitySold: it.quantity, salePrice: it.unitPrice,
      discount: ('discount' in it && it.discount) || 0, saleDate: today(), clientName: o.clientName, orderId: o.id,
      notes: `Encomenda de ${o.clientName}`,
    }));
  }
}

function cashView(db: DemoDb, s: DemoCashSession): CashSession {
  const end = s.closedAt ?? '9999';
  const sales = db.sales.filter(x => x.createdAt >= s.openedAt && x.createdAt <= end);
  const byMethod = { dinheiro: 0, cartao: 0, credito: 0, debito: 0, pix: 0, outros: 0 };
  for (const x of sales) {
    const m = (x.paymentMethod ?? 'outros') as keyof typeof byMethod;
    byMethod[m in byMethod ? m : 'outros'] += x.totalRevenue;
  }
  const sangriaTotal = s.movements.filter(m => m.type === 'sangria').reduce((t, m) => t + m.amount, 0);
  const suprimentoTotal = s.movements.filter(m => m.type === 'suprimento').reduce((t, m) => t + m.amount, 0);
  const expectedCash = round2(s.openingAmount + byMethod.dinheiro + suprimentoTotal - sangriaTotal);
  return {
    ...s,
    salesTotal: round2(sales.reduce((t, x) => t + x.totalRevenue, 0)),
    salesCount: sales.length,
    byMethod,
    sangriaTotal,
    suprimentoTotal,
    expectedCash,
    difference: s.closingCounted == null ? null : round2(s.closingCounted - expectedCash),
    sales: sales.map(x => ({ id: x.id, recipeName: x.recipeName, quantitySold: x.quantitySold, totalRevenue: x.totalRevenue, paymentMethod: x.paymentMethod ?? null, createdAt: x.createdAt })),
  };
}

function stockMove(db: DemoDb, ingredientId: string, type: 'in' | 'out' | 'set', quantity: number, unit: string, reason: string | null) {
  let item = db.stockItems.find(i => i.ingredientId === ingredientId);
  if (!item) {
    if (type === 'out') return null; // não controlado → ignora (igual ao backend)
    item = { ingredientId, quantity: 0, minQuantity: 0, unit, updatedAt: now() };
    db.stockItems.push(item);
  }
  item.quantity = Math.round((type === 'set' ? quantity : type === 'in' ? item.quantity + quantity : item.quantity - quantity) * 1000) / 1000;
  item.updatedAt = now();
  db.stockMovements.unshift({ id: nextId(db, 'mov'), ingredientId, type, quantity, balance: item.quantity, reason, createdAt: now() });
  return item;
}

function productionPlan(db: DemoDb, start: string, end: string): ProductionPlan {
  const orders = db.orders.filter(o => o.deliveryDate && o.deliveryDate >= start && o.deliveryDate <= end && !['delivered', 'cancelled', 'draft'].includes(o.status));
  const products = new Map<string, { key: string; name: string; quantity: number; batches: number | null }>();
  const required: Record<string, number> = {};
  const warnings: string[] = [];
  for (const o of orders) {
    const items = o.items && o.items.length > 0 ? o.items : [{ recipeId: o.recipeId, recipeName: o.recipeName, quantity: o.quantity, unitPrice: o.unitPrice }];
    for (const it of items) {
      const recipe = it.recipeId ? db.recipes.find(r => r.id === it.recipeId) : undefined;
      const key = recipe?.id ?? `avulso:${it.recipeName}`;
      const p = products.get(key) ?? { key, name: it.recipeName, quantity: 0, batches: recipe ? 0 : null };
      p.quantity += it.quantity;
      if (recipe && p.batches !== null) p.batches = p.quantity / (recipe.yield || 1);
      products.set(key, p);
      if (!recipe) { warnings.push(`"${it.recipeName}" não tem receita cadastrada.`); continue; }
      for (const [id, q] of Object.entries(computeUsageForSale(recipe, db.recipes, db.ingredients, it.quantity))) {
        required[id] = (required[id] ?? 0) + q;
      }
    }
  }
  const ingredients = Object.entries(required).map(([id, req]) => {
    const ing = db.ingredients.find(i => i.id === id);
    const stock = db.stockItems.find(s => s.ingredientId === id);
    const available = stock ? (convertUnitOrNull(stock.quantity, stock.unit, ing?.unit ?? stock.unit) ?? stock.quantity) : null;
    return { id, name: ing?.name ?? 'Ingrediente', unit: ing?.unit ?? 'g', required: req, available, missing: Math.max(0, req - (available ?? 0)) };
  });
  return { start, end, orderCount: orders.length, products: [...products.values()], ingredients, warnings };
}

/* ── Roteador ─────────────────────────────────────────────────────────── */

type Body = Record<string, unknown>;

function crud<T extends { id: string }>(
  db: DemoDb, list: T[], prefix: string, label: string, method: string, id: string | undefined, body: Body,
  build?: (body: Body, base?: T) => T,
): unknown {
  if (!id) {
    if (method === 'GET') return list;
    if (method === 'POST') {
      const item = build ? build(body) : ({ ...body, id: nextId(db, prefix), createdAt: now(), updatedAt: now() } as unknown as T);
      list.unshift(item);
      return item;
    }
  } else {
    const idx = list.findIndex(x => x.id === id);
    if (idx < 0) return notFound(label);
    if (method === 'GET') return list[idx];
    if (method === 'PUT' || method === 'PATCH') {
      list[idx] = build ? build(body, list[idx]) : ({ ...list[idx], ...body, id, updatedAt: now() } as T);
      return list[idx];
    }
    if (method === 'DELETE') {
      list.splice(idx, 1);
      return { success: true };
    }
  }
  return unavailable();
}

function route(db: DemoDb, method: string, path: string, query: URLSearchParams, body: Body): unknown {
  const seg = path.split('/').filter(Boolean);
  const [root, a, b] = seg;

  switch (root) {
    /* Conta */
    case 'auth':
      if (a === 'me' && method === 'GET') return db.user;
      if (a === 'profile' && method === 'PATCH') { db.user = { ...db.user, ...(body as object) }; return db.user; }
      if (a === 'accept-lgpd') { db.user.lgpdAcceptedAt = now(); return db.user; }
      return blocked(); // senha, excluir conta, sugestão, login social…

    case 'admin':
      if (a === 'settings' && b === 'plans') return { freeRecipeLimit: 3, premiumPrice: 19.99, masterPrice: 39.99 };
      if (a === 'feedbacks') return { success: true };
      return blocked(); // cupons etc.

    case 'conversion-events':
      return { success: true };

    /* Pagamentos: nunca na demonstração */
    case 'pix':
      if (method === 'GET' && (a === 'status' || a === 'subscription')) return null;
      if (method === 'GET' && a === 'upgrade' && b === 'preview') return { eligible: false };
      return blocked();
    case 'stripe':
      return blocked();
    case 'banners':
      if (method === 'GET' && (a === 'active' || a === 'carousel')) return [];
      return blocked();

    case 'referrals': {
      const data: ReferralData = { code: 'DEMO2026', validCount: 1, rewardedCount: 0, pendingCount: 1, target: 3, cycle: 1, remainingToReward: 2, rewardsEarned: 0, history: [] };
      return data;
    }

    /* Suporte */
    case 'support':
      if (a === 'messages' && method === 'GET') return db.supportMessages;
      if (a === 'messages' && method === 'POST') {
        const msg: SupportMessage = { id: nextId(db, 'msg'), userId: db.user.id, senderType: 'user', message: String(body.message ?? ''), imageUrl: (body.imageUrl as string) ?? null, readAt: null, createdAt: now() };
        db.supportMessages.push(msg, {
          id: nextId(db, 'msg'), userId: db.user.id, senderType: 'admin', imageUrl: null, readAt: null, createdAt: now(),
          message: i18n.t('app:demo.supportReply'),
        });
        return msg;
      }
      if (a === 'unread') return { unreadCount: 0 };
      if (a === 'typing') return { typing: false };
      if (a === 'discount-offer') return null;
      return unavailable();

    /* Dados */
    case 'stats': {
      const month = today().slice(0, 7);
      const monthSales = db.sales.filter(s => s.saleDate.startsWith(month));
      return {
        recipesCount: db.recipes.length,
        ingredientsCount: db.ingredients.length,
        monthlySalesCount: monthSales.length,
        monthlyRevenue: round2(monthSales.reduce((t, s) => t + s.totalRevenue, 0)),
        recentSales: [...db.sales].sort((x, y) => y.saleDate.localeCompare(x.saleDate)).slice(0, 5)
          .map(s => ({ id: s.id, recipeName: s.recipeName, quantitySold: s.quantitySold, totalRevenue: s.totalRevenue, saleDate: s.saleDate })),
      };
    }

    case 'recipes':
      if (a && b === 'calculate') {
        const recipe = db.recipes.find(r => r.id === a);
        return recipe ? calculate(db, recipe) : notFound('Receita');
      }
      return crud<Recipe>(db, db.recipes, 'rec', 'Receita', method, a, body, (bd, base) => ({
        subRecipes: [], additionalCosts: [], ingredients: [], ...(base ?? {}), ...(bd as Partial<Recipe>),
        id: base?.id ?? nextId(db, 'rec'), createdAt: base?.createdAt ?? now(), updatedAt: now(),
      } as Recipe));

    case 'ingredients':
      if (a && b === 'price-history') {
        if (method === 'GET') return db.priceHistory.filter(p => p.ingredientId === a).sort((x, y) => y.recordedAt.localeCompare(x.recordedAt));
        const entry: PriceEntry = { id: nextId(db, 'ph'), ingredientId: a, price: Number(body.price ?? 0), purchaseQuantity: Number(body.purchaseQuantity ?? 0), unit: String(body.unit ?? 'g'), purchaseUnitWeight: (body.purchaseUnitWeight as number) ?? null, recordedAt: now() };
        db.priceHistory.push(entry);
        return entry;
      }
      if (method === 'DELETE' && a) {
        // Tira também do estoque, para não sobrar saldo de ingrediente apagado.
        db.stockItems = db.stockItems.filter(s => s.ingredientId !== a);
      }
      return crud<Ingredient>(db, db.ingredients, 'ing', 'Ingrediente', method, a, body);

    case 'sales':
      if (!a && method === 'GET') {
        const period = query.get('period');
        if (period === 'month') return db.sales.filter(s => s.saleDate.startsWith(today().slice(0, 7)));
        if (period === 'week') {
          const d = new Date(); d.setDate(d.getDate() - 7);
          return db.sales.filter(s => s.saleDate >= d.toISOString().slice(0, 10));
        }
        return db.sales;
      }
      return crud<Sale>(db, db.sales, 'sale', 'Venda', method, a, body, (bd, base) => buildSale(db, bd, base));

    case 'orders': {
      if (a === 'production-plan') return productionPlan(db, query.get('start') ?? today(), query.get('end') ?? today());
      const before = a ? db.orders.find(o => o.id === a) : undefined;
      const result = crud<Order>(db, db.orders, 'ord', 'Encomenda', method, a, body, (bd, base) => orderTotals({
        payments: [], paidAmount: 0, paid: false, source: 'manual', deliveryDate: null, ...(base ?? {}), ...(bd as Partial<Order>),
        id: base?.id ?? nextId(db, 'ord'), createdAt: base?.createdAt ?? now(),
      } as Order)) as Order;
      if ((method === 'PUT' || method === 'POST') && result?.status === 'delivered' && before?.status !== 'delivered') {
        registerOrderSales(db, result);
        return { ...result, saleRegistered: true };
      }
      return result;
    }

    case 'clients':
      return crud<Client>(db, db.clients, 'cli', 'Cliente', method, a, body);

    case 'seasons':
      if (a === 'active') {
        const t = today();
        return db.seasons.find(s => s.startDate <= t && s.endDate >= t) ?? null;
      }
      return crud<Season>(db, db.seasons, 'sea', 'Temporada', method, a, body);

    case 'expenses': {
      if (a === 'summary') {
        const month = query.get('month') ?? today().slice(0, 7);
        const list = db.expenses.filter(e => e.expenseDate.startsWith(month));
        const byCat = new Map<string, number>();
        for (const e of list) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
        return { totalExpenses: round2(list.reduce((t, e) => t + e.amount, 0)), byCategory: [...byCat].map(([category, total]) => ({ category, total })) };
      }
      if (!a && method === 'GET') {
        const month = query.get('month');
        return month ? db.expenses.filter(e => e.expenseDate.startsWith(month)) : db.expenses;
      }
      return crud<Expense>(db, db.expenses, 'exp', 'Despesa', method, a, body);
    }

    case 'purchases': {
      if (!a && method === 'GET') {
        const month = query.get('month');
        return month ? db.purchases.filter(p => p.purchaseDate.startsWith(month)) : db.purchases;
      }
      if (!a && method === 'POST') {
        const items = ((body.items as PurchaseInvoice['items']) ?? []).map(it => ({
          ...it, id: nextId(db, 'pi'),
          description: it.description || db.ingredients.find(i => i.id === it.ingredientId)?.name || 'Item',
        }));
        const subtotal = round2(items.reduce((t, i) => t + Number(i.total || 0), 0));
        const discount = Number(body.discount ?? 0) || 0;
        const freight = Number(body.freight ?? 0) || 0;
        const purchase: PurchaseInvoice = {
          id: nextId(db, 'pur'), supplier: String(body.supplier ?? ''), documentNumber: (body.documentNumber as string) ?? null,
          purchaseDate: (body.purchaseDate as string) ?? today(), paymentMethod: (body.paymentMethod as string) ?? null,
          paymentStatus: (body.paymentStatus as PurchaseInvoice['paymentStatus']) ?? 'paid',
          subtotal, discount, freight, total: round2(subtotal - discount + freight), notes: (body.notes as string) ?? null, items, createdAt: now(),
        };
        for (const it of items) {
          const ing = db.ingredients.find(i => i.id === it.ingredientId);
          if (ing && it.updateIngredientPrice && it.unit === ing.unit && it.quantity > 0) {
            ing.purchasePrice = Number(it.total);
            ing.purchaseQuantity = it.quantity;
            ing.purchaseUnitWeight = undefined;
            ing.purchaseUnitLabel = undefined;
            ing.updatedAt = now();
          }
          if (db.stockItems.some(s => s.ingredientId === it.ingredientId)) {
            stockMove(db, it.ingredientId, 'in', it.quantity, it.unit, `Compra ${purchase.supplier}`.trim());
          }
        }
        db.purchases.unshift(purchase);
        return purchase;
      }
      return unavailable();
    }

    case 'stock': {
      if (!a && method === 'GET') return { items: db.stockItems, movements: db.stockMovements.slice(0, 200) };
      if (a === 'deduct') {
        const lowStock: { ingredientId: string; balance: number; minQuantity: number }[] = [];
        for (const it of (body.items as { ingredientId: string; quantity: number; reason?: string }[]) ?? []) {
          const item = stockMove(db, it.ingredientId, 'out', Math.round(it.quantity * 1000) / 1000, '', it.reason ?? 'Venda');
          if (item && (item.quantity <= item.minQuantity || item.quantity <= 0)) {
            lowStock.push({ ingredientId: item.ingredientId, balance: item.quantity, minQuantity: item.minQuantity });
          }
        }
        return { lowStock };
      }
      if (a && b === 'entry') return stockMove(db, a, 'in', Number(body.quantity), String(body.unit ?? 'g'), (body.reason as string) ?? 'Reposição');
      if (a && method === 'PUT') {
        const item = stockMove(db, a, 'set', Number(body.quantity), String(body.unit ?? 'g'), 'Inventário') as StockItem;
        item.minQuantity = Number(body.minQuantity ?? 0);
        return item;
      }
      return unavailable();
    }

    case 'cash': {
      const open = db.cashSessions.find(s => s.status === 'open');
      if (a === 'current') return open ? cashView(db, open) : null;
      if (a === 'sessions') return db.cashSessions.map(s => cashView(db, s)).sort((x, y) => y.openedAt.localeCompare(x.openedAt));
      if (a === 'open') {
        if (open) throw new DemoError(i18n.t('app:demo.cashAlreadyOpen'), 'DEMO_UNAVAILABLE', 400);
        const s: DemoCashSession = { id: nextId(db, 'cash'), status: 'open', openedAt: now(), closedAt: null, openingAmount: Number(body.openingAmount ?? 0), closingCounted: null, notes: (body.notes as string) ?? null, movements: [] };
        db.cashSessions.unshift(s);
        return cashView(db, s);
      }
      if (!open) throw new DemoError(i18n.t('app:demo.noCashOpen'), 'DEMO_UNAVAILABLE', 400);
      if (a === 'movements') {
        open.movements.push({ id: nextId(db, 'cm'), type: body.type as 'sangria' | 'suprimento', amount: Number(body.amount ?? 0), reason: (body.reason as string) ?? null, createdAt: now() });
        return cashView(db, open);
      }
      if (a === 'close') {
        open.status = 'closed';
        open.closedAt = now();
        open.closingCounted = Number(body.countedAmount ?? 0);
        return cashView(db, open);
      }
      return unavailable();
    }

    case 'store': {
      if (a === 'my') {
        if (method === 'GET') return { ...db.store, products: db.storeProducts };
        db.store = { ...db.store, ...(body as object), updatedAt: now() };
        return { ...db.store, products: db.storeProducts };
      }
      if (a === 'settings') {
        if (method === 'GET') return db.store;
        db.store = { ...db.store, ...(body as object), updatedAt: now() };
        return db.store;
      }
      if (a === 'products') return crud<StoreProduct>(db, db.storeProducts, 'prod', 'Produto', method, b, body);
      if (a === 'addons') return crud<StoreAddon>(db, db.storeAddons, 'addon', 'Adicional', method, b, body);
      return unavailable();
    }

    default:
      return unavailable();
  }
}

/** Responde uma requisição da web no modo demonstração (substitui o fetch em `req`). */
export async function demoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const url = new URL(path, 'http://demo.local');
  let body: Body = {};
  if (typeof init.body === 'string' && init.body) {
    try { body = JSON.parse(init.body) as Body; } catch { body = {}; }
  }
  // Pequena espera para a interface se comportar como com a API (spinners, etc.).
  await new Promise(r => setTimeout(r, 120));
  const db = getDemoDb();
  const result = route(db, method, url.pathname, url.searchParams, body);
  if (method !== 'GET') saveDemoDb();
  return clone(result) as T;
}
