import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, PaywallTrigger } from '../navigation/types';
import { usePremium } from '../context/PremiumContext';
import { FREE_LIMITS, LimitedFeature, PremiumFeature } from './limits';

const PREMIUM_ENABLED = true;

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Hook for checking access and opening the paywall when needed.
 *
 * Usage:
 * const { openPaywall, checkLimit, requirePremium } = usePaywall();
 *
 * // Before creating a resource with a free-tier limit:
 * if (!checkLimit('recipes', currentCount)) return;
 *
 * // Before using a premium-only feature:
 * if (!requirePremium('pdfCustomBranding')) return;
 */
export function usePaywall() {
  const navigation = useNavigation<Nav>();
  const { isPremium, isMaster } = usePremium();

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
   * Use this for inline feature gates (e.g. toggling a section inside a screen).
   */
  const requirePremium = (feature: PremiumFeature): boolean => {
    if (!PREMIUM_ENABLED) return true;
    if (isPremium) return true;
    openPaywall({ kind: 'feature', feature });
    return false;
  };

  /**
   * Use this at the top of premium-gated screens (in useFocusEffect / useEffect).
   * Replaces the current screen with the Paywall so that closing the Paywall
   * returns the user to the previous screen instead of leaving them on a
   * loading spinner.
   */
  const guardScreen = (feature: PremiumFeature): boolean => {
    if (!PREMIUM_ENABLED) return true;
    if (isPremium) return true;
    navigation.replace('Paywall', { trigger: { kind: 'feature', feature } });
    return false;
  };

  /**
   * Inline gate para recursos exclusivos do plano Master.
   * Abre o paywall já no nível Master se o usuário não for Master.
   */
  const requireMaster = (feature?: string): boolean => {
    if (!PREMIUM_ENABLED) return true;
    if (isMaster) return true;
    openPaywall({ kind: 'master', feature });
    return false;
  };

  /**
   * Use no topo de telas exclusivas do Master (em useFocusEffect / useEffect).
   * Substitui a tela atual pelo Paywall (nível Master) quando não há acesso.
   */
  const guardMaster = (feature?: string): boolean => {
    if (!PREMIUM_ENABLED) return true;
    if (isMaster) return true;
    navigation.replace('Paywall', { trigger: { kind: 'master', feature } });
    return false;
  };

  return { isPremium, isMaster, openPaywall, checkLimit, requirePremium, guardScreen, requireMaster, guardMaster };
}
