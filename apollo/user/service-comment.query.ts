import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { CommentsInquiry } from '../../libs/types/comment/comment.input';
import type { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';

export interface ServiceComment {
	_id: string;
	commentStatus: CommentStatus;
	commentGroup: CommentGroup;
	commentContent: string;
	commentRefId: string;
	memberId: string;
	createdAt: string;
	updatedAt: string;
	memberData: { _id: string; memberNick: string; memberImage: string } | null;
}

export const GET_SERVICE_COMMENTS: TypedDocumentNode<
	{ getComments: { list: ServiceComment[]; metaCounter: { total: number | null }[] | null } },
	{ input: CommentsInquiry }
> = gql`
	query GetServiceComments($input: CommentsInquiry!) {
		getComments(input: $input) {
			list {
				_id
				commentStatus
				commentGroup
				commentContent
				commentRefId
				memberId
				createdAt
				updatedAt
				memberData { _id memberNick memberImage }
			}
			metaCounter { total }
		}
	}
`;
