import { useEffect, useCallback, useRef } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { usePremium } from '../context/PremiumContext';
import { isDemoMode } from '../../data/demo/demoMode';
import { INTERSTITIAL_AD_UNIT_ID } from './AdConfig';

const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);

export const useAdInterstitial = () => {
  const { isPremium } = usePremium();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (isPremium || isDemoMode()) return;

    const onLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
    });

    const onClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      loadedRef.current = false;
      interstitial.load();
    });

    interstitial.load();

    return () => {
      onLoaded();
      onClosed();
    };
  }, [isPremium]);

  const showInterstitial = useCallback(() => {
    if (isPremium || isDemoMode()) return;
    if (loadedRef.current) {
      interstitial.show();
    }
  }, [isPremium]);

  return { showInterstitial };
};
