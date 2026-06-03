import { apiClient } from './client';

export type ReferralStatus = 'pending' | 'valid' | 'rewarded' | 'invalid';

export interface ReferralHistoryItem {
  companyName: string;
  emailMasked: string;
  status: ReferralStatus;
  createdAt: string;
  activatedAt: string | null;
}

export interface ReferralData {
  code: string | null;
  validCount: number;
  rewardedCount: number;
  pendingCount: number;
  target: number;
  cycle: number;
  remainingToReward: number;
  rewardsEarned: number;
  history: ReferralHistoryItem[];
}

export const referralApi = {
  getMe: async (): Promise<ReferralData> => {
    const response = await apiClient.get('/referrals/me');
    return response.data.data;
  },
};
