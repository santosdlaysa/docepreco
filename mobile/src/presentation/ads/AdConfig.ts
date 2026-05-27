import { Platform } from 'react-native';

const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/9214589741';
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2435281174';

export const BANNER_AD_UNIT_ID = __DEV__
  ? Platform.select({ ios: TEST_BANNER_IOS, default: TEST_BANNER_ANDROID })
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? TEST_BANNER_IOS,
      default: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID ?? TEST_BANNER_ANDROID,
    });

export const BANNER2_AD_UNIT_ID = __DEV__
  ? Platform.select({ ios: TEST_BANNER_IOS, default: TEST_BANNER_ANDROID })
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_BANNER2_IOS ?? TEST_BANNER_IOS,
      default: process.env.EXPO_PUBLIC_ADMOB_BANNER2_ANDROID ?? TEST_BANNER_ANDROID,
    });

const TEST_INTERSTITIAL_ANDROID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_INTERSTITIAL_IOS = 'ca-app-pub-3940256099942544/4411468910';

export const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? Platform.select({ ios: TEST_INTERSTITIAL_IOS, default: TEST_INTERSTITIAL_ANDROID })
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS ?? TEST_INTERSTITIAL_IOS,
      default: 'ca-app-pub-6632812168210069/5497061807',
    });
