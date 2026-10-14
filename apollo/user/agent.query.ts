import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { Member } from '../../libs/types/member/member';
import type { AgentsInquiry } from '../../libs/types/member/member.input';

export type PublicAgent = Pick<Member,
	'_id' | 'memberType' | 'memberStatus' | 'memberNick' | 'memberFullName' |
	'memberImage' | 'memberAddress' | 'memberDesc' | 'memberServices' | 'memberFollowers' | 'createdAt'
>;

export const GET_PUBLIC_AGENTS: TypedDocumentNode<
	{ getAgents: { list: PublicAgent[]; metaCounter: { total: number | null }[] | null } },
	{ input: AgentsInquiry }
> = gql`
	query GetPublicAgents($input: AgentsInquiry!) {
		getAgents(input: $input) {
			list {
				_id memberType memberStatus memberNick memberFullName
				memberImage memberAddress memberDesc memberServices memberFollowers createdAt
			}
			metaCounter { total }
		}
	}
`;

export const GET_AGENT_FOLLOWING_IDS: TypedDocumentNode<
	{ getMemberFollowings: { list: { followerId: string; followingId: string }[]; metaCounter: { total: number | null }[] | null } },
	{ input: { page: number; limit: number; search: { followerId: string } } }
> = gql`
	query GetAgentFollowingIds($input: FollowInquiry!) {
		getMemberFollowings(input: $input) {
			list { followerId followingId }
			metaCounter { total }
		}
	}
`;
