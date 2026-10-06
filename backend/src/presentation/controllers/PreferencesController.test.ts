jest.mock('../../infrastructure/database/connection', () => ({
  pool: { query: jest.fn() },
}));

import { sanitizePreferences, PreferencesController } from './PreferencesController';
import { pool } from '../../infrastructure/database/connection';

const query = pool.query as jest.Mock;

const res = () => {
  const r: Record<string, jest.Mock> & { locals: Record<string, unknown> } = { locals: {} } as never;
  r.status = jest.fn(() => r);
  r.json = jest.fn(() => r);
  return r;
};

describe('sanitizePreferences', () => {
  it('mantém só campos conhecidos e válidos', () => {
    expect(sanitizePreferences({
      currency: 'USD', unitSystem: 'imperial', lang: 'en', extra: 'x',
      pdf: { brandColor: '#E91E63', companySlogan: 'Doces', hideWatermark: true, other: 1 },
    })).toEqual({
      currency: 'USD', unitSystem: 'imperial', lang: 'en',
      pdf: { brandColor: '#E91E63', companySlogan: 'Doces', hideWatermark: true },
    });
  });

  it('descarta valores inválidos', () => {
    expect(sanitizePreferences({ currency: 'XYZ', unitSystem: 'foo', lang: 'es', pdf: { brandColor: 'red', logoBase64: '<script>' } })).toEqual({});
  });

  it('aceita remover a logo', () => {
    expect(sanitizePreferences({ pdf: { logoBase64: null } })).toEqual({ pdf: { logoBase64: null } });
  });
});

describe('PreferencesController.update', () => {
  beforeEach(() => query.mockReset());

  it('mescla com as preferências salvas (inclusive o pdf)', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ preferences: { currency: 'BRL', pdf: { brandColor: '#000000', hideWatermark: false } } }] })
      .mockImplementationOnce(async (_sql: string, params: unknown[]) => ({ rows: [{ preferences: JSON.parse(params[1] as string) }] }));
    const r = res();
    await new PreferencesController().update({ userId: 'u1', body: { lang: 'en', pdf: { hideWatermark: true } } } as never, r as never);
    expect(r.json).toHaveBeenCalledWith({
      success: true,
      data: { currency: 'BRL', lang: 'en', pdf: { brandColor: '#000000', hideWatermark: true } },
    });
  });

  it('404 quando o usuário não existe', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const r = res();
    await new PreferencesController().update({ userId: 'x', body: {} } as never, r as never);
    expect(r.status).toHaveBeenCalledWith(404);
  });
});
