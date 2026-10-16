import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiChevronRight, FiEye, FiHeart, FiMessageCircle } from 'react-icons/fi';
import type { CommunityArticle } from '../../../apollo/user/community.query';
import { BoardArticleCategory } from '../../enums/board-article.enum';
import { imageUrl, ServiceImage } from '../service/ServiceCard';
import styles from '../../../scss/homehero/community.module.scss';

export const communityCategories: Record<BoardArticleCategory, string> = {
	FREE: 'General Discussion',
	RECOMMEND: 'Recommendations',
	NEWS: 'News & Updates',
	HUMOR: 'Fun & Stories',
};

export function articlePreview(content: string): string {
	// The excerpt is plain text, including when legacy posts contain editor HTML.
	const text = content
		.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
	return text.length > 220 ? `${text.slice(0, 220)}…` : text;
}

interface CommunityPostCardProps {
	article: CommunityArticle;
	viewerId: string;
	pending: boolean;
	onLike: (id: string) => Promise<void>;
}

const CommunityPostCard = ({ article, viewerId, pending, onLike }: CommunityPostCardProps) => {
	const { t: translate } = useTranslation('common');
	const router = useRouter();
	const hasImage = !!imageUrl(article.articleImage || undefined);
	const author = article.memberData?._id === article.memberId ? article.memberData : null;
	const name = author?.memberNick || translate('Author unavailable', { defaultValue: 'Author unavailable' }) || 'Author unavailable';
	const authorHref = author
		? author._id === viewerId ? '/mypage' : { pathname: '/member', query: { memberId: author._id } }
		: null;
	const detailHref = {
		pathname: '/community/detail',
		query: { articleCategory: article.articleCategory, id: article._id },
	};
	const liked = !!viewerId && !!article.meLiked?.some((like) => (
		like.memberId === viewerId && like.likeRefId === article._id && like.myFavorite
	));
	const locale = router.locale === 'kr' ? 'ko' : router.locale || 'en';

	return (
		<article className={`${styles.postCard} ${hasImage ? '' : styles.noImage}`}>
			{hasImage && (
				<div className={styles.postImage}>
					<ServiceImage path={article.articleImage || undefined} alt="" />
				</div>
			)}
			<div className={styles.postCopy}>
				<span className={styles.category}>{translate(communityCategories[article.articleCategory])}</span>
				<h2>
					<Link href={detailHref} className={styles.titleLink}>{article.articleTitle}</Link>
				</h2>
				<p className={styles.excerpt}>{articlePreview(article.articleContent)}</p>
				<div className={styles.postMeta}>
					{authorHref ? (
						<Link href={authorHref} className={styles.author}>
							<ServiceImage path={author?.memberImage} alt={name} avatar className={styles.avatar} />
							<strong>{name}</strong>
						</Link>
					) : <strong>{name}</strong>}
					{!Number.isNaN(Date.parse(article.createdAt)) && (
						<time dateTime={article.createdAt}>
							{new Date(article.createdAt).toLocaleDateString(locale, {
								month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
							})}
						</time>
					)}
					<span aria-label={translate('viewCount', { count: article.articleViews })}>
						<FiEye size={14} aria-hidden="true" /> {article.articleViews}
					</span>
					<button
						type="button"
						className={`${styles.likeButton} ${liked ? styles.liked : ''}`}
						disabled={pending}
						aria-label={translate(liked ? 'Unlike {{title}}' : 'Like {{title}}', { title: article.articleTitle })}
						aria-pressed={liked}
						onClick={() => void onLike(article._id)}
					>
						<FiHeart size={14} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
						{article.articleLikes}
					</button>
					<span aria-label={translate('commentCount', { count: article.articleComments })}>
						<FiMessageCircle size={14} aria-hidden="true" /> {article.articleComments}
					</span>
				</div>
			</div>
			<FiChevronRight className={styles.cardArrow} size={19} aria-hidden="true" />
		</article>
	);
};

export default CommunityPostCard;
