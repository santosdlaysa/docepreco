jest.mock('../database/connection', () => ({ pool: { query: jest.fn() } }));

import { isPromoLive, validatePixPromo, PixPromo } from './pixPromoService';

const base: PixPromo = {
  enabled: true,
  discountPercent: 10,
  title: 'Black Friday',
  startsAt: '2026-11-27T03:00:00.000Z',
  endsAt: '2026-12-01T03:00:00.000Z',
};

describe('pixPromoService', () => {
  it('só vale dentro da janela e quando ligada', () => {
    expect(isPromoLive(base, new Date('2026-11-28T12:00:00Z'))).toBe(true);
    expect(isPromoLive(base, new Date('2026-11-26T12:00:00Z'))).toBe(false);
    expect(isPromoLive(base, new Date('2026-12-01T03:00:00Z'))).toBe(false);
    expect(isPromoLive({ ...base, enabled: false }, new Date('2026-11-28T12:00:00Z'))).toBe(false);
    expect(isPromoLive({ ...base, startsAt: null, endsAt: null })).toBe(true);
  });

  it('valida percentual, nome e datas', () => {
    expect(validatePixPromo(base).promo).toEqual(base);
    expect(validatePixPromo({ ...base, discountPercent: 0 }).error).toBeDefined();
    expect(validatePixPromo({ ...base, discountPercent: 95 }).error).toBeDefined();
    expect(validatePixPromo({ ...base, title: '  ' }).error).toBeDefined();
    expect(validatePixPromo({ ...base, endsAt: base.startsAt }).error).toBeDefined();
    expect(validatePixPromo({ ...base, startsAt: 'xx' }).error).toBeDefined();
  });
});
