import { gql, TypedDocumentNode } from '@apollo/client';
import type { AdminSupportNoticesInquiry, SupportNotices, SupportRequests, SupportRequestsInquiry } from '../../libs/types/support/support';

export const GET_SUPPORT_NOTICES_BY_ADMIN: TypedDocumentNode<
	{ getSupportNoticesByAdmin: SupportNotices },
	{ input: AdminSupportNoticesInquiry }
> = gql`
	query GetSupportNoticesByAdmin($input: AdminSupportNoticesInquiry!) {
		getSupportNoticesByAdmin(input: $input) {
			list { _id noticeCategory noticeStatus noticeTitle noticeContent
 translations { kr { title content } ru { title content } }
 createdAt updatedAt }
			metaCounter { total }
		}
	}
`;

export const GET_SUPPORT_REQUESTS_BY_ADMIN: TypedDocumentNode<
	{ getSupportRequestsByAdmin: SupportRequests },
	{ input: SupportRequestsInquiry }
> = gql`
	query GetSupportRequestsByAdmin($input: SupportRequestsInquiry!) {
		getSupportRequestsByAdmin(input: $input) {
			list { _id memberId subject content status reply adminId repliedAt createdAt updatedAt
 memberData { _id memberNick memberType } }
			metaCounter { total }
		}
	}
`;
