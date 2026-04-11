import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, PaywallTrigger } from '../navigation/types';
import { usePremium } from '../context/PremiumContext';
import { FREE_LIMITS, LimitedFeature, PremiumFeature } from './limits';

/** Temporarily disabled while waiting for Apple review. */
const PREMIUM_ENABLED = false;

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Hook for checking access and opening the paywall when needed.
 *
 * Usage:
 * const { openPaywall, checkLimit, requirePremium } = usePaywall();
 *
 * // Before creating a resource with a free-tier limit:
 * if (!checkLimit('ingredients', currentCount)) return;
 *
 * // Before using a premium-only feature:
 * if (!requirePremium('pdfCustomBranding')) return;
 */
export function usePaywall() {
  const navigation = useNavigation<Nav>();
  const { isPremium } = usePremium();

  const openPaywall = (trigger?: PaywallTrigger) => {
    navigation.navigate('Paywall', { trigger });
  };

  /**
   * Checks if the user can create another item of the given feature.
   * If the limit is hit, opens the paywall and returns false.
   * Returns true if it's OK to proceed.
   */
  const checkLimit = (feature: LimitedFeature, currentCount: number): boolean => {
    if (!PREMIUM_ENABLED) return true;
    if (isPremium) return true;
    if (currentCount < FREE_LIMITS[feature]) return true;
    openPaywall({ kind: 'limit', feature, current: currentCount });
    return false;
  };

  /**
   * Checks if the user has access to a premium-only feature.
   * If not, opens the paywall and returns false.
   */
  const requirePremium = (feature: PremiumFeature): boolean => {
    if (!PREMIUM_ENABLED) return true;
    if (isPremium) return true;
    openPaywall({ kind: 'feature', feature });
    return false;
  };

  return { isPremium, openPaywall, checkLimit, requirePremium };
}
