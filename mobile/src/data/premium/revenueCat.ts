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
  /** Which subscription tier this package unlocks. */
  tier: 'premium' | 'master';
  /** Underlying RevenueCat package reference (opaque). */
  nativePackage: any;
  /** Whether this product has a free trial configured in the store. */
  hasFreeTrial: boolean;
  /** Trial duration in days (e.g. 3), or null if no trial. */
  trialDays: number | null;
  /** Whether the current user is eligible for the free trial. */
  isTrialEligible: boolean;
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

function computeTrialDays(introPrice: any): number | null {
  if (!introPrice || introPrice.price !== 0) return null;
  const units = introPrice.periodNumberOfUnits ?? 0;
  const unit: string = (introPrice.periodUnit ?? '').toUpperCase();
  if (unit === 'DAY') return units;
  if (unit === 'WEEK') return units * 7;
  if (unit === 'MONTH') return units * 30;
  if (unit === 'YEAR') return units * 365;
  return units > 0 ? units : null;
}

function mapPackage(pkg: any): PremiumPackage {
  const product = pkg?.product ?? {};
  const identifier: string = pkg?.identifier ?? product?.identifier ?? 'unknown';
  const priceLabel: string =
    product?.priceString ?? product?.price_string ?? `${product?.price ?? ''}`;

  const id = identifier.toLowerCase();
  // Master products are `premium_master` / `premium_master_anual` — they contain
  // "premium" too, so we MUST test "master" first.
  const isMaster = id.includes('master');
  const isAnnual = id.includes('annual') || id.includes('year') || id.includes('anual');
  // `premium_master` (monthly master) has no "month" token — anything master that
  // isn't annual is treated as monthly.
  const isMonthly = id.includes('month') || id.includes('mensal') || (isMaster && !isAnnual);

  const title = isMaster
    ? (isAnnual ? 'Master Anual' : 'Master Mensal')
    : isAnnual
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

  const introPrice = product?.introductoryPrice ?? product?.introPrice ?? null;
  const trialDays = computeTrialDays(introPrice);
  const hasFreeTrial = trialDays !== null && trialDays > 0;

  return {
    identifier, title, subtitle, priceLabel, badge, tier: isMaster ? 'master' : 'premium',
    nativePackage: pkg, hasFreeTrial, trialDays, isTrialEligible: false,
  };
}

async function checkTrialEligibility(
  productIdentifiers: string[],
): Promise<Record<string, boolean>> {
  const Purchases = getPurchases();
  if (!Purchases || !configured || productIdentifiers.length === 0) return {};
  try {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIdentifiers);
    const eligibility: Record<string, boolean> = {};
    for (const [id, intro] of Object.entries(result)) {
      // INTRO_ELIGIBILITY_STATUS_ELIGIBLE = 2, UNKNOWN = 0 (Android always returns UNKNOWN)
      const status = (intro as any).status;
      eligibility[id] = status === 2 || status === 0;
    }
    return eligibility;
  } catch {
    return {};
  }
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

    // Check trial eligibility for packages that have a free trial
    const trialProductIds = mapped
      .filter(p => p.hasFreeTrial)
      .map(p => p.nativePackage?.product?.identifier ?? p.identifier);
    const eligibility = await checkTrialEligibility(trialProductIds);
    for (const pkg of mapped) {
      if (pkg.hasFreeTrial) {
        const productId = pkg.nativePackage?.product?.identifier ?? pkg.identifier;
        pkg.isTrialEligible = eligibility[productId] ?? false;
      }
    }

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

/**
 * Returns the expiration date of the first active entitlement, or null.
 */
/**
 * Sends location attributes (state, city, country) to RevenueCat
 * using IP-based geolocation (no permissions required).
 */
export async function setRevenueCatLocationAttributes(): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return;
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) return;
    const data = await response.json();
    const attributes: Record<string, string> = {};
    if (data.region) attributes['$state'] = data.region;
    if (data.city) attributes['$city'] = data.city;
    if (data.country_name) attributes['$countryCode'] = data.country_code;
    if (data.region_code) attributes.state_code = data.region_code;
    if (Object.keys(attributes).length > 0) {
      await Purchases.setAttributes(attributes);
    }
  } catch (error) {
    console.warn('[RevenueCat] setLocationAttributes failed:', error);
  }
}

export async function getActiveEntitlementExpiration(): Promise<string | null> {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return null;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlements = customerInfo?.entitlements?.active ?? {};
    const first = Object.values(entitlements)[0] as any;
    return first?.expirationDate ?? null;
  } catch {
    return null;
  }
}
