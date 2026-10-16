import { gql, TypedDocumentNode } from '@apollo/client';
import type { SupportNotices, SupportNoticesInquiry, SupportRequests, SupportRequestsInquiry } from '../../libs/types/support/support';

export const GET_SUPPORT_NOTICES: TypedDocumentNode<
	{ getSupportNotices: SupportNotices },
	{ input: SupportNoticesInquiry }
> = gql`
	query GetSupportNotices($input: SupportNoticesInquiry!) {
		getSupportNotices(input: $input) {
			list { _id noticeCategory noticeStatus noticeTitle noticeContent
 translations { kr { title content } ru { title content } }
 createdAt updatedAt }
			metaCounter { total }
		}
	}
`;

export const GET_MY_SUPPORT_REQUESTS: TypedDocumentNode<
	{ getMySupportRequests: SupportRequests },
	{ input: SupportRequestsInquiry }
> = gql`
	query GetMySupportRequests($input: SupportRequestsInquiry!) {
		getMySupportRequests(input: $input) {
			list { _id memberId subject content status reply adminId repliedAt createdAt updatedAt
 memberData { _id memberNick memberType } }
			metaCounter { total }
		}
	}
`;
