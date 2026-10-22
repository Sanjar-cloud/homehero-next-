import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';

export const MARK_NOTIFICATION_READ: TypedDocumentNode<
	{ markNotificationRead: boolean },
	{ notificationId: string }
> = gql`
	mutation MarkNotificationRead($notificationId: String!) {
		markNotificationRead(notificationId: $notificationId)
	}
`;

export const MARK_ALL_NOTIFICATIONS_READ: TypedDocumentNode<
	{ markAllNotificationsRead: boolean },
	{ before: string }
> = gql`
	mutation MarkAllNotificationsRead($before: DateTime!) {
		markAllNotificationsRead(before: $before)
	}
`;

export const MARK_MESSAGE_NOTIFICATIONS_READ: TypedDocumentNode<
	{ markMessageNotificationsRead: boolean },
	{ input: { conversationId: string; messageIds: string[] } }
> = gql`
	mutation MarkMessageNotificationsRead($input: ReadMessageNotificationsInput!) {
		markMessageNotificationsRead(input: $input)
	}
`;
