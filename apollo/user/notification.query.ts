import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { Notifications } from '../../libs/types/notification/notification';

export const GET_NOTIFICATIONS: TypedDocumentNode<
	{ getNotifications: Notifications },
	{ input: { page: number; limit: number } }
> = gql`
	query GetNotifications($input: NotificationsInquiry!) {
		getNotifications(input: $input) {
			list {
				_id
				notificationType
				notificationStatus
				notificationTitle
				authorNick
				conversationId
				messageId
				supportRequestId
				serviceId
				serviceStatus
				createdAt
			}
			total
			unreadCount
			readBefore
		}
	}
`;
