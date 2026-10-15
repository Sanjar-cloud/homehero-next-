import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { BoardArticle } from '../../libs/types/board-article/board-article';
import type { BoardArticlesInquiry } from '../../libs/types/board-article/board-article.input';
import type { BoardArticleCategory } from '../../libs/enums/board-article.enum';
import type { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import type { CommentsInquiry } from '../../libs/types/comment/comment.input';

export interface CommunityArticle extends Pick<BoardArticle,
	'_id' | 'articleCategory' | 'articleStatus' | 'articleTitle' | 'articleContent' |
	'articleViews' | 'articleLikes' | 'articleComments' | 'memberId'
> {
	articleImage: string | null;
	createdAt: string;
	memberData: { _id: string; memberNick: string; memberImage: string } | null;
	meLiked: { memberId: string; likeRefId: string; myFavorite: boolean }[] | null;
}

export type CommunityInquiry = Omit<BoardArticlesInquiry, 'search'> & {
	search: { articleCategory?: BoardArticleCategory; text?: string; memberId?: string };
};

export const GET_COMMUNITY_ARTICLES: TypedDocumentNode<
	{ getBoardArticles: { list: CommunityArticle[]; metaCounter: { total: number | null }[] | null } },
	{ input: CommunityInquiry }
> = gql`
	query GetCommunityArticles($input: BoardArticlesInquiry!) {
		getBoardArticles(input: $input) {
			list {
				_id
				articleCategory
				articleStatus
				articleTitle
				articleContent
				articleImage
				articleViews
				articleLikes
				articleComments
				memberId
				createdAt
				memberData { _id memberNick memberImage }
				meLiked { memberId likeRefId myFavorite }
			}
			metaCounter { total }
		}
	}
`;

export const GET_COMMUNITY_ARTICLE: TypedDocumentNode<
	{ getBoardArticle: CommunityArticle },
	{ input: string }
> = gql`
	query GetCommunityArticle($input: String!) {
		getBoardArticle(articleId: $input) {
			_id
			articleCategory
			articleStatus
			articleTitle
			articleContent
			articleImage
			articleViews
			articleLikes
			articleComments
			memberId
			createdAt
			memberData { _id memberNick memberImage }
			meLiked { memberId likeRefId myFavorite }
		}
	}
`;

export interface CommunityComment {
	_id: string;
	commentStatus: CommentStatus;
	commentGroup: CommentGroup;
	commentContent: string;
	commentRefId: string;
	memberId: string;
	createdAt: string;
	updatedAt: string;
	memberData: CommunityArticle['memberData'];
}

export const GET_COMMUNITY_COMMENTS: TypedDocumentNode<
	{ getComments: { list: CommunityComment[]; metaCounter: { total: number | null }[] | null } },
	{ input: CommentsInquiry }
> = gql`
	query GetCommunityComments($input: CommentsInquiry!) {
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
