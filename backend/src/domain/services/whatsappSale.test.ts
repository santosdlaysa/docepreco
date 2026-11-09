import { normalizeWhatsAppPhone, saleDateInTimezone, validateWhatsAppSale, WhatsAppSaleInput } from './whatsappSale';

const sale: WhatsAppSaleInput = { product: 'Brownie', quantity: 10, unitPrice: 8, totalPrice: null, saleDate: '2026-11-09', paymentMethod: 'pix', clientName: 'Maria', question: null };
describe('WhatsApp sale validation', () => {
  it('calculates totals and links only an exact normalized recipe match', () => {
    expect(validateWhatsAppSale(sale, [{ id: 'owned', name: 'BROWNIE' }])).toMatchObject({ total: 80, data: { recipeId: 'owned', quantitySold: 10, salePrice: 8, discount: 0 } });
    expect(validateWhatsAppSale(sale, [{ id: 'other', name: 'Brownie especial' }])).toMatchObject({ data: { recipeId: null, productName: 'Brownie' } });
  });
  it('derives unit price from an explicit total', () => {
    expect(validateWhatsAppSale({ ...sale, unitPrice: null, totalPrice: 80 }, [])).toMatchObject({ total: 80, data: { salePrice: 8 } });
  });
  it.each([
    { quantity: 0 }, { quantity: -1 }, { quantity: 1.5 }, { quantity: 100001 }, { unitPrice: -5 },
    { unitPrice: NaN }, { unitPrice: 8.123 }, { unitPrice: null, totalPrice: null },
    { unitPrice: null, totalPrice: 10, quantity: 3 }, { unitPrice: 8, totalPrice: 99 },
    { saleDate: '2026-02-30' }, { product: '' }, { paymentMethod: null }, { question: 'É preço unitário ou total?' },
  ])('asks for clarification for %j', patch => {
    expect(validateWhatsAppSale({ ...sale, ...patch }, [])).toHaveProperty('question');
  });
  it('does not choose between duplicate recipe names', () => {
    expect(validateWhatsAppSale(sale, [{ id: 'a', name: 'Brownie' }, { id: 'b', name: 'Brownie' }])).toHaveProperty('question');
  });
  it('uses the configured timezone at the date boundary', () => {
    expect(saleDateInTimezone(new Date('2026-11-10T02:00:00Z'), 'America/Manaus')).toBe('2026-11-09');
  });
  it('normalizes formatting without inventing a country code', () => {
    expect(normalizeWhatsAppPhone('+55 (92) 99999-9999')).toBe('5592999999999');
    expect(() => normalizeWhatsAppPhone('abc')).toThrow();
    expect(() => normalizeWhatsAppPhone({ phone: '5592999999999' })).toThrow();
  });
});
