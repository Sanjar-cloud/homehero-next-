import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { ChatMessage, Conversation, ConversationsInquiry, MessagesInquiry, MessagingPage } from '../../libs/types/messaging/messaging';

export const MESSAGE_FIELDS = gql`
	fragment PrivateMessageFields on Message {
		_id
		conversationId
		senderId
		text
		createdAt
		serviceContext { serviceId serviceTitle }
	}
`;

export const CONVERSATION_FIELDS = gql`
	fragment PrivateConversationFields on Conversation {
		_id
		userId
		agentId
		activityAt
		createdAt
		updatedAt
		userData { _id memberNick memberImage }
		agentData { _id memberNick memberImage }
		lastMessage { ...PrivateMessageFields }
	}
	${MESSAGE_FIELDS}
`;

export const GET_CONVERSATIONS: TypedDocumentNode<
	{ getConversations: MessagingPage<Conversation> }, { input: ConversationsInquiry }
> = gql`
	query GetConversations($input: ConversationsInquiry!) {
		getConversations(input: $input) {
			list { ...PrivateConversationFields }
			metaCounter { total }
		}
	}
	${CONVERSATION_FIELDS}
`;

export const GET_MESSAGES: TypedDocumentNode<
	{ getMessages: MessagingPage<ChatMessage> }, { input: MessagesInquiry }
> = gql`
	query GetMessages($input: MessagesInquiry!) {
		getMessages(input: $input) {
			list { ...PrivateMessageFields }
			metaCounter { total }
		}
	}
	${MESSAGE_FIELDS}
`;
