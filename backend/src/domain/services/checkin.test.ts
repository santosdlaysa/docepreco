import { computeCheckinProgress, normalizeCheckinConfig, previousDay, DEFAULT_CHECKIN_CONFIG } from './checkin';

describe('computeCheckinProgress', () => {
  const today = '2026-11-04';

  it('conta a sequência que termina hoje', () => {
    expect(computeCheckinProgress(['2026-11-04', '2026-11-03', '2026-11-02'], today, true)).toBe(3);
  });

  it('mantém a sequência viva se o último check-in foi ontem', () => {
    expect(computeCheckinProgress(['2026-11-03', '2026-11-02'], today, true)).toBe(2);
  });

  it('zera a sequência quando a pessoa pulou um dia', () => {
    expect(computeCheckinProgress(['2026-11-02', '2026-11-01'], today, true)).toBe(0);
  });

  it('para de contar no primeiro buraco', () => {
    expect(computeCheckinProgress(['2026-11-04', '2026-11-03', '2026-11-01'], today, true)).toBe(2);
  });

  it('atravessa a virada do mês', () => {
    expect(computeCheckinProgress(['2026-11-01', '2026-10-31', '2026-10-30'], '2026-11-01', true)).toBe(3);
  });

  it('no modo não seguido conta todos os dias do ciclo', () => {
    expect(computeCheckinProgress(['2026-11-04', '2026-10-20', '2026-10-01'], today, false)).toBe(3);
  });
});

describe('previousDay', () => {
  it('volta um dia inclusive na virada do ano', () => {
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });
});

describe('normalizeCheckinConfig', () => {
  it('usa os defaults quando não há config salvo', () => {
    expect(normalizeCheckinConfig(null)).toEqual(DEFAULT_CHECKIN_CONFIG);
  });

  it('limita valores fora da faixa e ignora tier inválido', () => {
    const cfg = normalizeCheckinConfig({ daysRequired: 0, rewardDays: 999, rewardTier: 'gold' as any, maxRewardsPerUser: -3 });
    expect(cfg.daysRequired).toBe(1);
    expect(cfg.rewardDays).toBe(90);
    expect(cfg.rewardTier).toBe('premium');
    expect(cfg.maxRewardsPerUser).toBe(0);
  });
});
