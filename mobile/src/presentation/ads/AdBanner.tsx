import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { usePremium } from '../context/PremiumContext';
import { isDemoMode } from '../../data/demo/demoMode';
import { BANNER_AD_UNIT_ID, BANNER2_AD_UNIT_ID } from './AdConfig';

export const AdBanner: React.FC = () => {
  const { isPremium } = usePremium();
  const [failed, setFailed] = useState(false);

  if (isPremium || isDemoMode() || failed) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
};

export const AdBannerAlways: React.FC = () => {
  const [failed, setFailed] = useState(false);

  if (isDemoMode() || failed) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
};

export const AdBanner2: React.FC = () => {
  const { isPremium } = usePremium();
  const [failed, setFailed] = useState(false);

  if (isPremium || isDemoMode() || failed) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER2_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
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
