import { NotificationStatus, NotificationType } from '../../enums/notification.enum';
import { ServiceStatus } from '../../enums/service.enum';

export interface Notification {
	_id: string;
	notificationType: NotificationType;
	notificationStatus: NotificationStatus;
	notificationTitle: string;
	authorNick?: string | null;
	conversationId?: string | null;
	messageId?: string | null;
	supportRequestId?: string | null;
	serviceId?: string | null;
	serviceStatus?: ServiceStatus | null;
	createdAt: string;
}

export interface Notifications {
	list: Notification[];
	total: number;
	unreadCount: number;
	readBefore: string;
}
