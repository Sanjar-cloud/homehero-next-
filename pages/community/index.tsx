import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { ParsedUrlQuery } from 'querystring';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FiMessageSquare, FiPlus, FiSearch } from 'react-icons/fi';
import { GET_COMMUNITY_ARTICLES } from '../../apollo/user/community.query';
import type { CommunityInquiry } from '../../apollo/user/community.query';
import { LIKE_TARGET_BOARD_ARTICLE } from '../../apollo/user/mutation';
import { userVar } from '../../apollo/store';
import { getJwtToken } from '../../libs/auth';
import { BoardArticleCategory } from '../../libs/enums/board-article.enum';
import { Direction } from '../../libs/enums/common.enum';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import CommunityPostCard, { communityCategories } from '../../libs/components/community/CommunityPostCard';
import { Button, Input } from '../../libs/components/homehero/UI';
import { scalar, ServicePagination, validPage } from '../../libs/components/service/ServiceFilter';
import styles from '../../scss/homehero/community.module.scss';

export const getStaticProps = async ({ locale }: { locale: string }) => ({
	props: { ...(await serverSideTranslations(locale, ['common'])) },
});

const communitySorts = {
	newest: { title: 'Newest', field: 'createdAt' },
	mostLiked: { title: 'Most liked', field: 'articleLikes' },
	mostViewed: { title: 'Most viewed', field: 'articleViews' },
} as const;

interface CommunityState {
	category: BoardArticleCategory | 'ALL';
	q: string;
	sort: keyof typeof communitySorts;
	page: number;
}

export function parseCommunityQuery(query: ParsedUrlQuery): CommunityState {
	const category = scalar(query.articleCategory);
	const sort = scalar(query.sort);
	return {
		category: category === 'ALL' || Object.values(BoardArticleCategory).includes(category as BoardArticleCategory)
			? category as CommunityState['category']
			: 'ALL',
		q: scalar(query.q).trim(),
		sort: Object.prototype.hasOwnProperty.call(communitySorts, sort) ? sort as CommunityState['sort'] : 'newest',
		page: validPage(query.page),
	};
}

export function communityInput(state: CommunityState): CommunityInquiry {
	return {
		page: state.page,
		limit: 6,
		sort: communitySorts[state.sort].field,
		direction: Direction.DESC,
		search: {
			...(state.category === 'ALL' ? {} : { articleCategory: state.category }),
			...(state.q ? { text: state.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } : {}),
		},
	};
}

interface CommunityListProps {
	memberId: string;
	token: string;
}

