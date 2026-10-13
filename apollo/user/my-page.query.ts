import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { FollowInquiry } from '../../libs/types/follow/follow.input';
import type { MeFollowed } from '../../libs/types/follow/follow';

export interface MyPageConnection {
	_id: string;
	createdAt: string;
	meLiked?: { myFavorite: boolean }[] | null;
	meFollowed?: MeFollowed[] | null;
	followerData?: ConnectionMember | null;
	followingData?: ConnectionMember | null;
}
interface ConnectionMember {
	_id: string;
	memberNick: string;
	memberFullName?: string | null;
	memberImage: string;
	memberAddress?: string | null;
	memberDesc?: string | null;
	memberType: string;
	memberServices: number;
	memberFollowers: number;
	memberLikes: number;
}
interface Connections {
	list: MyPageConnection[];
	metaCounter?: { total?: number | null }[] | null;
}

export const GET_MY_PAGE_FOLLOWERS: TypedDocumentNode<{ getMemberFollowers: Connections }, { input: FollowInquiry }> = gql`
	query GetMyPageFollowers($input: FollowInquiry!) {
		getMemberFollowers(input: $input) {
			list {
				_id
				createdAt
				meLiked { myFavorite }
				meFollowed { followingId followerId myFollowing }
				followerData {
					_id memberNick memberFullName memberImage memberAddress memberDesc memberType memberServices memberFollowers memberLikes
				}
			}
			metaCounter { total }
		}
	}
`;
export const GET_MY_PAGE_FOLLOWINGS: TypedDocumentNode<{ getMemberFollowings: Connections }, { input: FollowInquiry }> = gql`
	query GetMyPageFollowings($input: FollowInquiry!) {
		getMemberFollowings(input: $input) {
			list {
				_id
				createdAt
				meLiked { myFavorite }
				meFollowed { followingId followerId myFollowing }
				followingData {
					_id memberNick memberFullName memberImage memberAddress memberDesc memberType memberServices memberFollowers memberLikes
				}
			}
			metaCounter { total }
		}
	}
`;
