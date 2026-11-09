import { CreateSaleDTO, PaymentMethod } from '../entities/Sale';
import { normalizeDateToISO } from '../utils/date';

export interface WhatsAppSaleInput {
  product: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  saleDate: string | null;
  paymentMethod: PaymentMethod | null;
  clientName: string | null;
  question: string | null;
}

export function normalizeWhatsAppPhone(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Informe seu WhatsApp com DDI e DDD.');
  const phone = value.replace(/[\s()+-]/g, '');
  if (!/^[1-9]\d{9,14}$/.test(phone)) throw new Error('Informe seu WhatsApp com DDI e DDD, por exemplo 5592999999999.');
  return phone;
}

export function saleDateInTimezone(timestamp: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp);
}

export function validateWhatsAppSale(input: WhatsAppSaleInput, recipes: Array<{ id: string; name: string }>):
  { question: string } | { data: CreateSaleDTO; total: number } {
  if (input.question) return { question: String(input.question).slice(0, 350) };
  if (typeof input.product !== 'string' || !input.product.trim() || input.product.length > 255) return { question: 'Qual produto você vendeu?' };
  if (typeof input.quantity !== 'number' || !Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 100000) return { question: 'Quantas unidades foram vendidas? Informe uma quantidade inteira.' };
  if (input.unitPrice === null && input.totalPrice === null) return { question: 'Qual foi o preço? Informe se é por unidade ou o total da venda.' };
  const prices = [input.unitPrice, input.totalPrice].filter(v => v !== null);
  if (prices.some(v => typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 1000000)) return { question: 'Informe um preço válido e positivo.' };
  const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
  const unitPrice = input.unitPrice ?? round(input.totalPrice! / input.quantity);
  const total = round(unitPrice * input.quantity);
  if (input.totalPrice !== null && Math.abs(total - input.totalPrice) > 0.001) return { question: 'O total não corresponde ao preço por unidade. Informe um preço unitário com até duas casas decimais.' };
  if (!Number.isFinite(total) || total > 99999999.99 || Math.abs(round(unitPrice) - unitPrice) > 0.000001) return { question: 'Revise o preço: use até duas casas decimais e total inferior a 100 milhões.' };
  if (!input.saleDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.saleDate) || !normalizeDateToISO(input.saleDate)) return { question: 'Em qual data a venda aconteceu? Use dia/mês/ano.' };
  if (!input.paymentMethod || !['pix', 'dinheiro', 'cartao', 'credito', 'debito'].includes(input.paymentMethod)) return { question: 'Qual foi a forma de pagamento: Pix, dinheiro, crédito ou débito?' };
  const normalized = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const matches = recipes.filter(r => normalized(r.name) === normalized(input.product!));
  if (matches.length > 1) return { question: 'Há receitas com o mesmo nome. Renomeie-as no aplicativo para identificar o produto com segurança.' };
  return { data: { recipeId: matches[0]?.id ?? null, productName: input.product.trim(), quantitySold: input.quantity,
    salePrice: unitPrice, saleDate: input.saleDate, discount: 0, paymentMethod: input.paymentMethod,
    clientName: typeof input.clientName === 'string' ? input.clientName.slice(0, 255) : null,
    notes: 'Registrada pelo WhatsApp após confirmação.' }, total };
}
