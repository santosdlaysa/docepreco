/**
 * RevenueCat wrapper for in-app purchases / subscriptions.
 *
 * Requires `react-native-purchases` to be installed:
 *   npx expo install react-native-purchases
 *
 * Env vars expected (EAS secrets or .env):
 *   EXPO_PUBLIC_REVENUECAT_IOS_KEY
 *   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
 *
 * Usage:
 *   import { configureRevenueCat, identifyRevenueCatUser } from './src/data/premium/revenueCat';
 *   configureRevenueCat();                    // on app start
 *   await identifyRevenueCatUser(userId);     // after login
 *
 * The module loads `react-native-purchases` lazily via `require` so the app
 * still bundles cleanly before the native package is installed. In that
 * fallback state `isRevenueCatConfigured()` returns false and the paywall
 * shows a "not configured" message.
 */

import { Platform } from 'react-native';

export type PremiumPackage = {
  identifier: string;
  title: string;
  subtitle?: string;
  priceLabel: string;
  badge?: string;
  /** Underlying RevenueCat package reference (opaque). */
  nativePackage: any;
};

export type PurchaseResult = 'success' | 'cancelled' | 'error';

let purchasesModule: any = null;
let configured = false;
let configureAttempted = false;

function getPurchases(): any | null {
  if (purchasesModule) return purchasesModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases');
    purchasesModule = mod?.default ?? mod;
    return purchasesModule;
  } catch {
    return null;
  }
}

function getApiKey(): string | null {
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (Platform.OS === 'ios') return iosKey ?? null;
  if (Platform.OS === 'android') return androidKey ?? null;
  return null;
}

export function configureRevenueCat(appUserId?: string): void {
  if (configureAttempted) return;
  configureAttempted = true;

  const Purchases = getPurchases();
  if (!Purchases) {
    console.warn('[RevenueCat] react-native-purchases not installed — paywall disabled');
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(`[RevenueCat] API key not configured for ${Platform.OS}`);
    return;
  }

  try {
    Purchases.configure({ apiKey, appUserID: appUserId ?? null });
    configured = true;
  } catch (error) {
    console.warn('[RevenueCat] configure failed:', error);
  }
}

export function isRevenueCatConfigured(): boolean {
  return configured;
}

export async function identifyRevenueCatUser(userId: string): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return;
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.warn('[RevenueCat] logIn failed:', error);
  }
}

export async function logoutRevenueCatUser(): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.warn('[RevenueCat] logOut failed:', error);
  }
}

function mapPackage(pkg: any): PremiumPackage {
  const product = pkg?.product ?? {};
  const identifier: string = pkg?.identifier ?? product?.identifier ?? 'unknown';
  const priceLabel: string =
    product?.priceString ?? product?.price_string ?? `${product?.price ?? ''}`;

  const id = identifier.toLowerCase();
  const isAnnual = id.includes('annual') || id.includes('year') || id.includes('anual');
  const isMonthly = id.includes('month') || id.includes('mensal');

  const title = isAnnual
    ? 'Plano Anual'
    : isMonthly
    ? 'Plano Mensal'
    : product?.title ?? 'Plano Premium';

  const subtitle = isAnnual
    ? 'Melhor custo-benefício'
    : isMonthly
    ? 'Cobrança mensal'
    : undefined;

  const badge = isAnnual ? 'ECONOMIZE' : undefined;

  return { identifier, title, subtitle, priceLabel, badge, nativePackage: pkg };
}

export async function fetchOfferings(): Promise<PremiumPackage[]> {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current) return [];
    const packages = current.availablePackages ?? [];
    const mapped: PremiumPackage[] = packages.map(mapPackage);
    // Sort: annual first, then monthly, then everything else
    return mapped.sort((a, b) => {
      const rank = (p: PremiumPackage) =>
        p.identifier.toLowerCase().includes('annual') || p.identifier.toLowerCase().includes('year')
          ? 0
          : p.identifier.toLowerCase().includes('month')
          ? 1
          : 2;
      return rank(a) - rank(b);
    });
  } catch (error) {
    console.warn('[RevenueCat] fetchOfferings failed:', error);
    return [];
  }
}

export async function purchasePackage(pkg: PremiumPackage): Promise<PurchaseResult> {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return 'error';
  try {
    const result = await Purchases.purchasePackage(pkg.nativePackage);
    const entitlements = result?.customerInfo?.entitlements?.active ?? {};
    return Object.keys(entitlements).length > 0 ? 'success' : 'error';
  } catch (error: any) {
    if (error?.userCancelled) return 'cancelled';
    console.warn('[RevenueCat] purchasePackage failed:', error);
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    const entitlements = customerInfo?.entitlements?.active ?? {};
    return Object.keys(entitlements).length > 0;
  } catch (error) {
    console.warn('[RevenueCat] restorePurchases failed:', error);
    throw error;
  }
}

/**
 * Returns active entitlements, useful for syncing with backend on app start.
 */
export async function getActiveEntitlements(): Promise<string[]> {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return [];
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlements = customerInfo?.entitlements?.active ?? {};
    return Object.keys(entitlements);
  } catch (error) {
    console.warn('[RevenueCat] getCustomerInfo failed:', error);
    return [];
  }
}
