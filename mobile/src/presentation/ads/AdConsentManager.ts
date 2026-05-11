import { AdsConsent, AdsConsentInfo, AdsConsentStatus } from 'react-native-google-mobile-ads';

export async function requestAdConsent(): Promise<void> {
  try {
    const consentInfo: AdsConsentInfo = await AdsConsent.requestInfoUpdate();

    if (
      consentInfo.status === AdsConsentStatus.REQUIRED ||
      consentInfo.status === AdsConsentStatus.OBTAINED
    ) {
      await AdsConsent.loadAndShowConsentFormIfRequired();
    }
  } catch (error) {
    // Consent errors should not crash the app
    console.warn('Ad consent error:', error);
  }
}
