import { parseWhatsAppSale } from './whatsappSaleParser';
const originalFetch = global.fetch;
const originalKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.WHATSAPP_SALES_AI_MODEL;
const mockFetch = jest.fn();
beforeEach(() => { mockFetch.mockReset(); global.fetch = mockFetch; process.env.OPENAI_API_KEY = 'test-key'; delete process.env.WHATSAPP_SALES_AI_MODEL; });
afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.WHATSAPP_SALES_AI_MODEL; else process.env.WHATSAPP_SALES_AI_MODEL = originalModel;
});
it('requests strict structured output, disables response storage and includes only conversation data', async () => {
  const result = { product: 'Brownie', quantity: 10, unitPrice: 8, totalPrice: null, saleDate: '2026-11-09', paymentMethod: 'pix', clientName: null, question: null };
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] }) });
  await expect(parseWhatsAppSale('vendi 10 brownies', null, '2026-11-09')).resolves.toEqual(result);
  const [url, options] = mockFetch.mock.calls[0];
  expect(url).toBe('https://api.openai.com/v1/responses');
  const body = JSON.parse(options.body);
  expect(body).toMatchObject({ model: 'gpt-4.1-mini', store: false, text: { format: { type: 'json_schema', strict: true, schema: { additionalProperties: false } } } });
  expect(JSON.parse(body.input)).toEqual({ message: 'vendi 10 brownies', previous: null, today: '2026-11-09' });
});
it.each([
  { ok: false },
  { ok: true, json: async () => ({ status: 'incomplete' }) },
  { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }) },
  { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '[]' }] }] }) },
])('rejects unusable model responses', async response => {
  mockFetch.mockResolvedValue(response);
  await expect(parseWhatsAppSale('venda', null, '2026-11-09')).rejects.toThrow();
});
