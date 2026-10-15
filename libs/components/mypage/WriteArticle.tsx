import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useQuery, useReactiveVar } from '@apollo/client';
import { FiChevronRight, FiMessageSquare } from 'react-icons/fi';
import { GET_COMMUNITY_ARTICLE } from '../../../apollo/user/community.query';
import { userVar } from '../../../apollo/store';
import { getJwtToken } from '../../auth';
import { Message } from '../../enums/common.enum';
import { scalar } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/community.module.scss';

const TuiEditor = dynamic(() => import('../community/Teditor'), {
	ssr: false,
	loading: () => <p className={styles.commentState} role="status">Loading editor…</p>,
});

interface WriteArticlePanelProps {
	articleId: string;
	memberId: string;
	token: string;
}

const WriteArticlePanel = ({ articleId, memberId, token }: WriteArticlePanelProps) => {
	const articleQuery = useQuery(GET_COMMUNITY_ARTICLE, {
		variables: { input: articleId },
		skip: !articleId,
		fetchPolicy: 'no-cache',
		context: { queryDeduplication: false },
	});
	const article = articleQuery.data?.getBoardArticle;
	const unavailable = articleQuery.error?.graphQLErrors.some((error) => error.message === Message.NO_DATA_FOUND);
	const [refreshError, setRefreshError] = useState('');

	const refreshHandler = async () => {
		try {
			await articleQuery.refetch();
			setRefreshError('');
		} catch {
			setRefreshError('Unable to reload this post. Please try again.');
		}
	};

	if (articleId && (articleQuery.loading || articleQuery.error || !article)) {
		return (
			<div className={styles.state} role={articleQuery.error && !unavailable ? 'alert' : 'status'}>
				<p>{articleQuery.loading ? 'Loading your post…' : unavailable || !articleQuery.error ? 'Post not found.' : 'Unable to load this post.'}</p>
				{articleQuery.error && !unavailable && <button type="button" onClick={() => void refreshHandler()}>Retry</button>}
				{refreshError && <p>{refreshError}</p>}
				<Link className={styles.backLink} href="/mypage?category=myArticles">Back to My Posts</Link>
			</div>
		);
	}
	if (articleId && (article?._id !== articleId || article?.memberId !== memberId || article?.articleStatus !== 'ACTIVE')) {
		return (
			<div className={styles.state} role="alert">
				<p>This post is unavailable for editing. You can only edit your own active posts.</p>
				<Link className={styles.backLink} href="/mypage?category=myArticles">Back to My Posts</Link>
			</div>
		);
	}

	return (
		<TuiEditor
			article={articleId ? article : undefined}
			memberId={memberId}
			token={token}
		/>
	);
};

const WriteArticle = () => {
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const [clientReady, setClientReady] = useState(false);
	const token = getJwtToken() || '';
	const editing = router.query.id !== undefined;
	const articleId = scalar(router.query.id).toLowerCase();
	const validId = !editing || /^[a-f\d]{24}$/.test(articleId);
	const ready = clientReady && router.isReady;
	const authenticated = !!user._id && !!token;
	const title = editing ? 'Edit post' : 'Write a post';
	const loginHref = { pathname: '/account/join', query: { view: 'login', referrer: router.asPath } };

	useEffect(() => {
		setClientReady(true);
	}, []);

	return (
		<div className={`${styles.page} ${styles.createPage}`}>
			<Head><title>{title} | HomeHero Community</title></Head>
			<nav className={`${styles.container} ${styles.breadcrumbs}`} aria-label="Breadcrumb">
				<Link href="/">Home</Link>
				<FiChevronRight size={14} aria-hidden="true" />
				<Link href="/community">Community</Link>
				<FiChevronRight size={14} aria-hidden="true" />
				<span>{editing ? 'Edit Post' : 'Write Post'}</span>
			</nav>
			{!ready ? (
				<div className={`${styles.container} ${styles.state}`} role="status">Loading editor…</div>
			) : !authenticated ? (
				<div className={`${styles.container} ${styles.loginRequired}`}>
					<FiMessageSquare size={34} aria-hidden="true" />
					<h1>Log in to {editing ? 'edit' : 'write'} a post</h1>
					<p>Join the HomeHero community to ask questions and share helpful experiences.</p>
					<Link className={styles.primaryLink} href={loginHref}>Log in</Link>
					<Link className={styles.backLink} href="/community">Back to Community</Link>
				</div>
			) : !validId ? (
				<div className={`${styles.container} ${styles.state}`} role="alert">
					<p>Invalid post ID.</p>
					<Link className={styles.backLink} href="/mypage?category=myArticles">Back to My Posts</Link>
				</div>
			) : (
				<section className={`${styles.container} ${styles.createCard}`}>
					<div className={styles.formHeading}>
						<span className={styles.eyebrow}>Community</span>
						<h1>{title}</h1>
						<p>{editing ? 'Update your post while keeping the conversation going.' : 'Ask a question or share something helpful with your neighbors.'}</p>
						<Link href="/mypage?category=myArticles" className={styles.textLink}>My Posts</Link>
					</div>
					<WriteArticlePanel
						key={`${articleId}:${user._id}:${token}:${user.memberType}:${user.memberStatus}`}
						articleId={articleId}
						memberId={user._id}
						token={token}
					/>
				</section>
			)}
		</div>
	);
};

export default WriteArticle;
