const findBySlug = jest.fn();
jest.mock('../repositories/PostgresNotificationTemplateRepository', () => ({
  PostgresNotificationTemplateRepository: jest.fn().mockImplementation(() => ({ findBySlug })),
}));
const findWebTokensByUserIds = jest.fn();
jest.mock('../repositories/PostgresPushTokenRepository', () => ({
  PostgresPushTokenRepository: jest.fn().mockImplementation(() => ({ findWebTokensByUserIds })),
}));
jest.mock('../repositories/PostgresTipRepository', () => ({
  PostgresTipRepository: jest.fn().mockImplementation(() => ({ findActive: jest.fn().mockResolvedValue([]) })),
}));
const query = jest.fn();
jest.mock('../database/connection', () => ({ pool: { query: (...a: unknown[]) => query(...a) } }));
const sendWebPush = jest.fn();
let enabled = true;
jest.mock('./webPushService', () => ({
  sendWebPush: (...a: unknown[]) => sendWebPush(...a),
  webPushEnabled: () => enabled,
}));

import { resolveTemplate, sendWebInactivityReminders, sendWebWeeklyReminder, FALLBACK_TEMPLATES } from './webReminderService';

describe('webReminderService', () => {
  beforeEach(() => { jest.clearAllMocks(); enabled = true; });

  it('usa o template do painel, o fallback do app ou nada se desativado', async () => {
    findBySlug.mockResolvedValueOnce({ isActive: true, title: 'Painel', body: 'Texto' });
    expect(await resolveTemplate('weekly_reminder')).toEqual({ title: 'Painel', body: 'Texto' });
    findBySlug.mockResolvedValueOnce(null);
    expect(await resolveTemplate('weekly_reminder')).toEqual(FALLBACK_TEMPLATES.weekly_reminder);
    findBySlug.mockResolvedValueOnce({ isActive: false, title: 'x', body: 'y' });
    expect(await resolveTemplate('weekly_reminder')).toBeNull();
  });

  it('lembrete semanal vai para todas as assinaturas web', async () => {
    findBySlug.mockResolvedValue(null);
    findWebTokensByUserIds.mockResolvedValue([{ userId: 'u1', token: 'w1' }, { userId: 'u2', token: 'w2' }]);
    sendWebPush.mockResolvedValue(['w1', 'w2']);

    expect(await sendWebWeeklyReminder()).toBe(2);
    expect(findWebTokensByUserIds).toHaveBeenCalledWith();
    expect(sendWebPush.mock.calls[0][0]).toEqual(['w1', 'w2']);
  });

  it('inatividade só busca tokens dos usuários no marco de 48h/120h', async () => {
    findBySlug.mockResolvedValue(null);
    query.mockResolvedValueOnce({ rows: [{ id: 'u1' }] }).mockResolvedValueOnce({ rows: [] });
    findWebTokensByUserIds.mockResolvedValue([{ userId: 'u1', token: 'w1' }]);
    sendWebPush.mockResolvedValue(['w1']);

    expect(await sendWebInactivityReminders()).toBe(1);
    expect(query.mock.calls.map(c => (c[1] as string[])[0])).toEqual(['48', '120']);
    expect(findWebTokensByUserIds).toHaveBeenCalledWith(['u1']);
  });

  it('não faz nada sem Web Push configurado', async () => {
    enabled = false;
    expect(await sendWebWeeklyReminder()).toBe(0);
    expect(await sendWebInactivityReminders()).toBe(0);
    expect(findWebTokensByUserIds).not.toHaveBeenCalled();
  });
});
