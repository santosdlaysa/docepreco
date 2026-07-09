import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { usePremium } from '../context/PremiumContext';
import { isDemoMode } from '../../data/demo/demoMode';
import { BANNER_AD_UNIT_ID, BANNER2_AD_UNIT_ID } from './AdConfig';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export const AdBanner: React.FC = () => {
  const { isPremium } = usePremium();
  const [retryKey, setRetryKey] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const handleFail = useCallback(() => {
    setFailCount(c => {
      const next = c + 1;
      if (next < MAX_RETRIES) {
        setTimeout(() => setRetryKey(k => k + 1), RETRY_DELAY_MS);
      }
      return next;
    });
  }, []);

  if (isPremium || isDemoMode() || failCount >= MAX_RETRIES) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        key={retryKey}
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={handleFail}
      />
    </View>
  );
};

export const AdBannerAlways: React.FC = () => {
  const [retryKey, setRetryKey] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const handleFail = useCallback(() => {
    setFailCount(c => {
      const next = c + 1;
      if (next < MAX_RETRIES) {
        setTimeout(() => setRetryKey(k => k + 1), RETRY_DELAY_MS);
      }
      return next;
    });
  }, []);

  if (isDemoMode() || failCount >= MAX_RETRIES) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        key={retryKey}
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={handleFail}
      />
    </View>
  );
};

export const AdBanner2: React.FC = () => {
  const { isPremium } = usePremium();
  const [retryKey, setRetryKey] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const handleFail = useCallback(() => {
    setFailCount(c => {
      const next = c + 1;
      if (next < MAX_RETRIES) {
        setTimeout(() => setRetryKey(k => k + 1), RETRY_DELAY_MS);
      }
      return next;
    });
  }, []);

  if (isPremium || isDemoMode() || failCount >= MAX_RETRIES) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        key={retryKey}
        unitId={BANNER2_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={handleFail}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    backgroundColor: '#FFF0F3',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
  },
});
