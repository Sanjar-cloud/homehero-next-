import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FiArrowLeft, FiCalendar, FiChevronRight, FiEye, FiHeart } from 'react-icons/fi';
import type { ViewerProps } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import { GET_COMMUNITY_ARTICLE } from '../../apollo/user/community.query';
import { LIKE_TARGET_BOARD_ARTICLE } from '../../apollo/user/mutation';
import { userVar } from '../../apollo/store';
import { getJwtToken } from '../../libs/auth';
import { Message } from '../../libs/enums/common.enum';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import { communityCategories } from '../../libs/components/community/CommunityPostCard';
import CommunityComments from '../../libs/components/community/CommunityComments';
import { Button } from '../../libs/components/homehero/UI';
import { imageUrl, ServiceImage } from '../../libs/components/service/ServiceCard';
import { scalar } from '../../libs/components/service/ServiceFilter';
import styles from '../../scss/homehero/community.module.scss';

// Use the installed viewer's default sanitizer, without custom HTML renderers.
const ArticleViewer = dynamic<ViewerProps>(() => import('@toast-ui/react-editor').then((module) => module.Viewer), {
	ssr: false,
	loading: () => <p role="status">Loading post content…</p>,
});

export const getStaticProps = async ({ locale }: { locale: string }) => ({
	props: { ...(await serverSideTranslations(locale, ['common'])) },
});

interface ArticlePanelProps {
	articleId: string;
	memberId: string;
	token: string;
}

