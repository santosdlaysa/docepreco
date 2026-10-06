jest.mock('../../infrastructure/database/connection', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('stripe', () => jest.fn());
jest.mock('../../infrastructure/services/telegramService', () => ({ notifyPremiumEvent: jest.fn() }));
jest.mock('../../infrastructure/services/pushService', () => ({ sendPushNotifications: jest.fn() }));
jest.mock('../../infrastructure/repositories/PostgresPushTokenRepository', () => ({ PostgresPushTokenRepository: jest.fn() }));

import { safeWebReturnUrl } from './StripeController';

describe('safeWebReturnUrl', () => {
  it('aceita a web do confeiteiro e limpa parâmetros de checkout antigos', () => {
    const url = safeWebReturnUrl('https://docepreco.site/app/doces?checkout=cancel&session_id=x#topo');
    expect(url?.toString()).toBe('https://docepreco.site/app/doces');
  });

  it('recusa outros domínios (open redirect)', () => {
    expect(safeWebReturnUrl('https://evil.com/app')).toBeNull();
    expect(safeWebReturnUrl('https://docepreco.site.evil.com/app')).toBeNull();
  });

  it('recusa valores inválidos', () => {
    expect(safeWebReturnUrl(undefined)).toBeNull();
    expect(safeWebReturnUrl('nao é url')).toBeNull();
    expect(safeWebReturnUrl(123)).toBeNull();
  });
});
