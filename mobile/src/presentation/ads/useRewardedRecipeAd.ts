import { useCallback, useState } from 'react';
import { AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { rewardedAdApi } from '../../data/api/rewardedAdApi';
import { REWARDED_AD_UNIT_ID } from './AdConfig';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Mostra anúncio opt-in e só libera após o backend receber a confirmação SSV do AdMob. */
export function useRewardedRecipeAd() {
  const [loadingReward, setLoadingReward] = useState(false);

  const watchToUnlockRecipe = useCallback(async (): Promise<boolean> => {
    if (!REWARDED_AD_UNIT_ID || loadingReward) return false;
    setLoadingReward(true);
    try {
      const session = await rewardedAdApi.startRecipeReward();
      const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
        serverSideVerificationOptions: { customData: session.id },
      });
      const completed = await new Promise<boolean>((resolve, reject) => {
        let earned = false;
        const clean = () => { loaded(); reward(); closed(); failed(); };
        const loaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => ad.show());
        const reward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; });
        const closed = ad.addAdEventListener(AdEventType.CLOSED, () => { clean(); resolve(earned); });
        const failed = ad.addAdEventListener(AdEventType.ERROR, error => { clean(); reject(error); });
        ad.load();
      });
      if (!completed) return false;
      // O callback SSV pode chegar alguns segundos depois do fechamento do vídeo.
      for (let attempt = 0; attempt < 12; attempt++) {
        if (await rewardedAdApi.getRecipeRewardStatus(session.id) === 'rewarded') return true;
        await wait(1000);
      }
      return false;
    } finally { setLoadingReward(false); }
  }, [loadingReward]);

  return { loadingReward, watchToUnlockRecipe, available: !!REWARDED_AD_UNIT_ID };
}