const ArticlePanel = ({ articleId, memberId, token }: ArticlePanelProps) => {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [uncertain, setUncertain] = useState(false);
	const [actionError, setActionError] = useState('');
	const mounted = useRef(false);
	const likeLock = useRef(false);
	const currentAccount = () => mounted.current && userVar()._id === memberId && (getJwtToken() || '') === token;

	/** APOLLO REQUESTS **/
	const articleQuery = useQuery(GET_COMMUNITY_ARTICLE, {
		variables: { input: articleId },
		fetchPolicy: 'no-cache',
		context: { queryDeduplication: false },
		notifyOnNetworkStatusChange: true,
	});
	const [likeTargetBoardArticle] = useMutation(LIKE_TARGET_BOARD_ARTICLE, { fetchPolicy: 'no-cache' });
	const result = articleQuery.data?.getBoardArticle;
	const article = result?._id === articleId && result.articleStatus === 'ACTIVE' ? result : undefined;
	const missing = articleQuery.error?.graphQLErrors.some((error) => error.message === Message.NO_DATA_FOUND);
	const author = article?.memberData?._id === article?.memberId ? article?.memberData : null;
	const authorName = author?.memberNick || 'Author unavailable';
	const authorHref = author
		? author._id === memberId ? '/mypage' : { pathname: '/member', query: { memberId: author._id } }
		: null;
	const liked = !!memberId && !!article?.meLiked?.some((like) => (
		like.memberId === memberId && like.likeRefId === articleId && like.myFavorite
	));
	const backHref = article
		? { pathname: '/community', query: { articleCategory: article.articleCategory } }
		: '/community';
	const date = article && !Number.isNaN(Date.parse(article.createdAt))
		? new Date(article.createdAt).toLocaleDateString(router.locale === 'kr' ? 'ko' : router.locale || 'en', {
			month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
		})
		: '';

	/** HANDLERS **/
	const refreshHandler = async () => {
		if (!currentAccount() || likeLock.current) return;
		try {
			await articleQuery.refetch();
			if (currentAccount()) {
				setUncertain(false);
				setActionError('');
			}
		} catch {
			if (currentAccount()) setActionError('Unable to refresh this post. Please try again.');
		}
	};

	const likeHandler = async () => {
		if (!currentAccount() || !article) return;
		if (!memberId || !token) {
			try {
				await router.push({ pathname: '/account/join', query: { view: 'login', referrer: router.asPath } });
			} catch {
				if (currentAccount()) setActionError('Unable to open login. Please try again.');
			}
			return;
		}
		if (likeLock.current || uncertain) return;
		likeLock.current = true;
		setPending(true);
		setActionError('');
		try {
			const response = await likeTargetBoardArticle({ variables: { input: articleId } });
			if (!currentAccount()) return;
			if (response.data?.likeTargetBoardArticle?._id !== articleId) throw new Error('Post unavailable');
			try {
				await articleQuery.refetch();
			} catch {
				if (currentAccount()) {
					setUncertain(true);
					setActionError('Like updated, but the post could not refresh. Refresh before trying again.');
				}
			}
		} catch {
			if (currentAccount()) {
				setUncertain(true);
				setActionError('Unable to confirm the like. Refresh before trying again.');
			}
		} finally {
			likeLock.current = false;
			if (currentAccount()) setPending(false);
		}
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	return (
		<div className={styles.page}>
			<Head>
				<title>{article ? `${article.articleTitle} | HomeHero Community` : 'Community Post | HomeHero'}</title>
			</Head>
			<nav className={`${styles.container} ${styles.breadcrumbs}`} aria-label="Breadcrumb">
				<Link href="/">Home</Link>
				<FiChevronRight size={14} aria-hidden="true" />
				<Link href={backHref}>Community</Link>
				{article && (
					<>
						<FiChevronRight size={14} aria-hidden="true" />
						<span>{communityCategories[article.articleCategory]}</span>
					</>
				)}
			</nav>
			<div className={`${styles.container} ${styles.detailLayout}`}>
				{articleQuery.loading && !article ? (
					<div className={styles.state} role="status">Loading post…</div>
				) : articleQuery.error || !article ? (
					<div className={styles.state} role={missing || !articleQuery.error ? 'status' : 'alert'}>
						<h1>{missing || !articleQuery.error ? 'Post not found' : 'Unable to load this post'}</h1>
						<p>{missing || !articleQuery.error ? 'This post is unavailable.' : 'Please try again.'}</p>
						{articleQuery.error && !missing && (
							<Button onClick={() => void refreshHandler()}>Retry</Button>
						)}
						<Link className={styles.backLink} href={backHref}>Back to Community</Link>
					</div>
				) : (
					<>
						<article className={styles.article}>
							<Link href={backHref} className={styles.backLink}>
								<FiArrowLeft size={16} aria-hidden="true" /> Back to Community
							</Link>
							<span className={styles.category}>{communityCategories[article.articleCategory]}</span>
							<h1>{article.articleTitle}</h1>
							<div className={styles.detailMeta}>
								<ServiceImage path={author?.memberImage} alt={authorName} avatar className={styles.avatar} />
								<div className={styles.detailAuthor}>
									{authorHref ? <Link href={authorHref}><strong>{authorName}</strong></Link> : <strong>{authorName}</strong>}
									{date && <time dateTime={article.createdAt}><FiCalendar size={13} aria-hidden="true" /> {date}</time>}
								</div>
								<span><FiEye size={14} aria-hidden="true" /> {article.articleViews} views</span>
								<span><FiHeart size={14} aria-hidden="true" /> {article.articleLikes} likes</span>
							</div>
							{imageUrl(article.articleImage || undefined) && (
								<div className={styles.detailImage}>
									<ServiceImage path={article.articleImage || undefined} alt="" />
								</div>
							)}
							<div className={styles.articleContent}>
								<ArticleViewer key={article.articleContent} initialValue={article.articleContent} />
							</div>
							<div className={styles.likeRow}>
								<Button
									variant={liked ? 'primary' : 'secondary'}
									onClick={() => void likeHandler()}
									disabled={pending || uncertain || articleQuery.loading}
									aria-pressed={liked}
								>
									<FiHeart size={17} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
									{pending ? 'Updating…' : liked ? 'Liked' : 'Like'} {article.articleLikes}
								</Button>
								{(!memberId || !token) && <small>Log in to like or comment on this post.</small>}
							</div>
							{actionError && (
								<div className={styles.detailError} role="alert">
									<p>{actionError}</p>
									<Button variant="secondary" disabled={pending} onClick={() => void refreshHandler()}>Refresh post</Button>
								</div>
							)}
						</article>
						<CommunityComments articleId={articleId} memberId={memberId} token={token} />
					</>
				)}
			</div>
		</div>
	);
};

const CommunityDetail = () => {
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const [clientReady, setClientReady] = useState(false);
	const articleId = scalar(router.query.id).toLowerCase();
	const validId = /^[a-f\d]{24}$/.test(articleId);
	const token = getJwtToken() || '';

	useEffect(() => {
		setClientReady(true);
	}, []);

	if (!clientReady || !router.isReady || !validId) {
		return (
			<div className={styles.page}>
				<Head><title>Community Post | HomeHero</title></Head>
				<div className={`${styles.container} ${styles.content}`}>
					<div className={styles.state} role="status">
						{!clientReady || !router.isReady ? 'Loading post…' : 'Invalid post ID'}
						{clientReady && router.isReady && <Link className={styles.backLink} href="/community">Back to Community</Link>}
					</div>
				</div>
			</div>
		);
	}

	return (
		<ArticlePanel
			key={`${articleId}:${user._id}:${token}:${user.memberType}:${user.memberStatus}`}
			articleId={articleId}
			memberId={user._id}
			token={token}
		/>
	);
};

export default withLayoutHomeHero(CommunityDetail);
