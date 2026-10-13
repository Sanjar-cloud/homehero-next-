import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { ChatMessage, Conversation, SendMessageInput } from '../../libs/types/messaging/messaging';
import { CONVERSATION_FIELDS, MESSAGE_FIELDS } from './messaging.query';

export const START_CONVERSATION: TypedDocumentNode<
	{ startConversation: Conversation }, { input: { serviceId: string } }
> = gql`
	mutation StartConversation($input: StartConversationInput!) {
		startConversation(input: $input) { ...PrivateConversationFields }
	}
	${CONVERSATION_FIELDS}
`;

export const SEND_MESSAGE: TypedDocumentNode<
	{ sendMessage: ChatMessage }, { input: SendMessageInput }
> = gql`
	mutation SendMessage($input: SendMessageInput!) {
		sendMessage(input: $input) { ...PrivateMessageFields }
	}
	${MESSAGE_FIELDS}
`;
