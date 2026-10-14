import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { AgentReviews, AgentReviewsInquiry } from '../../libs/types/review/review';

export const GET_AGENT_REVIEWS: TypedDocumentNode<{ getAgentReviews: AgentReviews }, { input: AgentReviewsInquiry }> = gql`
	query GetAgentReviews($input: AgentReviewsInquiry!) {
		getAgentReviews(input: $input) {
			list {
				_id authorId agentId text createdAt
				authorData { _id memberNick memberImage }
			}
			metaCounter { total }
		}
	}
`;
