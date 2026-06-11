import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { authApi, AuthUser, PremiumPlatform, PlanTier } from '../../data/api/authApi';
import { tokenStorage } from '../../data/storage/tokenStorage';
import { isDemoMode, loadDemoMode } from '../../data/demo/demoMode';
import { getActiveEntitlements, getActiveEntitlementExpiration, isRevenueCatConfigured } from '../../data/premium/revenueCat';

interface PremiumContextData {
  isPremium: boolean;
  /** Active tier respecting expiration: 'free' | 'premium' | 'master'. */
  planTier: PlanTier;
  /** Convenience flag: the user has an active Master subscription. */
  isMaster: boolean;
  premiumUntil: string | null;
  premiumPlatform: PremiumPlatform | null;
  daysLeft: number | null;
  /** Whether user is in active trial period (premium but not master). */
  isInTrial: boolean;
  loading: boolean;
  /** Re-fetches the current user from the API and updates storage. */
  refresh: () => Promise<void>;
  /** Optimistically updates local state (e.g. right after a purchase). */
  setPremiumLocal: (user: AuthUser) => void;
  /** Resets premium state to defaults (call on logout). */
  reset: () => void;
}

const defaultValue: PremiumContextData = {
  isPremium: false,
  planTier: 'free',
  isMaster: false,
  premiumUntil: null,
  premiumPlatform: null,
  daysLeft: null,
  isInTrial: false,
  loading: true,
  refresh: async () => {},
  setPremiumLocal: () => {},
  reset: () => {},
};

const PremiumContext = createContext<PremiumContextData>(defaultValue);

export const usePremium = () => useContext(PremiumContext);

const computeDaysLeft = (premiumUntil: string | null): number | null => {
  if (!premiumUntil) return null;
  const ms = new Date(premiumUntil).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const ADMIN_EMAIL = 'santosdlaysa@gmail.com';

const isActive = (user: Pick<AuthUser, 'isPremium' | 'premiumUntil' | 'email'> | null): boolean => {
  if (!user) return false;
  if (user.email === ADMIN_EMAIL) return true;
  if (!user.isPremium) return false;
  if (user.premiumUntil === null) return true;
  return new Date(user.premiumUntil).getTime() > Date.now();
};

/** Active tier respecting expiration. Returns 'free' once premium_until passes. */
const activeTier = (user: AuthUser | null): PlanTier => {
  if (!user) return 'free';
  if (user.email === ADMIN_EMAIL) return 'master';
  if (!isActive(user)) return 'free';
  return user.planTier ?? 'premium';
};

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFromStorage = useCallback(async () => {
    const stored = await tokenStorage.getUser();
    if (stored) setUser(stored as AuthUser);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    // Demo mode doesn't hit the real API
    if (isDemoMode()) {
      const stored = await tokenStorage.getUser();
      if (stored) setUser(stored as AuthUser);
      return;
    }
    try {
      const fresh = await authApi.me();
      setUser(fresh);
    } catch {
      // fall back to storage on network errors
      await loadFromStorage();
    }
  }, [loadFromStorage]);

  const setPremiumLocal = useCallback((updated: AuthUser) => {
    setUser(updated);
    void tokenStorage.saveUser(updated);
  }, []);

  const reset = useCallback(() => {
    setUser(null);
    setLoading(false);
  }, []);

  /**
   * Checks if RevenueCat has active entitlements but the backend shows expired.
   * This handles trial-to-paid conversions where the webhook may not have arrived
   * or the cron already expired the user before the RENEWAL webhook came in.
   */
  const syncIfNeeded = useCallback(async (backendUser: AuthUser) => {
    if (isDemoMode() || !isRevenueCatConfigured()) return;
    // Backend already shows active premium — nothing to sync
    if (isActive(backendUser)) return;

    try {
      const entitlements = await getActiveEntitlements();
      if (entitlements.length === 0) return;

      // RevenueCat says active but backend says expired — sync it
      const expiresAt = await getActiveEntitlementExpiration();
      const platform = Platform.OS === 'android' ? 'android' : 'ios';
      const updated = await authApi.syncPremium(true, expiresAt, platform as 'ios' | 'android');
      if (updated) {
        setUser(updated);
        void tokenStorage.saveUser(updated);
        console.log('[Premium] Auto-synced: RevenueCat active, backend was expired');
      }
    } catch (error) {
      console.warn('[Premium] Auto-sync failed:', error);
    }
  }, []);

  useEffect(() => {
    // Carrega o modo demo antes de qualquer chamada à API para evitar
    // chamar o servidor real com o token demo e disparar force-logout
    loadDemoMode().then(() => loadFromStorage()).then(() => {
      if (!isDemoMode()) {
        authApi.me().then((fresh) => {
          setUser(fresh);
          void tokenStorage.saveUser(fresh);
          void syncIfNeeded(fresh);
        }).catch(() => {});
      }
    });
  }, [loadFromStorage, syncIfNeeded]);

  const tier = activeTier(user);
  const isInTrial = tier === 'premium' && user?.trial_used_at !== null;
  const value: PremiumContextData = {
    isPremium: isActive(user),
    planTier: tier,
    isMaster: tier === 'master',
    premiumUntil: user?.premiumUntil ?? null,
    premiumPlatform: user?.premiumPlatform ?? null,
    daysLeft: computeDaysLeft(user?.premiumUntil ?? null),
    isInTrial,
    loading,
    refresh,
    setPremiumLocal,
    reset,
  };

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
};
