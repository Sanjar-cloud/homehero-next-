import { gql, TypedDocumentNode } from '@apollo/client';
import type { CreateSupportRequestInput, SupportRequest } from '../../libs/types/support/support';

export const CREATE_SUPPORT_REQUEST: TypedDocumentNode<
	{ createSupportRequest: SupportRequest },
	{ input: CreateSupportRequestInput }
> = gql`
	mutation CreateSupportRequest($input: CreateSupportRequestInput!) {
		createSupportRequest(input: $input) { _id memberId subject content status reply adminId repliedAt createdAt updatedAt
 memberData { _id memberNick memberType } }
	}
`;
