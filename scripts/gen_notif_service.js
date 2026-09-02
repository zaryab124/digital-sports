const fs = require('fs');

const notifServiceCode = `import { prisma } from '@/lib/prisma';
import { publishUserEvent, publishCityEvent, publishGlobalEvent } from '@/lib/realtime';

export type AppNotificationType =
  | 'TEAM_APPROVED'
  | 'TEAM_REJECTED'
  | 'MATCH_REQUEST'
  | 'MATCH_ACCEPTED'
  | 'MATCH_REJECTED'
  | 'MATCH_APPROVED'
  | 'MATCH_CANCELLED'
  | 'TRANSFER_REQUEST'
  | 'TRANSFER_APPROVED'
  | 'TRANSFER_REJECTED'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_VERIFIED'
  | 'MATCH_RESULT_VERIFIED'
  | 'RANKING_UPDATED';

export interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  notificationType: AppNotificationType;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED';
  linkUrl?: string;
  metadata?: Record<string, any>;
}

export async function sendNotification({
  userId,
  title,
  message,
  notificationType,
  type = 'INFO',
  linkUrl,
  metadata,
}: SendNotificationParams) {
  try {
    const notif = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        notificationType,
        linkUrl,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Publish in real-time to user's private channel
    publishUserEvent(userId, 'NOTIFICATION', notif);

    return notif;
  } catch (error) {
    console.error('Failed to dispatch notification:', error);
    return null;
  }
}

export async function broadcastNotification({
  userIds,
  title,
  message,
  notificationType,
  type = 'INFO',
  linkUrl,
  metadata,
}: {
  userIds: string[];
  title: string;
  message: string;
  notificationType: AppNotificationType;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED';
  linkUrl?: string;
  metadata?: Record<string, any>;
}) {
  const promises = userIds.map((userId) =>
    sendNotification({ userId, title, message, notificationType, type, linkUrl, metadata })
  );
  return Promise.all(promises);
}
`;

fs.writeFileSync('src/services/notification-service.ts', notifServiceCode.trim() + '\n', 'utf8');
console.log('[OK] Created src/services/notification-service.ts');
