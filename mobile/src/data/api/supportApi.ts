import { apiClient } from './client';

export interface SupportMessage {
  id: string;
  userId: string;
  senderType: 'user' | 'admin';
  message: string;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export const supportApi = {
  getMessages: async (): Promise<SupportMessage[]> => {
    const response = await apiClient.get('/support/messages');
    return response.data.data;
  },

  sendMessage: async (message: string, imageUrl?: string | null): Promise<SupportMessage> => {
    const response = await apiClient.post('/support/messages', { message, imageUrl });
    return response.data.data;
  },

  getHumanAssistanceStatus: async (): Promise<boolean> => {
    const response = await apiClient.get('/support/human-assistance');
    return response.data.data.requested;
  },

  requestHumanAssistance: async (): Promise<void> => {
    await apiClient.post('/support/human-assistance');
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/support/unread');
    return response.data.data.unreadCount;
  },

  isAdminTyping: async (): Promise<boolean> => {
    const response = await apiClient.get('/support/typing');
    return response.data.data.typing;
  },
};
