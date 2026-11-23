import crypto from 'crypto';
import { pool } from '../database/connection';
import { registerSale, SaleRegistrationError } from '../../application/services/registerSale';
import { parseWhatsAppSale } from './whatsappSaleParser';
import { enqueueWhatsAppSales, handleWhatsAppSale, processWhatsAppSalesOnce, InboxMessage } from './whatsappSales';

jest.mock('../database/connection', () => ({ pool: { query: jest.fn(), connect: jest.fn() } }));
jest.mock('../../application/services/registerSale', () => {
  const actual = jest.requireActual('../../application/services/registerSale');
  return { ...actual, registerSale: jest.fn() };
});
jest.mock('./whatsappSaleParser', () => ({ parseWhatsAppSale: jest.fn() }));
jest.mock('./whatsappService', () => ({ sendWhatsAppSessionReply: jest.fn() }));

const phone = '5592999999999';
const input = { product: 'Brownie', quantity: 10, unitPrice: 8, totalPrice: null, saleDate: '2026-11-09', paymentMethod: 'pix', clientName: null, question: null };
const draft = { data: input, confirmation_code: 'ABC123' };
const client = { query: jest.fn(), release: jest.fn() };
const message = (body: string): InboxMessage => ({ id: '1', message_id: 'wamid.test', phone, body, message_at: new Date() });
let linked = true;
let currentDraft: typeof draft | null;
beforeEach(() => {
  jest.clearAllMocks(); linked = true; currentDraft = null;
  jest.mocked(parseWhatsAppSale).mockResolvedValue(input as never);
  client.query.mockImplementation(async (sql: string) => ({ rows:
    sql.includes('SELECT user_id, linked_at') ? linked ? [{ user_id: 'owner', linked_at: new Date(Date.now() - 5000) }] : [] :
    sql.includes('SELECT * FROM whatsapp_sale_drafts') ? currentDraft ? [currentDraft] : [] :
    sql.includes('SELECT id,name FROM recipes') ? [{ id: 'recipe-owned', name: 'Brownie' }] :
    sql.includes('COUNT(*)') ? [{ count: 1 }] :
    sql.includes('SELECT preferences') ? [{ preferences: { currency: 'BRL' } }] : [],
  }));
});
const handle = (body: string) => handleWhatsAppSale(client as never, message(body));

