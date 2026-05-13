import mobileAds from 'react-native-google-mobile-ads';

export function initializeMobileAds(): void {
  mobileAds().initialize().catch(() => {});
}
