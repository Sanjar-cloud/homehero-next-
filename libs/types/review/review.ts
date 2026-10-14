export interface AgentReview {
	_id: string;
	authorId: string;
	agentId: string;
	text: string;
	createdAt: string;
	authorData?: { _id: string; memberNick: string; memberImage?: string | null } | null;
}

export interface AgentReviews {
	list: AgentReview[];
	metaCounter: { total: number | null }[];
}

export interface CreateAgentReviewInput {
	agentId: string;
	text: string;
}

export interface AgentReviewsInquiry {
	agentId: string;
	page: number;
	limit: number;
}
