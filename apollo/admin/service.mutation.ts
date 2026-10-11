import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { Service } from '../../libs/types/service/service';
import type { ServiceUpdate } from '../../libs/types/service/service.update';

export const UPDATE_SERVICE_BY_ADMIN: TypedDocumentNode<
	{ updateServiceByAdmin: Omit<Service, 'memberData' | 'meLiked'> },
	{ input: ServiceUpdate }
> = gql`
	mutation UpdateServiceByAdmin($input: ServiceUpdate!) {
		updateServiceByAdmin(input: $input) {
			_id
			serviceCategory
			serviceStatus
			serviceLocation
			serviceTitle
			serviceDesc
			servicePrice
			serviceImages
			serviceViews
			serviceLikes
			serviceComments
			serviceRank
			memberId
			deletedAt
			createdAt
			updatedAt
		}
	}
`;

export const REMOVE_SERVICE_BY_ADMIN: TypedDocumentNode<
	{ removeServiceByAdmin: Omit<Service, 'memberData' | 'meLiked'> },
	{ input: string }
> = gql`
	mutation RemoveServiceByAdmin($input: String!) {
		removeServiceByAdmin(serviceId: $input) {
			_id
			serviceCategory
			serviceStatus
			serviceLocation
			serviceTitle
			serviceDesc
			servicePrice
			serviceImages
			serviceViews
			serviceLikes
			serviceComments
			serviceRank
			memberId
			deletedAt
			createdAt
			updatedAt
		}
	}
`;
