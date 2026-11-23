import { explainRecipe } from './recipeAssistant';

describe('recipe assistant OpenAI integration', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.RECIPE_AI_MODEL;
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.RECIPE_AI_MODEL;
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.RECIPE_AI_MODEL;
    else process.env.RECIPE_AI_MODEL = originalModel;
    jest.useRealTimers();
  });

  it('sends calculated context to Responses API and extracts text across messages', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output: [
      { type: 'reasoning' },
      { type: 'message', content: [{ type: 'output_text', text: 'Análise' }, { type: 'output_text', text: 'Divulgação' }] },
    ] }) });
    expect(await explainRecipe({ name: 'Bolo', simulation: { unitPrice: 10 } })).toBe('Análise\nDivulgação');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(options.headers.Authorization).toBe('Bearer test-key');
    expect(JSON.parse(options.body)).toMatchObject({ model: 'gpt-4.1-mini', store: false, max_output_tokens: 1000,
      input: [{ role: 'user', content: JSON.stringify({ name: 'Bolo', simulation: { unitPrice: 10 } }) }] });
  });
  it('uses the configured model', async () => {
    process.env.RECIPE_AI_MODEL = 'configured-model';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Texto' }] }] }) });
    await explainRecipe({});
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('configured-model');
  });
  it('does not call the provider without a key', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(explainRecipe({})).rejects.toThrow('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects provider failures without exposing their content', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    await expect(explainRecipe({})).rejects.toThrow('OpenAI request failed');
  });
  it.each([
    { status: 'incomplete', output: [] },
    { status: 'completed', output: [] },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] },
  ])('rejects unusable responses %j', async data => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => data });
    await expect(explainRecipe({})).rejects.toThrow();
  });
  it('aborts a stalled request after 30 seconds', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
    }));
    const pending = expect(explainRecipe({})).rejects.toThrow('Aborted');
    await jest.advanceTimersByTimeAsync(30000);
    await pending;
  });
});
