jest.mock('../database/connection', () => ({ pool: { query: jest.fn() } }));
jest.mock('./pushService', () => ({ sendPushNotificationsDetailed: jest.fn() }));

import { pool } from '../database/connection';
import { normalizeNotificationAudience, normalizeNotificationSchedule } from '../../domain/services/notificationAudience';
import { PostgresNotificationRepository } from '../repositories/PostgresNotificationRepository';
import { PostgresPushTokenRepository } from '../repositories/PostgresPushTokenRepository';
import { NotificationController } from '../../presentation/controllers/NotificationController';
import { sendPushNotificationsDetailed } from './pushService';
import { processScheduledNotifications } from './scheduledNotificationService';
import { migrateIndividualNotifications } from '../database/individualNotificationsMigration';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const query = pool.query as jest.Mock;
const push = sendPushNotificationsDetailed as jest.Mock;
const stored = (extra: Record<string, unknown> = {}) => ({
  id: 'notification-id', title: 'Aviso', body: 'Mensagem', target: 'individual',
  recipient_user_ids: [A], data_json: null, scheduled_at: null, sent_at: null,
  status: 'pending', recipients_count: 0, created_at: new Date(), ...extra,
});
const response = () => {
  const res: any = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res); res.json.mockReturnValue(res); return res;
};
beforeEach(() => { jest.restoreAllMocks(); query.mockReset(); push.mockReset(); });

describe('individual audience validation', () => {
  it.each([undefined, null, [], ['invalid'], [A, 5], Array(101).fill(A)])('rejects unsafe list %p without broadcast', ids => {
    expect(() => normalizeNotificationAudience('individual', ids)).toThrow();
  });
  it('normalizes and deduplicates UUIDs', () => {
    expect(normalizeNotificationAudience('individual', [A.toUpperCase(), A, B]).recipientUserIds).toEqual([A, B]);
    expect(normalizeNotificationAudience('individual', Array(100).fill(A)).recipientUserIds).toEqual([A]);
  });
  it('rejects unknown targets and IDs supplied for a group', () => {
    expect(() => normalizeNotificationAudience('typo')).toThrow();
    expect(() => normalizeNotificationAudience('all', [A])).toThrow();
    expect(normalizeNotificationAudience()).toEqual({ target: 'all', recipientUserIds: null });
  });
});

describe('storage and recipient resolution', () => {
  it('persists selected UUIDs and returns them on reload', async () => {
    query.mockResolvedValue({ rows: [stored()] });
    const repo = new PostgresNotificationRepository();
    expect((await repo.create({ title: 'Aviso', body: 'Mensagem', target: 'individual', recipientUserIds: [A, A] })).recipientUserIds).toEqual([A]);
    expect(query.mock.calls[0][0]).toContain('recipient_user_ids');
    expect(query.mock.calls[0][1][6]).toEqual([A]);
    expect((await repo.findById('notification-id'))?.recipientUserIds).toEqual([A]);
    expect((await repo.findPending())[0].recipientUserIds).toEqual([A]);
  });
  it('stores scheduled recipients and retains group compatibility', async () => {
    query.mockResolvedValue({ rows: [stored({ target: 'premium', recipient_user_ids: null })] });
    await new PostgresNotificationRepository().create({ title: 'Aviso', body: 'Mensagem', target: 'premium', scheduledAt: new Date(Date.now() + 3600000).toISOString() });
    expect(query.mock.calls[0][1][5]).toBe('scheduled');
    expect(query.mock.calls[0][1][6]).toBeNull();
  });
  it('does not query for missing persisted individual recipients', async () => {
    await expect(new PostgresPushTokenRepository().findByTarget('individual', null)).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });
  it('selects only explicit active user IDs with parameterized SQL', async () => {
    query.mockResolvedValue({ rows: [] });
    const repo = new PostgresPushTokenRepository();
    const broadcast = jest.spyOn(repo, 'findAll');
    await repo.findByTarget('individual', [A, A, B]);
    expect(query.mock.calls[0][0]).toContain('u.id = ANY($1::uuid[])');
    expect(query.mock.calls[0][0]).toContain('COALESCE(u.is_active, TRUE)');
    expect(query.mock.calls[0][1]).toEqual([[A, B]]);
    expect(broadcast).not.toHaveBeenCalled();
  });
  it.each(['premium', 'master'] as const)('excludes inactive and expired %s, allows null expiry', async target => {
    query.mockResolvedValue({ rows: [] });
    await new PostgresPushTokenRepository().findByTarget(target);
    expect(query.mock.calls[0][0]).toContain('COALESCE(u.is_active, TRUE)');
    expect(query.mock.calls[0][0]).toContain('u.is_premium = TRUE');
    expect(query.mock.calls[0][0]).toContain("u.premium_until IS NULL OR u.premium_until > NOW()");
  });
});

