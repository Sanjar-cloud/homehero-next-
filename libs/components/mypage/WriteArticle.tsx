import { useTranslation } from 'next-i18next';
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
	loading: () => null,
});

interface WriteArticlePanelProps {
	articleId: string;
	memberId: string;
	token: string;
}

const WriteArticlePanel = ({ articleId, memberId, token }: WriteArticlePanelProps) => {
	const { t: translate } = useTranslation('common');
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
				<p>{articleQuery.loading ? translate('Loading your post…') : unavailable || !articleQuery.error ? translate('Post not found.') : translate('Unable to load this post.')}</p>
				{articleQuery.error && !unavailable && <button type="button" onClick={() => void refreshHandler()}>{translate('Retry')}</button>}
				{refreshError && <p>{translate(refreshError, { defaultValue: refreshError })}</p>}
				<Link className={styles.backLink} href="/mypage?category=myArticles">{translate('Back to My Posts')}</Link>
			</div>
		);
	}
	if (articleId && (article?._id !== articleId || article?.memberId !== memberId || article?.articleStatus !== 'ACTIVE')) {
		return (
			<div className={styles.state} role="alert">
				<p>{translate('This post is unavailable for editing. You can only edit your own active posts.')}</p>
				<Link className={styles.backLink} href="/mypage?category=myArticles">{translate('Back to My Posts')}</Link>
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
	const { t: translate } = useTranslation('common');
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
			<Head><title>{translate(title)} {translate('| HomeHero Community')}</title></Head>
			<nav className={`${styles.container} ${styles.breadcrumbs}`} aria-label={translate('Breadcrumb')}>
				<Link href="/">{translate('Home')}</Link>
				<FiChevronRight size={14} aria-hidden="true" />
				<Link href="/community">{translate('Community')}</Link>
				<FiChevronRight size={14} aria-hidden="true" />
				<span>{editing ? translate('Edit Post') : translate('Write Post')}</span>
			</nav>
			{!ready ? (
				<div className={`${styles.container} ${styles.state}`} role="status">{translate('Loading editor…')}</div>
			) : !authenticated ? (
				<div className={`${styles.container} ${styles.loginRequired}`}>
					<FiMessageSquare size={34} aria-hidden="true" />
					<h1>{translate(editing ? 'Log in to edit a post' : 'Log in to write a post')}</h1>
					<p>{translate('Join the HomeHero community to ask questions and share helpful experiences.')}</p>
					<Link className={styles.primaryLink} href={loginHref}>{translate('Log in')}</Link>
					<Link className={styles.backLink} href="/community">{translate('Back to Community')}</Link>
				</div>
			) : !validId ? (
				<div className={`${styles.container} ${styles.state}`} role="alert">
					<p>{translate('Invalid post ID.')}</p>
					<Link className={styles.backLink} href="/mypage?category=myArticles">{translate('Back to My Posts')}</Link>
				</div>
			) : (
				<section className={`${styles.container} ${styles.createCard}`}>
					<div className={styles.formHeading}>
						<span className={styles.eyebrow}>{translate('Community')}</span>
						<h1>{translate(title)}</h1>
						<p>{editing ? translate('Update your post while keeping the conversation going.') : translate('Ask a question or share something helpful with your neighbors.')}</p>
						<Link href="/mypage?category=myArticles" className={styles.textLink}>{translate('My Posts')}</Link>
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
