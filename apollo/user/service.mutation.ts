import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { Service } from '../../libs/types/service/service';
import type { ServiceInput } from '../../libs/types/service/service.input';
import type { ServiceUpdate } from '../../libs/types/service/service.update';

export const CREATE_SERVICE: TypedDocumentNode<
	{ createService: Omit<Service, 'memberData' | 'meLiked'> },
	{ input: ServiceInput }
> = gql`
	mutation CreateService($input: ServiceInput!) {
		createService(input: $input) {
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

export const UPDATE_SERVICE: TypedDocumentNode<
	{ updateService: Omit<Service, 'memberData' | 'meLiked'> },
	{ input: ServiceUpdate }
> = gql`
	mutation UpdateService($input: ServiceUpdate!) {
		updateService(input: $input) {
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

export const LIKE_TARGET_SERVICE: TypedDocumentNode<
	{ likeTargetService: Omit<Service, 'memberData' | 'meLiked'> },
	{ input: string }
> = gql`
	mutation LikeTargetService($input: String!) {
		likeTargetService(serviceId: $input) {
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
