import React, { useEffect, useRef, useState } from 'react';
import { useApolloClient, useReactiveVar } from '@apollo/client';
import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import CommunityArticleList from '../../../libs/components/admin/community/CommunityArticleList';
import type { AdminArticle } from '../../../libs/components/admin/community/CommunityArticleList';
import { communityCategories } from '../../../libs/components/community/CommunityPostCard';
import { GET_ALL_BOARD_ARTICLES_BY_ADMIN } from '../../../apollo/admin/query';
import { REMOVE_BOARD_ARTICLE_BY_ADMIN, UPDATE_BOARD_ARTICLE_BY_ADMIN } from '../../../apollo/admin/mutation';
import { userVar } from '../../../apollo/store';
import { getJwtToken } from '../../../libs/auth';
import { MemberStatus, MemberType } from '../../../libs/enums/member.enum';
import { BoardArticleCategory, BoardArticleStatus } from '../../../libs/enums/board-article.enum';
import { Direction } from '../../../libs/enums/common.enum';
import type { AllBoardArticlesInquiry } from '../../../libs/types/board-article/board-article.input';
import { sweetConfirmAlert } from '../../../libs/sweetAlert';
import styles from '../../../scss/homehero/admin.module.scss';

const AdminCommunity = () => {
	const user = useReactiveVar(userVar);
	const token = getJwtToken();
	const allowed = user._id && token && user.memberType === MemberType.ADMIN
		&& user.memberStatus === MemberStatus.ACTIVE;

	if (!allowed) {
		return <Alert severity="info">An active administrator session is required.</Alert>;
	}

	return <CommunityPanel key={`${user._id}:${token}`} />;
};

