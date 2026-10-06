const sendWebPush = jest.fn();
jest.mock('./webPushService', () => ({ sendWebPush: (...a: unknown[]) => sendWebPush(...a) }));

const sendPushNotificationsAsync = jest.fn();
jest.mock('expo-server-sdk', () => {
  class Expo {
    static isExpoPushToken(t: string) { return t.startsWith('ExponentPushToken['); }
    chunkPushNotifications<T>(m: T[]) { return [m]; }
    sendPushNotificationsAsync = sendPushNotificationsAsync;
    chunkPushNotificationReceiptIds() { return []; }
  }
  return { Expo };
});
jest.mock('../repositories/PostgresPushTokenRepository', () => ({
  PostgresPushTokenRepository: jest.fn().mockImplementation(() => ({ removeByToken: jest.fn() })),
}));

import { sendPushNotificationsDetailed } from './pushService';

describe('pushService + Web Push', () => {
  beforeEach(() => jest.clearAllMocks());

  it('soma as entregas do navegador às do app', async () => {
    const web = '{"endpoint":"https://push/x","keys":{"p256dh":"p","auth":"a"}}';
    sendWebPush.mockResolvedValue([web]);
    sendPushNotificationsAsync.mockResolvedValue([{ status: 'ok' }]);

    const res = await sendPushNotificationsDetailed(['ExponentPushToken[a]', web], 'T', 'B');

    expect(sendWebPush).toHaveBeenCalledWith(['ExponentPushToken[a]', web], 'T', 'B', undefined);
    expect(sendPushNotificationsAsync.mock.calls[0][0]).toHaveLength(1);
    expect(res.successCount).toBe(2);
    expect(res.successfulTokens).toEqual(['ExponentPushToken[a]', web]);
  });

  it('entrega só para navegador quando não há token do app', async () => {
    const web = '{"endpoint":"https://push/y","keys":{"p256dh":"p","auth":"a"}}';
    sendWebPush.mockResolvedValue([web]);

    const res = await sendPushNotificationsDetailed([web], 'T', 'B');

    expect(sendPushNotificationsAsync).not.toHaveBeenCalled();
    expect(res).toEqual({ successCount: 1, successfulTokens: [web] });
  });
});