describe('HTTP and scheduler delivery paths', () => {
  it.each(['', 'invalid', null, 123, '2020-01-01T00:00:00Z'])('rejects invalid scheduledAt %p before storing or sending', async scheduledAt => {
    const res = response();
    await new NotificationController().create({ body: { title: 'Aviso', body: 'Mensagem', target: 'individual', recipientUserIds: [A], scheduledAt } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400); expect(query).not.toHaveBeenCalled(); expect(push).not.toHaveBeenCalled();
  });
  it('normalizes future dates and allows only omitted schedule for immediate send', () => {
    const future = new Date(Date.now() + 60000).toISOString();
    expect(normalizeNotificationSchedule(future)).toBe(future);
    expect(normalizeNotificationSchedule(undefined)).toBeUndefined();
  });
  it.each([undefined, [], ['invalid']])('returns 400 without storing or sending invalid recipients %p', async ids => {
    const res = response();
    await new NotificationController().create({ body: { title: 'Aviso', body: 'Mensagem', target: 'individual', recipientUserIds: ids } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400); expect(query).not.toHaveBeenCalled(); expect(push).not.toHaveBeenCalled();
  });
  it('rejects group plus IDs instead of silently broadcasting', async () => {
    const res = response();
    await new NotificationController().create({ body: { title: 'Aviso', body: 'Mensagem', target: 'all', recipientUserIds: [A] } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400); expect(push).not.toHaveBeenCalled();
  });
  it('uses persisted selection for immediate creation and manual send', async () => {
    const notification: any = { id: 'n1', title: 'Aviso', body: 'Mensagem', target: 'individual', recipientUserIds: [A], status: 'pending', dataJson: null };
    jest.spyOn(PostgresNotificationRepository.prototype, 'create').mockResolvedValue(notification);
    jest.spyOn(PostgresNotificationRepository.prototype, 'findById').mockResolvedValue(notification);
    const sent = jest.spyOn(PostgresNotificationRepository.prototype, 'markSent').mockResolvedValue();
    const tokens = jest.spyOn(PostgresPushTokenRepository.prototype, 'findByTarget').mockResolvedValue([
      { userId: A, token: 'token-a' } as any, { userId: A, token: 'token-b' } as any,
    ]);
    push.mockResolvedValue({ successfulTokens: ['token-a', 'token-b'] });
    await new NotificationController().create({ body: { title: 'Aviso', body: 'Mensagem', target: 'individual', recipientUserIds: [A] } } as any, response());
    await new NotificationController().send({ params: { id: 'n1' } } as any, response());
    expect(tokens).toHaveBeenNthCalledWith(1, 'individual', [A]); expect(tokens).toHaveBeenNthCalledWith(2, 'individual', [A]);
    expect(sent).toHaveBeenCalledWith('n1', 1);
  });
  it('does not send scheduled creates immediately', async () => {
    jest.spyOn(PostgresNotificationRepository.prototype, 'create').mockResolvedValue({ target: 'individual', recipientUserIds: [A], status: 'scheduled' } as any);
    await new NotificationController().create({ body: { title: 'Aviso', body: 'Mensagem', target: 'individual', recipientUserIds: [A], scheduledAt: new Date(Date.now() + 3600000).toISOString() } } as any, response());
    expect(push).not.toHaveBeenCalled();
  });
  it('scheduler uses stored IDs and blocks corrupted individual rows without fallback', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM notifications')) return { rows: [stored({ id: 'valid' }), stored({ id: 'unsafe', recipient_user_ids: null })] };
      if (sql.includes('ANY($1::uuid[])')) return { rows: [{ id: 'pt1', user_id: A, token: 'token-a', platform: 'ios', created_at: new Date() }] };
      return { rows: [] };
    });
    push.mockResolvedValue({ successfulTokens: ['token-a'] });
    await processScheduledNotifications();
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][0]).toEqual(['token-a']);
    const selections = query.mock.calls.filter(([sql]) => String(sql).includes('FROM push_tokens'));
    expect(selections).toHaveLength(1); expect(selections[0][1]).toEqual([[A]]);
    expect(query.mock.calls.some(([sql, args]) => String(sql).includes("status = 'failed'") && args[0] === 'unsafe')).toBe(true);
  });
});

it('migration is additive and constrains individual lists without modifying users or sending', async () => {
  const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
  await migrateIndividualNotifications(client as any);
  const sql = client.query.mock.calls.map(call => String(call[0])).join('\n');
  expect(sql).toContain('ADD COLUMN IF NOT EXISTS recipient_user_ids UUID[] NULL');
  expect(sql).toContain('cardinality(recipient_user_ids) BETWEEN 1 AND 100');
  expect(sql).toContain('array_position(recipient_user_ids, NULL) IS NULL');
  expect(sql).not.toMatch(/UPDATE users|DELETE FROM|INSERT INTO/);
});
