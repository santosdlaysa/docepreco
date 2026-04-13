import { apiClient } from './client';

export interface NotificationTemplate {
  id: string;
  slug: string;
  title: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notificationTemplateApi = {
  getActive: async (): Promise<NotificationTemplate[]> => {
    const response = await apiClient.get('/notification-templates/active');
    return response.data.data;
  },
};
