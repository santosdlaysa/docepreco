import { PostgresNotificationRepository } from '../repositories/PostgresNotificationRepository';
import { PostgresPushTokenRepository } from '../repositories/PostgresPushTokenRepository';
import { sendPushNotificationsDetailed } from './pushService';

export async function processScheduledNotifications(): Promise<void> {
  const notifications = new PostgresNotificationRepository();
  const pushTokens = new PostgresPushTokenRepository();
  const pending = await notifications.findPending();
  for (const notification of pending) {
    try {
      // Recipient selection is persisted, never rebuilt as a group on retry.
      const tokens = await pushTokens.findByTarget(notification.target, notification.recipientUserIds);
      const data = notification.dataJson ? JSON.parse(notification.dataJson) : undefined;
      const result = await sendPushNotificationsDetailed(tokens.map(token => token.token), notification.title, notification.body, data);
      const successful = new Set(result.successfulTokens);
      const reached = new Set(tokens.filter(token => successful.has(token.token)).map(token => token.userId));
      await notifications.markSent(notification.id, reached.size);
    } catch {
      await notifications.markFailed(notification.id);
    }
  }
}
