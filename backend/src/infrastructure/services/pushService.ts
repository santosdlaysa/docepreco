import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceiptId } from 'expo-server-sdk';
import { PostgresPushTokenRepository } from '../repositories/PostgresPushTokenRepository';

const expo = new Expo();
const tokenRepo = new PostgresPushTokenRepository();

export interface PushSendResult {
  /** Nº de entregas aceitas pelo Expo (contagem por dispositivo/token). */
  successCount: number;
  /** Tokens que o Expo aceitou — permite mapear de volta para usuários. */
  successfulTokens: string[];
}

/**
 * Consulta os receipts alguns segundos após o envio. Um ticket "ok" só diz que o
 * Expo enfileirou a mensagem — a entrega real (e os erros de credencial FCM, como
 * MismatchSenderId / InvalidCredentials) só aparecem aqui. Roda em background para
 * não bloquear a resposta HTTP; loga a causa real e remove tokens mortos.
 */
async function checkReceipts(receiptIdToToken: Map<ExpoPushReceiptId, string>): Promise<void> {
  const receiptIds = [...receiptIdToToken.keys()];
  if (receiptIds.length === 0) return;

  const chunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  for (const chunk of chunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [receiptId, receipt] of Object.entries(receipts)) {
        if (receipt.status === 'ok') continue;
        const error = receipt.details?.error;
        console.error(
          `[PushService] Falha na entrega (receipt ${receiptId}): ${receipt.message ?? ''} [${error ?? 'sem código'}]`
        );
        // Token inválido/descadastrado → remove para não sujar futuros envios.
        if (error === 'DeviceNotRegistered') {
          const token = receiptIdToToken.get(receiptId as ExpoPushReceiptId);
          if (token) await tokenRepo.removeByToken(token);
        }
      }
    } catch (err) {
      console.error('[PushService] Erro ao consultar receipts:', err);
    }
  }
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
  // Mapeia o receipt de cada envio aceito de volta ao token, para checar a entrega real.
  const receiptIdToToken = new Map<ExpoPushReceiptId, string>();

  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const to = (chunk[i] as ExpoPushMessage).to as string;
        if (ticket.status === 'ok') {
          successCount++;
          successfulTokens.push(to);
          if (ticket.id) receiptIdToToken.set(ticket.id, to);
        } else if (ticket.status === 'error') {
          // Erro já na aceitação (ex.: credenciais ausentes) — loga a causa real.
          console.error(
            `[PushService] Ticket rejeitado: ${ticket.message ?? ''} [${ticket.details?.error ?? 'sem código'}]`
          );
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await tokenRepo.removeByToken(to);
          }
        }
      }
    } catch (err) {
      console.error('[PushService] Error sending chunk:', err);
    }
  }

  // Confirma a entrega real em background (não bloqueia a resposta ao admin).
  if (receiptIdToToken.size > 0) {
    setTimeout(() => {
      void checkReceipts(receiptIdToToken);
    }, 8000);
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
