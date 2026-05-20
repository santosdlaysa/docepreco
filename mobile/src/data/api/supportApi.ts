import { apiClient } from './client';

export interface SupportMessage {
  id: string;
  userId: string;
  senderType: 'user' | 'admin';
  message: string;
  readAt: string | null;
  createdAt: string;
}

export const supportApi = {
  getMessages: async (): Promise<SupportMessage[]> => {
    const response = await apiClient.get('/support/messages');
    return response.data.data;
  },

  sendMessage: async (message: string): Promise<SupportMessage> => {
    const response = await apiClient.post('/support/messages', { message });
    return response.data.data;
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
