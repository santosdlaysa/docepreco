const sendNotification = jest.fn();
const setVapidDetails = jest.fn();
jest.mock('web-push', () => ({ __esModule: true, default: { sendNotification, setVapidDetails } }));

const removeByToken = jest.fn().mockResolvedValue(undefined);
jest.mock('../repositories/PostgresPushTokenRepository', () => ({
  PostgresPushTokenRepository: jest.fn().mockImplementation(() => ({ removeByToken })),
}));

import {
  endpointPrefix,
  isValidSubscription,
  isWebPushToken,
  sendWebPush,
  serializeSubscription,
} from './webPushService';

const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'P', auth: 'A' } };

describe('webPushService', () => {
  const env = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };
  });
  afterAll(() => { process.env = env; });

  it('serializa de forma canônica e o prefixo identifica o endpoint', () => {
    const token = serializeSubscription({ keys: { auth: 'A', p256dh: 'P' }, endpoint: sub.endpoint } as typeof sub);
    expect(token).toBe('{"endpoint":"https://fcm.googleapis.com/fcm/send/abc","keys":{"p256dh":"P","auth":"A"}}');
    expect(token.startsWith(endpointPrefix(sub.endpoint))).toBe(true);
    expect(token.startsWith(endpointPrefix('https://fcm.googleapis.com/fcm/send/ab'))).toBe(false);
    expect(isWebPushToken(token)).toBe(true);
    expect(isWebPushToken('ExponentPushToken[xyz]')).toBe(false);
  });

  it('valida a assinatura recebida do navegador', () => {
    expect(isValidSubscription(sub)).toBe(true);
    expect(isValidSubscription({ ...sub, endpoint: 'http://inseguro' })).toBe(false);
    expect(isValidSubscription({ endpoint: sub.endpoint })).toBe(false);
    expect(isValidSubscription(null)).toBe(false);
  });

  it('envia só para tokens web e remove assinaturas expiradas (410)', async () => {
    const ok = serializeSubscription(sub);
    const dead = serializeSubscription({ ...sub, endpoint: 'https://push.example/dead' });
    sendNotification.mockImplementation(async (s: typeof sub) => {
      if (s.endpoint.endsWith('dead')) throw Object.assign(new Error('gone'), { statusCode: 410 });
    });

    const delivered = await sendWebPush([ok, dead, 'ExponentPushToken[x]'], 'Oi', 'Corpo', { type: 't' });

    expect(delivered).toEqual([ok]);
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(JSON.parse(sendNotification.mock.calls[0][1])).toEqual({ title: 'Oi', body: 'Corpo', data: { type: 't' } });
    expect(removeByToken).toHaveBeenCalledWith(dead);
  });

  it('não envia nada sem chaves VAPID', async () => {
    process.env = { ...env, VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' };
    expect(await sendWebPush([serializeSubscription(sub)], 'a', 'b')).toEqual([]);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
