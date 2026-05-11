import { Platform } from 'react-native';

const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/9214589741';
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2435281174';

export const BANNER_AD_UNIT_ID = __DEV__
  ? Platform.select({ ios: TEST_BANNER_IOS, default: TEST_BANNER_ANDROID })
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? TEST_BANNER_IOS,
      default: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID ?? TEST_BANNER_ANDROID,
    });
