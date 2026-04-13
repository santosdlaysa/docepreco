import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PostgresPushTokenRepository } from '../repositories/PostgresPushTokenRepository';

const expo = new Expo();
const tokenRepo = new PostgresPushTokenRepository();

export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<number> {
  const validTokens = tokens.filter(t => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) return 0;

  const messages: ExpoPushMessage[] = validTokens.map(token => ({
    to: token,
    sound: 'default' as const,
    title,
    body,
    data: data as Record<string, unknown> | undefined,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  let successCount = 0;

  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === 'ok') {
          successCount++;
        } else if (
          ticket.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered'
        ) {
          const failedToken = (chunk[i] as ExpoPushMessage).to as string;
          await tokenRepo.removeByToken(failedToken);
        }
      }
    } catch (err) {
      console.error('[PushService] Error sending chunk:', err);
    }
  }

  return successCount;
}
