import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PostgresPushTokenRepository } from '../repositories/PostgresPushTokenRepository';

const expo = new Expo();
const tokenRepo = new PostgresPushTokenRepository();

export interface PushSendResult {
  /** Nº de entregas aceitas pelo Expo (contagem por dispositivo/token). */
  successCount: number;
  /** Tokens que o Expo aceitou — permite mapear de volta para usuários. */
  successfulTokens: string[];
}

export async function sendPushNotificationsDetailed(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<PushSendResult> {
  const validTokens = tokens.filter(t => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) return { successCount: 0, successfulTokens: [] };

  const messages: ExpoPushMessage[] = validTokens.map(token => ({
    to: token,
    sound: 'default' as const,
    title,
    body,
    data: data as Record<string, unknown> | undefined,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  let successCount = 0;
  const successfulTokens: string[] = [];

  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const to = (chunk[i] as ExpoPushMessage).to as string;
        if (ticket.status === 'ok') {
          successCount++;
          successfulTokens.push(to);
        } else if (
          ticket.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered'
        ) {
          await tokenRepo.removeByToken(to);
        }
      }
    } catch (err) {
      console.error('[PushService] Error sending chunk:', err);
    }
  }

  return { successCount, successfulTokens };
}

export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<number> {
  const { successCount } = await sendPushNotificationsDetailed(tokens, title, body, data);
  return successCount;
}
