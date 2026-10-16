import { gql, TypedDocumentNode } from '@apollo/client';
import type { CreateSupportNoticeInput, ReplySupportRequestInput, SupportNotice, SupportRequest, UpdateSupportNoticeInput } from '../../libs/types/support/support';

export const CREATE_SUPPORT_NOTICE: TypedDocumentNode<
	{ createSupportNotice: SupportNotice },
	{ input: CreateSupportNoticeInput }
> = gql`
	mutation CreateSupportNotice($input: CreateSupportNoticeInput!) {
		createSupportNotice(input: $input) { _id noticeCategory noticeStatus noticeTitle noticeContent
 translations { kr { title content } ru { title content } }
 createdAt updatedAt }
	}
`;

export const UPDATE_SUPPORT_NOTICE: TypedDocumentNode<
	{ updateSupportNotice: SupportNotice },
	{ input: UpdateSupportNoticeInput }
> = gql`
	mutation UpdateSupportNotice($input: UpdateSupportNoticeInput!) {
		updateSupportNotice(input: $input) { _id noticeCategory noticeStatus noticeTitle noticeContent
 translations { kr { title content } ru { title content } }
 createdAt updatedAt }
	}
`;

export const REPLY_SUPPORT_REQUEST: TypedDocumentNode<
	{ replySupportRequest: SupportRequest },
	{ input: ReplySupportRequestInput }
> = gql`
	mutation ReplySupportRequest($input: ReplySupportRequestInput!) {
		replySupportRequest(input: $input) { _id memberId subject content status reply adminId repliedAt createdAt updatedAt
 memberData { _id memberNick memberType } }
	}
`;
