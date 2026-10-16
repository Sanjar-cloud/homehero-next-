import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';
import type { ParsedUrlQuery } from 'querystring';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { FiChevronRight, FiPlus } from 'react-icons/fi';
import { GET_COMMUNITY_ARTICLES } from '../../../apollo/user/community.query';
import type { CommunityArticle, CommunityInquiry } from '../../../apollo/user/community.query';
import { LIKE_TARGET_BOARD_ARTICLE, UPDATE_BOARD_ARTICLE } from '../../../apollo/user/mutation';
import { userVar } from '../../../apollo/store';
import { getJwtToken } from '../../auth';
import { Direction } from '../../enums/common.enum';
import { BoardArticleStatus } from '../../enums/board-article.enum';
import CommunityPostCard from '../community/CommunityPostCard';
import { Button } from '../homehero/UI';
import { ServicePagination, validPage } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/community.module.scss';

interface MyArticlesPanelProps {
	memberId: string;
	token: string;
}

const MyArticlesPanel = ({ memberId, token }: MyArticlesPanelProps) => {
	const { t: translate } = useTranslation('common');
	const router = useRouter();
	const page = validPage(router.query.page);
	const [pendingId, setPendingId] = useState('');
	const [uncertain, setUncertain] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const mounted = useRef(false);
	const lock = useRef(false);
	const currentAccount = () => mounted.current && userVar()._id === memberId && (getJwtToken() || '') === token;
	const input: CommunityInquiry = {
		page,
		limit: 6,
		sort: 'createdAt',
		direction: Direction.DESC,
		search: { memberId },
	};

	/** APOLLO REQUESTS **/
	const articlesQuery = useQuery(GET_COMMUNITY_ARTICLES, {
		variables: { input },
		fetchPolicy: 'no-cache',
		context: { queryDeduplication: false },
		notifyOnNetworkStatusChange: true,
	});
	const [likeTargetBoardArticle] = useMutation(LIKE_TARGET_BOARD_ARTICLE, { fetchPolicy: 'no-cache' });
	const [updateBoardArticle] = useMutation(UPDATE_BOARD_ARTICLE, { fetchPolicy: 'no-cache' });
	const articles = articlesQuery.data?.getBoardArticles.list ?? [];
	const invalidResponse = articles.some((article) => article.memberId !== memberId || article.articleStatus !== 'ACTIVE');
	const counter = articlesQuery.data?.getBoardArticles.metaCounter;
	const total = counter?.[0]?.total ?? (counter?.length === 0 ? 0 : undefined);
	const totalPages = total == null ? 0 : Math.ceil(total / 6);
	const disabled = !!pendingId || uncertain || articlesQuery.loading || !!articlesQuery.error || invalidResponse;

	/** HANDLERS **/
	const pageHandler = async (nextPage: number, replace = false) => {
		const query: ParsedUrlQuery = { ...router.query, category: 'myArticles' };
		delete query.page;
		if (nextPage !== 1) query.page = String(nextPage);
		await router[replace ? 'replace' : 'push'](
			{ pathname: '/mypage', query },
			undefined,
			{ shallow: true, scroll: false },
		);
	};

	const navigatePageHandler = async (nextPage: number) => {
		if (lock.current) return;
		try {
			await pageHandler(nextPage);
		} catch {
			if (currentAccount()) setError('Unable to change the page. Please try again.');
		}
	};

	const refreshHandler = async () => {
		if (!currentAccount() || lock.current) return;
		try {
			const response = await articlesQuery.refetch();
			if (!currentAccount()) return;
			if (response.data.getBoardArticles.list.some((article) => article.memberId !== memberId || article.articleStatus !== 'ACTIVE')) {
				throw new Error('Post ownership unavailable');
			}
			setUncertain(false);
			setError('');
		} catch {
			if (currentAccount()) setError('Unable to refresh your posts. Please try again.');
		}
	};

	const likeHandler = async (articleId: string) => {
		if (!currentAccount() || lock.current || disabled || !articles.some((article) => article._id === articleId)) return;
		lock.current = true;
		setPendingId(articleId);
		setError('');
		setNotice('');
		try {
			const response = await likeTargetBoardArticle({ variables: { input: articleId } });
			if (!currentAccount()) return;
			if (response.data?.likeTargetBoardArticle?._id !== articleId) throw new Error('Like not confirmed');
			try {
				await articlesQuery.refetch();
			} catch {
				if (currentAccount()) {
					setUncertain(true);
					setError('Like updated, but posts could not refresh. Refresh before another change.');
				}
			}
		} catch {
			if (currentAccount()) {
				setUncertain(true);
				setError('Unable to confirm the like. Refresh posts before trying again.');
			}
		} finally {
			lock.current = false;
			if (currentAccount()) setPendingId('');
		}
	};

	const deleteHandler = async (article: CommunityArticle) => {
		if (!currentAccount() || lock.current || disabled || article.memberId !== memberId || article.articleStatus !== 'ACTIVE') return;
		if (!window.confirm(translate('Delete post confirmation', { title: article.articleTitle }))) return;
		lock.current = true;
		setPendingId(article._id);
		setError('');
		setNotice('');
		try {
			const response = await updateBoardArticle({
				variables: { input: { _id: article._id, articleStatus: BoardArticleStatus.DELETE } },
			});
			if (!currentAccount()) return;
			const saved = response.data?.updateBoardArticle;
			if (saved?._id !== article._id || saved.memberId !== memberId || saved.articleStatus !== BoardArticleStatus.DELETE) {
				throw new Error('Delete not confirmed');
			}
			setNotice('Post deleted.');
			try {
				await articlesQuery.refetch();
			} catch {
				if (currentAccount()) {
					setUncertain(true);
					setError('Post deleted, but the list could not refresh. Refresh before another change.');
				}
			}
		} catch {
			if (currentAccount()) {
				setUncertain(true);
				setError('Unable to confirm deletion. Refresh and check the list before trying again.');
			}
		} finally {
			lock.current = false;
			if (currentAccount()) setPendingId('');
		}
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	useEffect(() => {
		if (total != null && !articlesQuery.loading && !articlesQuery.error && !invalidResponse && page > Math.max(1, totalPages)) {
			void pageHandler(Math.max(1, totalPages), true).catch(() => {
				if (currentAccount()) setError('Unable to update the page. Please try again.');
			});
		}
	}, [total, totalPages, page, articlesQuery.loading, articlesQuery.error, invalidResponse]);

	return (
		<>
			{notice && <p className={styles.notice} role="status">{translate(notice, { defaultValue: notice })}</p>}
			{error && (
				<div className={styles.error} role="alert">
					<p>{translate(error, { defaultValue: error })}</p>
					<Button variant="secondary" disabled={!!pendingId || articlesQuery.loading} onClick={() => void refreshHandler()}>{translate('Refresh posts')}</Button>
				</div>
			)}
			{articlesQuery.loading ? (
				<div className={styles.state} role="status">{translate('Loading your posts…')}</div>
			) : articlesQuery.error || invalidResponse ? (
				<div className={styles.state} role="alert">
					<h2>{translate('Unable to load your posts')}</h2>
					<p>{translate('Please refresh to verify your post list.')}</p>
					<Button onClick={() => void refreshHandler()}>{translate('Retry posts')}</Button>
				</div>
			) : !articles.length ? (
				<div className={styles.state}>
					<h2>{translate('No posts yet')}</h2>
					<p>{translate('Start a conversation with the HomeHero community.')}</p>
					<Link className={styles.primaryLink} href="/mypage?category=writeArticle">{translate('Write Post')}</Link>
				</div>
			) : (
				<>
					<p className={styles.results}>{total == null ? translate('Your active posts') : translate('postsFound', { count: total })}</p>
					<div className={styles.postList}>
						{articles.map((article) => (
							<div className={styles.ownedPost} key={article._id}>
								<CommunityPostCard
									article={article}
									viewerId={memberId}
									pending={disabled}
									onLike={likeHandler}
								/>
								<div className={styles.ownedActions}>
									<Link href={{ pathname: '/community/detail', query: { articleCategory: article.articleCategory, id: article._id } }}>{translate('View post')}</Link>
									<Link
										href={{ pathname: '/mypage', query: { category: 'writeArticle', id: article._id } }}
										aria-disabled={disabled}
										onClick={(event) => { if (disabled) event.preventDefault(); }}
									>
										{translate('Edit post')}
									</Link>
									<button type="button" disabled={disabled} onClick={() => void deleteHandler(article)}>{translate('Delete post')}</button>
								</div>
							</div>
						))}
					</div>
					<ServicePagination page={page} totalPages={totalPages} onChange={(value) => void navigatePageHandler(value)} />
				</>
			)}
		</>
	);
};

interface MyArticlesProps {
	embedded?: boolean;
}

const MyArticles = ({ embedded = false }: MyArticlesProps) => {
	const { t: translate } = useTranslation('common');
	const user = useReactiveVar(userVar);
	const router = useRouter();
	const [clientReady, setClientReady] = useState(false);
	const token = getJwtToken() || '';
	const authenticated = !!user._id && !!token;
	useEffect(() => {
		setClientReady(true);
	}, []);

	return (
		<div className={embedded ? styles.embeddedPosts : styles.page}>
			<Head><title>{translate('My Posts | HomeHero Community')}</title></Head>
			{!embedded && (
				<nav className={`${styles.container} ${styles.breadcrumbs}`} aria-label={translate('Breadcrumb')}>
					<Link href="/">{translate('Home')}</Link>
					<FiChevronRight size={14} aria-hidden="true" />
					<Link href="/community">{translate('Community')}</Link>
					<FiChevronRight size={14} aria-hidden="true" />
					<span>{translate('My Posts')}</span>
				</nav>
			)}
			<div className={embedded ? undefined : `${styles.container} ${styles.content}`}>
				<div className={styles.myPostsHeading}>
					<div>
						{embedded ? <h2>{translate('My Posts')}</h2> : <h1>{translate('My Posts')}</h1>}
						<p>{translate('Manage your HomeHero community conversations.')}</p>
					</div>
					<Link className={styles.primaryLink} href="/mypage?category=writeArticle"><FiPlus size={17} /> {translate('Write Post')}</Link>
				</div>
				{!clientReady || !router.isReady ? (
					<div className={styles.state} role="status">{translate('Loading your posts…')}</div>
				) : !authenticated ? (
					<div className={styles.state}>
						<h2>{translate('Log in to view your posts')}</h2>
						<Link className={styles.primaryLink} href={{ pathname: '/account/join', query: { view: 'login', referrer: router.asPath } }}>{translate('Log in')}</Link>
					</div>
				) : (
					<MyArticlesPanel
						key={`${user._id}:${token}:${user.memberType}:${user.memberStatus}`}
						memberId={user._id}
						token={token}
					/>
				)}
			</div>
		</div>
	);
};

export default MyArticles;
