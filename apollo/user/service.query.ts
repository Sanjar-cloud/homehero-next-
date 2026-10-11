import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { Service, Services } from '../../libs/types/service/service';
import type { AgentServicesInquiry, OrdinaryInquiry, ServicesInquiry } from '../../libs/types/service/service.input';

export const GET_SERVICES: TypedDocumentNode<
	{ getServices: Services },
	{ input: ServicesInquiry }
> = gql`
	query GetServices($input: ServicesInquiry!) {
		getServices(input: $input) {
			list {
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
				memberData {
					_id
					memberNick
					memberImage
					memberDesc
					memberServices
				}
				meLiked {
					memberId
					likeRefId
					myFavorite
				}
			}
			metaCounter {
				total
			}
		}
	}
`;

export const GET_SERVICE: TypedDocumentNode<
	{ getService: Service },
	{ input: string }
> = gql`
	query GetService($input: String!) {
		getService(serviceId: $input) {
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
			memberData {
				_id
				memberNick
				memberImage
				memberDesc
				memberServices
			}
			meLiked {
				memberId
				likeRefId
				myFavorite
			}
		}
	}
`;

export const GET_AGENT_SERVICES: TypedDocumentNode<
	{ getAgentServices: Services },
	{ input: AgentServicesInquiry }
> = gql`
	query GetAgentServices($input: AgentServicesInquiry!) {
		getAgentServices(input: $input) {
			list {
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
				memberData {
					_id
					memberNick
					memberImage
					memberDesc
					memberServices
				}
				meLiked {
					memberId
					likeRefId
					myFavorite
				}
			}
			metaCounter {
				total
			}
		}
	}
`;

export const GET_SERVICE_FAVORITES: TypedDocumentNode<
	{ getFavorites: Services },
	{ input: OrdinaryInquiry }
> = gql`
	query GetServiceFavorites($input: OrdinaryInquiry!) {
		getFavorites(input: $input) {
			list {
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
				memberData {
					_id
					memberNick
					memberImage
					memberDesc
					memberServices
				}
				meLiked {
					memberId
					likeRefId
					myFavorite
				}
			}
			metaCounter {
				total
			}
		}
	}
`;

export const GET_SERVICE_VISITED: TypedDocumentNode<
	{ getVisited: Services },
	{ input: OrdinaryInquiry }
> = gql`
	query GetServiceVisited($input: OrdinaryInquiry!) {
		getVisited(input: $input) {
			list {
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
				memberData {
					_id
					memberNick
					memberImage
					memberDesc
					memberServices
				}
				meLiked {
					memberId
					likeRefId
					myFavorite
				}
			}
			metaCounter {
				total
			}
		}
	}
`;
