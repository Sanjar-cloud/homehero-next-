export interface ConversationParticipant {
	_id: string;
	memberNick: string;
	memberImage: string;
}

export interface MessageServiceContext {
	serviceId: string;
	serviceTitle: string;
}

export interface ChatMessage {
	_id: string;
	conversationId: string;
	senderId: string;
	text: string;
	serviceContext: MessageServiceContext | null;
	createdAt: string;
}

export interface Conversation {
	_id: string;
	userId: string;
	agentId: string;
	userData: ConversationParticipant | null;
	agentData: ConversationParticipant | null;
	lastMessage: ChatMessage | null;
	activityAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface MessagingPage<T> {
	list: T[];
	metaCounter: { total: number | null }[];
}

export interface ConversationsInquiry {
	page: number;
	limit: number;
}

export interface MessagesInquiry extends ConversationsInquiry {
	conversationId: string;
}

export interface SendMessageInput {
	conversationId: string;
	text: string;
	serviceId?: string;
}
