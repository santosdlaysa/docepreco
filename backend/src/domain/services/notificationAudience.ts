export const notificationTargets = ['all', 'premium', 'free', 'master', 'expired', 'individual'] as const;
export type NotificationTarget = typeof notificationTargets[number];

export function normalizeNotificationSchedule(scheduledAt: unknown): string | undefined {
  if (scheduledAt === undefined) return undefined;
  if (typeof scheduledAt !== 'string' || !scheduledAt.trim()
    || !Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt) <= Date.now()) {
    throw new Error('scheduledAt deve ser uma data futura válida');
  }
  return new Date(scheduledAt).toISOString();
}

export function normalizeNotificationAudience(target: unknown = 'all', recipientUserIds?: unknown): {
  target: NotificationTarget; recipientUserIds: string[] | null;
} {
  if (typeof target !== 'string' || !notificationTargets.includes(target as NotificationTarget)) {
    throw new Error('Público de notificação inválido');
  }
  if (target !== 'individual') {
    if (recipientUserIds !== undefined && recipientUserIds !== null) {
      throw new Error('recipientUserIds exige target individual');
    }
    return { target: target as NotificationTarget, recipientUserIds: null };
  }
  if (!Array.isArray(recipientUserIds) || recipientUserIds.length < 1 || recipientUserIds.length > 100
    || recipientUserIds.some(id => typeof id !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    throw new Error('recipientUserIds deve conter de 1 a 100 UUIDs válidos');
  }
  return { target: 'individual', recipientUserIds: [...new Set((recipientUserIds as string[]).map(id => id.toLowerCase()))] };
}
