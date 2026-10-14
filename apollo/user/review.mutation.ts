import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { AgentReview, CreateAgentReviewInput } from '../../libs/types/review/review';

export const CREATE_AGENT_REVIEW: TypedDocumentNode<{ createAgentReview: AgentReview }, { input: CreateAgentReviewInput }> = gql`
	mutation CreateAgentReview($input: CreateAgentReviewInput!) {
		createAgentReview(input: $input) {
			_id authorId agentId text createdAt
			authorData { _id memberNick memberImage }
		}
	}
`;
