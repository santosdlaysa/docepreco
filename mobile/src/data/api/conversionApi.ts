import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { apiClient } from './client';
import { isDemoMode } from '../demo/demoMode';
import type { PaywallTrigger } from '../../presentation/navigation/types';

export function conversionSource(trigger?: PaywallTrigger): string {
  if (trigger?.kind === 'limit') return trigger.feature === 'recipes' ? (trigger.blocked ? 'recipe_limit' : 'recipe_near_limit') : 'other';
  if (trigger?.kind === 'master') return ['stock', 'finance', 'salesTips'].includes(trigger.feature ?? '') ? trigger.feature! : 'store';
  if (trigger?.kind === 'feature') return ['clientsManagement', 'ordersManagement'].includes(trigger.feature) ? trigger.feature : 'other';
  return 'manual';
}

export function trackConversion(event: 'blocked' | 'offer_viewed' | 'offer_clicked' | 'checkout_started', source: string, tier: 'premium' | 'master'): void {
  if (isDemoMode()) return;
  void apiClient.post('/conversion-events', { event, source, tier, eventId: Crypto.randomUUID(), platform: Platform.OS }, { timeout: 5000 }).catch(() => {});
}