const CommunityList = ({ memberId, token }: CommunityListProps) => {
	const router = useRouter();
	const state = parseCommunityQuery(router.query);
	const [search, setSearch] = useState(state.q);
	const [pendingId, setPendingId] = useState('');
	const [actionError, setActionError] = useState('');
	const [navigationError, setNavigationError] = useState('');
	const [likeUncertain, setLikeUncertain] = useState(false);
	const mounted = useRef(false);
	const mutationLock = useRef(false);
	const latestState = useRef({ route: router.asPath, state });
	if (latestState.current.route !== router.asPath) {
		latestState.current = { route: router.asPath, state };
	}
	const currentAccount = () => mounted.current && userVar()._id === memberId && (getJwtToken() || '') === token;

	/** APOLLO REQUESTS **/
	const articlesQuery = useQuery(GET_COMMUNITY_ARTICLES, {
		variables: { input: communityInput(state) },
		skip: !router.isReady,
		fetchPolicy: 'no-cache',
		context: { queryDeduplication: false },
		notifyOnNetworkStatusChange: true,
	});
	const [likeTargetBoardArticle] = useMutation(LIKE_TARGET_BOARD_ARTICLE, { fetchPolicy: 'no-cache' });
	const articles = articlesQuery.data?.getBoardArticles.list.filter((article) => article.articleStatus === 'ACTIVE') ?? [];
	const counter = articlesQuery.data?.getBoardArticles.metaCounter;
	const total = counter?.[0]?.total ?? (counter?.length === 0 ? 0 : undefined);
	const totalPages = total == null ? 0 : Math.ceil(total / 6);
	const resultsLabel = articlesQuery.loading
		? 'Loading posts…'
		: articlesQuery.error
			? 'Results unavailable'
			: total == null ? 'Community posts' : `${total} ${total === 1 ? 'post' : 'posts'} found`;

	/** HANDLERS **/
	const changeStateHandler = async (changes: Partial<CommunityState>, replace = false) => {
		const next = { ...latestState.current.state, ...changes };
		latestState.current.state = next;
		const query: ParsedUrlQuery = { ...router.query, articleCategory: next.category };
		delete query.q;
		delete query.sort;
		delete query.page;
		if (next.q) query.q = next.q;
		if (next.sort !== 'newest') query.sort = next.sort;
		if (next.page !== 1) query.page = String(next.page);

		try {
			await router[replace ? 'replace' : 'push'](
				{ pathname: '/community', query },
				undefined,
				{ shallow: true, scroll: false },
			);
			if (mounted.current) setNavigationError('');
		} catch {
			if (mounted.current) {
				latestState.current.state = parseCommunityQuery(router.query);
				setNavigationError('Unable to update the page. Please try again.');
			}
		}
	};

	const loginHandler = async (referrer: string) => {
		try {
			await router.push({ pathname: '/account/join', query: { view: 'login', referrer } });
		} catch {
			if (mounted.current) setNavigationError('Unable to open login. Please try again.');
		}
	};

	const writeHandler = async () => {
		if (!currentAccount()) return;
		const destination = '/mypage?category=writeArticle';
		if (!memberId || !token) {
			await loginHandler(destination);
			return;
		}
		try {
			await router.push(destination);
		} catch {
			if (mounted.current) setNavigationError('Unable to open the editor. Please try again.');
		}
	};

	const refreshHandler = async () => {
		if (!currentAccount()) return;
		try {
			await articlesQuery.refetch();
			if (currentAccount()) {
				setActionError('');
				setLikeUncertain(false);
			}
		} catch {
			if (currentAccount()) setActionError('Unable to refresh posts. Please try again.');
		}
	};

	const likeHandler = async (articleId: string) => {
		if (!currentAccount()) return;
		if (!memberId || !token) {
			await loginHandler(router.asPath);
			return;
		}
		if (mutationLock.current || likeUncertain || !articles.some((article) => article._id === articleId)) return;
		mutationLock.current = true;
		setPendingId(articleId);
		setActionError('');
		try {
			const response = await likeTargetBoardArticle({ variables: { input: articleId } });
			if (!currentAccount()) return;
			if (response.data?.likeTargetBoardArticle?._id !== articleId) throw new Error('Post unavailable');
			try {
				await articlesQuery.refetch();
			} catch {
				if (currentAccount()) {
					setLikeUncertain(true);
					setActionError('Like updated, but posts could not refresh. Refresh posts before trying again.');
				}
			}
		} catch {
			if (currentAccount()) {
				setLikeUncertain(true);
				setActionError('Unable to confirm the update. Refresh posts before trying again.');
			}
		} finally {
			mutationLock.current = false;
			if (currentAccount()) setPendingId('');
		}
	};

	const searchHandler = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void changeStateHandler({ q: search.trim(), page: 1 });
	};

	const clearSearchHandler = () => {
		setSearch('');
		void changeStateHandler({ q: '', page: 1 });
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	useEffect(() => {
		setSearch(state.q);
	}, [state.q]);

	useEffect(() => {
		if (total != null && !articlesQuery.loading && !articlesQuery.error && state.page > Math.max(1, totalPages)) {
			void changeStateHandler({ page: Math.max(1, totalPages) }, true);
		}
	}, [total, totalPages, state.page, articlesQuery.loading, articlesQuery.error]);

	return (
		<div className={styles.page}>
			<section className={styles.hero}>
				<div className={styles.container}>
					<span className={styles.eyebrow}>HomeHero Community</span>
					<h1>Community</h1>
					<p>Ask questions, share experiences, and discover helpful home service tips.</p>
				</div>
			</section>
			<div className={`${styles.container} ${styles.content}`}>
				<div className={styles.toolbar}>
					<div className={styles.tabs} role="group" aria-label="Community categories">
						{(['ALL', ...Object.values(BoardArticleCategory)] as CommunityState['category'][]).map((category) => (
							<button
								type="button"
								key={category}
								className={state.category === category ? styles.selected : ''}
								aria-pressed={state.category === category}
								onClick={() => void changeStateHandler({ category, page: 1 })}
							>
								{category === 'ALL' ? 'All' : communityCategories[category]}
							</button>
						))}
					</div>
					<Button className={styles.writeButton} onClick={() => void writeHandler()}>
						<FiPlus size={17} aria-hidden="true" /> Write Post
					</Button>
				</div>
				<div className={styles.searchRow}>
					<form className={styles.search} onSubmit={searchHandler}>
						<FiSearch size={17} aria-hidden="true" />
						<Input
							aria-label="Search community titles"
							placeholder="Search posts by title"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
						<Button type="submit">Search</Button>
					</form>
					<label className={styles.sort}>Sort by:
						<select
							aria-label="Sort community posts"
							value={state.sort}
							onChange={(event) => void changeStateHandler({ sort: event.target.value as CommunityState['sort'], page: 1 })}
						>
							{Object.entries(communitySorts).map(([key, sort]) => (
								<option key={key} value={key}>{sort.title}</option>
							))}
						</select>
					</label>
				</div>
				<p className={styles.results} role="status">
					{resultsLabel}
				</p>
				{navigationError && (
					<div className={styles.error} role="alert"><p>{navigationError}</p></div>
				)}
				{actionError && (
					<div className={styles.error} role="alert">
						<p>{actionError}</p>
						<Button variant="secondary" disabled={!!pendingId || articlesQuery.loading} onClick={() => void refreshHandler()}>
							Refresh posts
						</Button>
					</div>
				)}
				{articlesQuery.error ? (
					<div className={styles.state} role="alert">
						<h2>Unable to load posts</h2>
						<p>Please try again in a moment.</p>
						<Button variant="secondary" onClick={() => void refreshHandler()}>Retry posts</Button>
					</div>
				) : articlesQuery.loading || !router.isReady ? (
					<div className={styles.state} role="status">Loading community posts…</div>
				) : !articles.length ? (
					<div className={styles.state}>
						<FiMessageSquare size={28} aria-hidden="true" />
						<h2>No posts found</h2>
						<p>{state.q ? 'Try searching for another title or choose a different category.' : 'There are no posts to display in this category yet.'}</p>
						{state.q && <Button variant="secondary" onClick={clearSearchHandler}>Clear search</Button>}
					</div>
				) : (
					<>
						<div className={styles.postList}>
							{articles.map((article) => (
								<CommunityPostCard
									key={article._id}
									article={article}
									viewerId={memberId}
									pending={!!pendingId || likeUncertain}
									onLike={likeHandler}
								/>
							))}
						</div>
						<ServicePagination page={state.page} totalPages={totalPages} onChange={(page) => void changeStateHandler({ page })} />
					</>
				)}
			</div>
		</div>
	);
};

const CommunityPage = () => {
	const user = useReactiveVar(userVar);
	const [clientReady, setClientReady] = useState(false);
	useEffect(() => {
		setClientReady(true);
	}, []);
	const token = getJwtToken() || '';

	return (
		<>
			<Head>
				<title>Community | HomeHero</title>
			</Head>
			{clientReady ? (
				<CommunityList
					key={`${user._id}:${token}:${user.memberType}:${user.memberStatus}`}
					memberId={user._id}
					token={token}
				/>
			) : (
				<div className={styles.page}>
					<div className={`${styles.container} ${styles.content}`}>
						<div className={styles.state} role="status">Loading community…</div>
					</div>
				</div>
			)}
		</>
	);
};

export default withLayoutHomeHero(CommunityPage);
