import { apiClient } from './client';

export interface CheckinStatus {
  enabled: boolean;
  eligible: boolean;
  title: string;
  message: string;
  daysRequired: number;
  rewardDays: number;
  rewardTier: 'premium' | 'master';
  consecutive: boolean;
  maxRewardsPerUser: number;
  today: string;
  checkedInToday: boolean;
  progress: number;
  rewardsEarned: number;
  canEarnMore: boolean;
}

export interface CheckinReward {
  tier: 'premium' | 'master';
  days: number;
  premiumUntil: string;
}

export interface CheckinResult {
  status: CheckinStatus;
  reward: CheckinReward | null;
  alreadyCheckedIn: boolean;
}

export const checkinApi = {
  getStatus: async (): Promise<CheckinStatus> => {
    const response = await apiClient.get('/checkin');
    return response.data.data;
  },

  checkIn: async (): Promise<CheckinResult> => {
    const response = await apiClient.post('/checkin');
    return response.data.data;
  },
};
