import { createHmac } from 'crypto';
import { cents, validPaymentSignature, assertPaymentMatches } from './storePaymentRules';

describe('cents — conversão de reais para centavos', () => {
  it('arredonda para o centavo mais próximo', () => {
    expect(cents(10)).toBe(1000);
    expect(cents(0.1 + 0.2)).toBe(30);
    expect(cents(19.99)).toBe(1999);
    expect(cents(0)).toBe(0);
  });
  it('rejeita valores inválidos', () => {
    expect(() => cents(-1)).toThrow();
    expect(() => cents(NaN)).toThrow();
    expect(() => cents(Infinity)).toThrow();
    expect(() => cents(Number.MAX_SAFE_INTEGER)).toThrow();
  });
});

describe('validPaymentSignature — webhook do Mercado Pago', () => {
  const secret = 'test-secret';
  const sign = (id: string, requestId: string, ts: string) =>
    createHmac('sha256', secret).update(`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex');

  it('aceita assinatura correta', () => {
    const signature = `ts=1700000000,v1=${sign('123', 'req-1', '1700000000')}`;
    expect(validPaymentSignature('123', 'req-1', signature, secret)).toBe(true);
  });
  it('aceita id com maiúsculas (normaliza para minúsculas)', () => {
    const signature = `ts=1700000000,v1=${sign('abc123', 'req-1', '1700000000')}`;
    expect(validPaymentSignature('ABC123', 'req-1', signature, secret)).toBe(true);
  });
  it('rejeita assinatura de outro segredo', () => {
    const other = createHmac('sha256', 'wrong').update('id:123;request-id:req-1;ts:1700000000;').digest('hex');
    expect(validPaymentSignature('123', 'req-1', `ts=1700000000,v1=${other}`, secret)).toBe(false);
  });
  it('rejeita quando id, request-id ou segredo estão vazios', () => {
    const signature = `ts=1700000000,v1=${sign('123', 'req-1', '1700000000')}`;
    expect(validPaymentSignature('', 'req-1', signature, secret)).toBe(false);
    expect(validPaymentSignature('123', '', signature, secret)).toBe(false);
    expect(validPaymentSignature('123', 'req-1', signature, '')).toBe(false);
  });
  it('rejeita assinatura malformada', () => {
    expect(validPaymentSignature('123', 'req-1', '', secret)).toBe(false);
    expect(validPaymentSignature('123', 'req-1', 'ts=abc,v1=zzz', secret)).toBe(false);
    expect(validPaymentSignature('123', 'req-1', 'v1=deadbeef', secret)).toBe(false);
  });
});

describe('assertPaymentMatches — conferência do pagamento com o pedido', () => {
  const order = { order_id: 'order-1', collector_id: '555', amount_cents: 5250, fee_cents: 200 };
  const payment = (overrides: Record<string, unknown> = {}) => ({
    external_reference: 'order-1',
    collector_id: 555,
    currency_id: 'BRL',
    transaction_amount: 52.5,
    status: 'approved',
    fee_details: [
      { type: 'application_fee', amount: 2 },
      { type: 'mercadopago_fee', amount: 1.5 },
    ],
    ...overrides,
  });

  it('aceita pagamento que confere com o pedido', () => {
    expect(() => assertPaymentMatches(payment(), order)).not.toThrow();
  });
  it('rejeita pedido, recebedor, moeda ou valor divergentes', () => {
    expect(() => assertPaymentMatches(payment({ external_reference: 'other' }), order)).toThrow();
    expect(() => assertPaymentMatches(payment({ collector_id: 999 }), order)).toThrow();
    expect(() => assertPaymentMatches(payment({ currency_id: 'USD' }), order)).toThrow();
    expect(() => assertPaymentMatches(payment({ transaction_amount: 52.49 }), order)).toThrow();
  });
  it('rejeita pagamento aprovado com comissão diferente da acordada', () => {
    expect(() => assertPaymentMatches(payment({
      fee_details: [{ type: 'application_fee', amount: 1 }, { type: 'mercadopago_fee', amount: 1.5 }],
    }), order)).toThrow();
    expect(() => assertPaymentMatches(payment({ fee_details: [] }), order)).toThrow();
  });
  it('não exige comissão em pagamento ainda não aprovado', () => {
    expect(() => assertPaymentMatches(payment({ status: 'pending', fee_details: [] }), order)).not.toThrow();
  });
});
