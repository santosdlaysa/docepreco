import { canCreateMore, isActivePremium, getActiveTier } from './premium';

const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
const past   = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();

const freeUser     = { isPremium: false, premiumUntil: null,   planTier: 'free'    as const };
const premiumUser  = { isPremium: true,  premiumUntil: future, planTier: 'premium' as const };
const masterUser   = { isPremium: true,  premiumUntil: future, planTier: 'master'  as const };
const expiredUser  = { isPremium: true,  premiumUntil: past,   planTier: 'premium' as const };
const lifetimeUser = { isPremium: true,  premiumUntil: null,   planTier: 'premium' as const };

const LIMIT = 4;

describe('canCreateMore — receitas', () => {
  describe('usuário free', () => {
    it('pode criar enquanto abaixo do limite', () => {
      expect(canCreateMore(freeUser, 'recipes', 0, LIMIT)).toBe(true);
      expect(canCreateMore(freeUser, 'recipes', 3, LIMIT)).toBe(true);
    });
    it('não pode criar quando atingiu o limite', () => {
      expect(canCreateMore(freeUser, 'recipes', 4, LIMIT)).toBe(false);
      expect(canCreateMore(freeUser, 'recipes', 10, LIMIT)).toBe(false);
    });
  });

  describe('usuário premium ativo', () => {
    it('pode criar independente da quantidade', () => {
      expect(canCreateMore(premiumUser, 'recipes', 4,   LIMIT)).toBe(true);
      expect(canCreateMore(premiumUser, 'recipes', 100, LIMIT)).toBe(true);
    });
  });

  describe('usuário master ativo', () => {
    it('pode criar independente da quantidade', () => {
      expect(canCreateMore(masterUser, 'recipes', 4,   LIMIT)).toBe(true);
      expect(canCreateMore(masterUser, 'recipes', 100, LIMIT)).toBe(true);
    });
  });

  describe('usuário premium expirado', () => {
    it('é tratado como free e não pode criar além do limite', () => {
      expect(canCreateMore(expiredUser, 'recipes', 4, LIMIT)).toBe(false);
    });
  });

  describe('usuário premium vitalício (premiumUntil = null)', () => {
    it('pode criar indefinidamente', () => {
      expect(canCreateMore(lifetimeUser, 'recipes', 100, LIMIT)).toBe(true);
    });
  });
});

describe('isActivePremium', () => {
  it('free → false',          () => expect(isActivePremium(freeUser)).toBe(false));
  it('premium ativo → true',  () => expect(isActivePremium(premiumUser)).toBe(true));
  it('master ativo → true',   () => expect(isActivePremium(masterUser)).toBe(true));
  it('expirado → false',      () => expect(isActivePremium(expiredUser)).toBe(false));
  it('vitalício → true',      () => expect(isActivePremium(lifetimeUser)).toBe(true));
});

describe('getActiveTier', () => {
  it('free permanece free',          () => expect(getActiveTier(freeUser)).toBe('free'));
  it('premium ativo → premium',      () => expect(getActiveTier(premiumUser)).toBe('premium'));
  it('master ativo → master',        () => expect(getActiveTier(masterUser)).toBe('master'));
  it('premium expirado → free',      () => expect(getActiveTier(expiredUser)).toBe('free'));
  it('vitalício mantém tier',        () => expect(getActiveTier(lifetimeUser)).toBe('premium'));
});
