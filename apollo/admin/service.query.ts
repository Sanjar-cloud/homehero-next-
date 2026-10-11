import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { Services } from '../../libs/types/service/service';
import type { AllServicesInquiry } from '../../libs/types/service/service.input';

export const GET_ALL_SERVICES_BY_ADMIN: TypedDocumentNode<
	{ getAllServicesByAdmin: Services },
	{ input: AllServicesInquiry }
> = gql`
	query GetAllServicesByAdmin($input: AllServicesInquiry!) {
		getAllServicesByAdmin(input: $input) {
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
