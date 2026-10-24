import { pool } from '../database/connection';

jest.mock('../database/connection', () => ({ pool: { query: jest.fn() } }));
jest.mock('../repositories/PostgresTelegramAlertRepository', () => ({
  PostgresTelegramAlertRepository: jest.fn().mockImplementation(() => ({
    isEnabled: jest.fn().mockResolvedValue(true),
    getTemplate: jest.fn().mockResolvedValue(null),
  })),
}));

describe('sendHealthReport', () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChat = process.env.TELEGRAM_CHAT_ID;
  const query = pool.query as jest.Mock;
  let claimed: Set<string>;
  let fetchMock: jest.Mock;
  let sendHealthReport: typeof import('./telegramService').sendHealthReport;

  beforeAll(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHAT_ID = 'test-chat';
    sendHealthReport = (require('./telegramService') as typeof import('./telegramService')).sendHealthReport;
  });

  afterAll(() => {
    if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalToken;
    if (originalChat === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = originalChat;
  });

  beforeEach(() => {
    claimed = new Set();
    query.mockReset();
    query.mockImplementation(async (sql: string, values?: string[]) => {
      if (sql.startsWith('INSERT INTO app_settings')) {
        const key = values![0];
        if (claimed.has(key)) return { rowCount: 0 };
        claimed.add(key);
        return { rowCount: 1 };
      }
      if (sql.startsWith('DELETE FROM app_settings')) claimed.delete(values![0]);
      return { rowCount: 1 };
    });
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as typeof fetch;
  });

  it('envia uma vez por commit, mas mantém o aviso periódico', async () => {
    await sendHealthReport({ deployCommit: 'a'.repeat(40) });
    await sendHealthReport({ deployCommit: 'a'.repeat(40) });
    await sendHealthReport();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('api.telegram.org'))).toHaveLength(2);
    expect(claimed.size).toBe(1);
  });

  it('não confirma deploy quando a API não está saudável', async () => {
    fetchMock.mockImplementation(async (url: string) => ({ ok: !url.includes('127.0.0.1'), status: 503 }));
    await sendHealthReport({ deployCommit: 'b'.repeat(40) });
    expect(query.mock.calls.some(([sql]) => String(sql).startsWith('INSERT INTO app_settings'))).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('api.telegram.org'))).toBe(false);
  });
});