const CommunityPanel = () => {
	const client = useApolloClient();
	const sessionUser = userVar()._id;
	const sessionToken = getJwtToken();
	const mounted = useRef(true);
	const requestId = useRef(0);
	const mutationLock = useRef(false);
	const [input, setInput] = useState<AllBoardArticlesInquiry>({
		page: 1,
		limit: 10,
		sort: 'createdAt',
		direction: Direction.DESC,
		search: {},
	});
	const [articles, setArticles] = useState<AdminArticle[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [revision, setRevision] = useState(0);
	const [error, setError] = useState('');
	const [feedback, setFeedback] = useState('');

	const isCurrentSession = () => {
		const current = userVar();
		return mounted.current && current._id === sessionUser && getJwtToken() === sessionToken
			&& current.memberType === MemberType.ADMIN && current.memberStatus === MemberStatus.ACTIVE;
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			requestId.current += 1;
		};
	}, []);

	useEffect(() => {
		const currentRequest = ++requestId.current;
		setLoading(true);
		setArticles([]);
		setTotal(0);
		setError('');
		client.query<{ getAllBoardArticlesByAdmin: { list: AdminArticle[]; metaCounter: { total: number | null }[] | null } }>({
			query: GET_ALL_BOARD_ARTICLES_BY_ADMIN,
			variables: { input },
			fetchPolicy: 'no-cache',
			context: { queryDeduplication: false },
		}).then(({ data }) => {
			if (!isCurrentSession() || currentRequest !== requestId.current) return;
			const result = data.getAllBoardArticlesByAdmin;
			const count = result.metaCounter?.[0]?.total ?? 0;
			if (input.page > 1 && (input.page - 1) * input.limit >= count) {
				setInput((previous) => ({
					...previous,
					page: Math.max(1, Math.ceil(count / previous.limit)),
				}));
				return;
			}
			setArticles(result.list);
			setTotal(count);
		}).catch(() => {
			if (isCurrentSession() && currentRequest === requestId.current) {
				setError('Posts could not be loaded. Check the API connection and try Refresh.');
			}
		}).finally(() => {
			if (isCurrentSession() && currentRequest === requestId.current) setLoading(false);
		});
	}, [client, input, revision]);

	/** HANDLERS **/
	const refreshHandler = () => {
		if (mutationLock.current) return;
		setFeedback('');
		setRevision((value) => value + 1);
	};

	const filterHandler = (field: 'articleCategory' | 'articleStatus', value: string) => {
		if (mutationLock.current) return;
		setFeedback('');
		setInput((previous) => ({
			...previous,
			page: 1,
			search: { ...previous.search, [field]: value || undefined },
		}));
	};

	const paginationHandler = (page: number, limit: number) => {
		if (mutationLock.current) return;
		setInput((previous) => ({ ...previous, page, limit }));
	};

	const deleteArticleHandler = async (article: AdminArticle, permanent: boolean) => {
		const expectedStatus = permanent ? BoardArticleStatus.DELETE : BoardArticleStatus.ACTIVE;
		if (mutationLock.current || loading || !isCurrentSession() || !articles.includes(article)
			|| article.articleStatus !== expectedStatus || !/^[a-f\d]{24}$/i.test(article._id)) return;

		mutationLock.current = true;
		setSaving(true);
		setError('');
		setFeedback('');
		try {
			const message = permanent
				? `Permanently remove “${article.articleTitle}”? This cannot be undone. Related comments and likes are not removed by this action.`
				: `Delete “${article.articleTitle}”? It will no longer be publicly listed. Restoring this post is not supported.`;
			const confirmed = await sweetConfirmAlert(message);
			if (!confirmed || !isCurrentSession()) return;
			const { data } = await client.mutate<{
				updateBoardArticleByAdmin?: Pick<AdminArticle, '_id' | 'articleStatus'>;
				removeBoardArticleByAdmin?: Pick<AdminArticle, '_id' | 'articleStatus'>;
			}>({
				mutation: permanent ? REMOVE_BOARD_ARTICLE_BY_ADMIN : UPDATE_BOARD_ARTICLE_BY_ADMIN,
				variables: {
					input: permanent ? article._id : { _id: article._id, articleStatus: BoardArticleStatus.DELETE },
				},
				fetchPolicy: 'no-cache',
			});
			if (!isCurrentSession()) return;
			const result = permanent ? data?.removeBoardArticleByAdmin : data?.updateBoardArticleByAdmin;
			if (result?._id !== article._id || result.articleStatus !== BoardArticleStatus.DELETE) {
				throw new Error('Unconfirmed post deletion');
			}
			setFeedback(permanent ? 'Post permanently removed.' : 'Post marked as deleted.');
			setRevision((value) => value + 1);
		} catch {
			if (isCurrentSession()) {
				setError('Post deletion was not confirmed. Refresh to check the current state before retrying.');
			}
		} finally {
			mutationLock.current = false;
			if (isCurrentSession()) setSaving(false);
		}
	};

	return (
		<div className="content">
			<Box className={`table-wrap ${styles.community}`}>
				<div className={styles.communityHeading}>
					<Typography component="h2" variant="h5">Community Management</Typography>
					<Button variant="outlined" disabled={loading || saving} onClick={refreshHandler}>
						Refresh
					</Button>
				</div>
				<div className={styles.communityFilters}>
					<TextField
						select
						label="Category"
						value={input.search.articleCategory || ''}
						disabled={saving}
						SelectProps={{ displayEmpty: true }}
						InputLabelProps={{ shrink: true }}
						onChange={(event) => filterHandler('articleCategory', event.target.value)}
					>
						<MenuItem value="">All categories</MenuItem>
						{Object.values(BoardArticleCategory).map((category) => (
							<MenuItem key={category} value={category}>{communityCategories[category]}</MenuItem>
						))}
					</TextField>
					<TextField
						select
						label="Status"
						value={input.search.articleStatus || ''}
						disabled={saving}
						SelectProps={{ displayEmpty: true }}
						InputLabelProps={{ shrink: true }}
						onChange={(event) => filterHandler('articleStatus', event.target.value)}
					>
						<MenuItem value="">All statuses</MenuItem>
						<MenuItem value={BoardArticleStatus.ACTIVE}>Active</MenuItem>
						<MenuItem value={BoardArticleStatus.DELETE}>Deleted</MenuItem>
					</TextField>
				</div>
				<p className={styles.communityHint}>Deleted posts cannot be restored. Permanent removal is available only after deletion.</p>
				{error && <Alert severity="error">{error}</Alert>}
				{feedback && <Alert severity="success">{feedback}</Alert>}
				<CommunityArticleList
					articles={articles}
					total={total}
					page={input.page}
					limit={input.limit}
					loading={loading}
					saving={saving}
					error={Boolean(error)}
					onDelete={deleteArticleHandler}
					onPagination={paginationHandler}
				/>
			</Box>
		</div>
	);
};

export default withAdminLayout(AdminCommunity);