it('creates a draft and summary without registering a sale', async () => {
  const reply = await handle('Vendi 10 brownies a 8 reais cada no Pix');
  expect(reply).toContain('BRL 80.00'); expect(reply).toMatch(/confirmar [A-F0-9]{6}/);
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO whatsapp_sale_drafts'), [phone, 'owner', JSON.stringify(input), expect.any(String)]);
  expect(registerSale).not.toHaveBeenCalled();
});
it('asks for missing information and invalidates any earlier confirmation', async () => {
  jest.mocked(parseWhatsAppSale).mockResolvedValue({ ...input, unitPrice: null } as never);
  expect(await handle('Vendi 10 brownies')).toContain('preço');
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO whatsapp_sale_drafts'), [phone, 'owner', expect.any(String), null]);
  expect(registerSale).not.toHaveBeenCalled();
});
it('registers only the current confirmed draft for the linked owner', async () => {
  currentDraft = draft;
  jest.mocked(registerSale).mockResolvedValue({ id: 'sale-id' } as never);
  expect(await handle('confirmar ABC123')).toContain('Venda registrada');
  expect(registerSale).toHaveBeenCalledWith('owner', expect.objectContaining({ recipeId: 'recipe-owned', salePrice: 8 }), client, 'wamid.test');
  expect(client.query).toHaveBeenCalledWith('DELETE FROM whatsapp_sale_drafts WHERE phone=$1', [phone]);
});
it.each(['confirmar', 'confirmar OLD123'])('rejects a missing or stale confirmation: %s', async text => {
  currentDraft = draft; expect(await handle(text)).toContain('confirmar ABC123');
  expect(registerSale).not.toHaveBeenCalled();
});
it('does not repeat a confirmation when the draft was already consumed', async () => {
  expect(await handle('confirmar ABC123')).toContain('não tem um rascunho');
  expect(registerSale).not.toHaveBeenCalled();
});
it('keeps the draft when plan quota prevents registration', async () => {
  currentDraft = draft; jest.mocked(registerSale).mockRejectedValue(new SaleRegistrationError('Limite atingido', 403));
  expect(await handle('confirmar ABC123')).toContain('Limite atingido');
  expect(client.query).not.toHaveBeenCalledWith('DELETE FROM whatsapp_sale_drafts WHERE phone=$1', [phone]);
});
it('cancels without registering and invalidates confirmation before correction', async () => {
  currentDraft = draft; await handle('cancelar');
  expect(client.query).toHaveBeenCalledWith('DELETE FROM whatsapp_sale_drafts WHERE phone=$1', [phone]);
  await handle('corrigir');
  expect(client.query).toHaveBeenCalledWith('UPDATE whatsapp_sale_drafts SET confirmation_code=NULL WHERE phone=$1', [phone]);
  expect(registerSale).not.toHaveBeenCalled();
});
it('passes previous data for correction and creates a new confirmation code', async () => {
  currentDraft = draft;
  await handle('a quantidade correta é 12');
  expect(parseWhatsAppSale).toHaveBeenCalledWith('a quantidade correta é 12', input, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
});
it('does not interpret or register messages from an unlinked phone', async () => {
  linked = false; expect(await handle('Vendi 10 brownies')).toContain('Vincule');
  expect(parseWhatsAppSale).not.toHaveBeenCalled(); expect(registerSale).not.toHaveBeenCalled();
});
it('handles provider unavailability without creating a sale', async () => {
  jest.mocked(parseWhatsAppSale).mockRejectedValue(new Error('quota'));
  expect(await handle('Vendi 10 brownies')).toContain('indisponível');
  expect(registerSale).not.toHaveBeenCalled();
});
it('requires an unexpired phone-bound hashed link code', async () => {
  const code = '0123456789ABCDEF01234567';
  expect(await handle('vincular ' + code)).toContain('inválido ou expirado');
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('expires_at>NOW() FOR UPDATE'), [crypto.createHash('sha256').update(code).digest('hex'), phone]);
});
it('links once and consumes the temporary code', async () => {
  const original = client.query.getMockImplementation()!;
  client.query.mockImplementation(async (...args) => args[0].includes('SELECT * FROM whatsapp_link_codes') ? { rows: [{ user_id: 'owner' }] } :
    args[0].includes('INSERT INTO whatsapp_sale_links') ? { rows: [{ user_id: 'owner' }] } : original(...args));
  expect(await handle('vincular 0123456789ABCDEF01234567')).toContain('WhatsApp vinculado');
  expect(client.query).toHaveBeenCalledWith('DELETE FROM whatsapp_link_codes WHERE user_id=$1', ['owner']);
});
it('enqueues only events for the configured business number with a unique message ID', async () => {
  const oldEnabled = process.env.WHATSAPP_SALES_ENABLED; const oldNumber = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  process.env.WHATSAPP_SALES_ENABLED = 'true'; process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'business';
  try {
    const event = { entry: [{ changes: [{ value: { metadata: { phone_number_id: 'business' }, messages: [{ id: 'wamid.1', from: phone, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Venda' } }] } }] }] };
    await enqueueWhatsAppSales(event);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(message_id) DO NOTHING'), ['wamid.1', phone, 'Venda', expect.any(Date)]);
    jest.mocked(pool.query).mockClear(); event.entry[0].changes[0].value.metadata.phone_number_id = 'another';
    await enqueueWhatsAppSales(event); expect(pool.query).not.toHaveBeenCalled();
  } finally {
    if (oldEnabled === undefined) delete process.env.WHATSAPP_SALES_ENABLED; else process.env.WHATSAPP_SALES_ENABLED = oldEnabled;
    if (oldNumber === undefined) delete process.env.META_WHATSAPP_PHONE_NUMBER_ID; else process.env.META_WHATSAPP_PHONE_NUMBER_ID = oldNumber;
  }
});
it('commits the draft and processed event together before sending any reply', async () => {
  jest.mocked(pool.connect).mockResolvedValue(client as never);
  const original = client.query.getMockImplementation()!;
  client.query.mockImplementation(async (...args) => args[0].includes('SELECT * FROM whatsapp_sale_inbox i') ? { rows: [message('oi')] } : original(...args));
  await processWhatsAppSalesOnce();
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), [phone]);
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('processed_at=NOW()'), ['1', expect.stringContaining('Envie uma venda')]);
  expect(client.query).toHaveBeenLastCalledWith('COMMIT');
});
