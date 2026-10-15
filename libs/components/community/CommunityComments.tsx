import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client';
import { GET_COMMUNITY_COMMENTS } from '../../../apollo/user/community.query';
import type { CommunityComment } from '../../../apollo/user/community.query';
import { CREATE_COMMENT, UPDATE_COMMENT } from '../../../apollo/user/mutation';
import { userVar } from '../../../apollo/store';
import { getJwtToken } from '../../auth';
import { Direction } from '../../enums/common.enum';
import { CommentGroup, CommentStatus } from '../../enums/comment.enum';
import type { CommentInput, CommentsInquiry } from '../../types/comment/comment.input';
import type { CommentUpdate } from '../../types/comment/comment.update';
import { Button } from '../homehero/UI';
import { ServiceImage } from '../service/ServiceCard';
import { ServicePagination, validPage } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/community.module.scss';

interface CommunityCommentsProps {
	articleId: string;
	memberId: string;
	token: string;
}

type CommentResult = Omit<CommunityComment, 'memberData'>;

export function validCommentText(value: string): boolean {
	return value.trim().length >= 1 && value.trim().length <= 100;
}

const CommunityComments = ({ articleId, memberId, token }: CommunityCommentsProps) => {
	const router = useRouter();
	const page = validPage(router.query.commentPage);
	const [content, setContent] = useState('');
	const [editId, setEditId] = useState('');
	const [editContent, setEditContent] = useState('');
	const [pending, setPending] = useState(false);
	const [uncertain, setUncertain] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const mounted = useRef(false);
	const mutationLock = useRef(false);
	const currentAccount = () => mounted.current && userVar()._id === memberId && (getJwtToken() || '') === token;
	const authenticated = !!memberId && !!token;
	const input: CommentsInquiry = {
		page,
		limit: 5,
		sort: 'createdAt',
		direction: Direction.DESC,
		search: { commentRefId: articleId },
	};

	/** APOLLO REQUESTS **/
	const commentsQuery = useQuery(GET_COMMUNITY_COMMENTS, {
		variables: { input },
		fetchPolicy: 'no-cache',
		context: { queryDeduplication: false },
		notifyOnNetworkStatusChange: true,
	});
	const [createComment] = useMutation<{ createComment: CommentResult }, { input: CommentInput }>(CREATE_COMMENT, {
		fetchPolicy: 'no-cache',
	});
	const [updateComment] = useMutation<{ updateComment: CommentResult }, { input: CommentUpdate }>(UPDATE_COMMENT, {
		fetchPolicy: 'no-cache',
	});
	const comments = commentsQuery.data?.getComments.list.filter((comment) => (
		comment.commentRefId === articleId &&
		comment.commentGroup === CommentGroup.ARTICLE &&
		comment.commentStatus === CommentStatus.ACTIVE
	)) ?? [];
	const counter = commentsQuery.data?.getComments.metaCounter;
	const total = counter?.[0]?.total ?? (counter?.length === 0 ? 0 : undefined);
	const totalPages = total == null ? 0 : Math.ceil(total / 5);
	const unavailable = pending || uncertain || commentsQuery.loading || !!commentsQuery.error;

	/** HANDLERS **/
	const pageHandler = async (nextPage: number, replace = false) => {
		const query = { ...router.query };
		delete query.commentPage;
		if (nextPage !== 1) query.commentPage = String(nextPage);
		await router[replace ? 'replace' : 'push'](
			{ pathname: '/community/detail', query },
			undefined,
			{ shallow: true, scroll: false },
		);
	};

	const navigatePageHandler = async (nextPage: number) => {
		try {
			await pageHandler(nextPage);
		} catch {
			if (currentAccount()) setError('Unable to change the comments page. Please try again.');
		}
	};

	const loginHandler = async () => {
		try {
			await router.push({ pathname: '/account/join', query: { view: 'login', referrer: router.asPath } });
		} catch {
			if (currentAccount()) setError('Unable to open login. Please try again.');
		}
	};

	const refreshHandler = async () => {
		if (!currentAccount() || mutationLock.current) return;
		try {
			await commentsQuery.refetch();
			if (currentAccount()) {
				setUncertain(false);
				setError('');
			}
		} catch {
			if (currentAccount()) setError('Unable to refresh comments. Please try again.');
		}
	};

	const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!currentAccount()) return;
		if (!authenticated) {
			await loginHandler();
			return;
		}
		if (mutationLock.current || unavailable) return;
		if (!validCommentText(content)) {
			setError('Enter a comment between 1 and 100 characters.');
			return;
		}
		const text = content.trim();
		mutationLock.current = true;
		setPending(true);
		setError('');
		setNotice('');
		try {
			const response = await createComment({
				variables: {
					input: {
						commentGroup: CommentGroup.ARTICLE,
						commentRefId: articleId,
						commentContent: text,
					},
				},
			});
			if (!currentAccount()) return;
			const saved = response.data?.createComment;
			if (
				!saved?._id ||
				saved.memberId !== memberId ||
				saved.commentRefId !== articleId ||
				saved.commentGroup !== CommentGroup.ARTICLE ||
				saved.commentStatus !== CommentStatus.ACTIVE ||
				saved.commentContent !== text
			) {
				throw new Error('Comment not confirmed');
			}
			setContent('');
			setNotice('Comment posted.');
			try {
				await pageHandler(1, true);
				if (!currentAccount()) return;
				await commentsQuery.refetch({ input: { ...input, page: 1 } });
			} catch {
				if (currentAccount()) {
					setUncertain(true);
					setError('Comment posted, but comments could not refresh. Refresh before posting again.');
				}
			}
		} catch {
			if (currentAccount()) {
				setUncertain(true);
				setError('Unable to confirm the comment. Your draft is kept; refresh and check the list before retrying.');
			}
		} finally {
			mutationLock.current = false;
			if (currentAccount()) setPending(false);
		}
	};

	const updateHandler = async (comment: CommunityComment, remove = false) => {
		if (!currentAccount() || !authenticated || comment.memberId !== memberId || mutationLock.current || unavailable) return;
		if (!remove && (!validCommentText(editContent) || editId !== comment._id)) {
			setError('Enter a comment between 1 and 100 characters.');
			return;
		}
		if (remove && !window.confirm('Delete this comment?')) return;
		const text = editContent.trim();
		if (!remove && text === comment.commentContent) {
			setEditId('');
			setEditContent('');
			return;
		}
		mutationLock.current = true;
		setPending(true);
		setError('');
		setNotice('');
		try {
			const response = await updateComment({
				variables: {
					input: { _id: comment._id, ...(remove ? { commentStatus: CommentStatus.DELETE } : { commentContent: text }) },
				},
			});
			if (!currentAccount()) return;
			const saved = response.data?.updateComment;
			if (
				saved?._id !== comment._id ||
				saved.memberId !== memberId ||
				saved.commentRefId !== articleId ||
				saved.commentGroup !== CommentGroup.ARTICLE ||
				saved.commentStatus !== (remove ? CommentStatus.DELETE : CommentStatus.ACTIVE) ||
				(!remove && saved.commentContent !== text)
			) {
				throw new Error('Comment update not confirmed');
			}
			setEditId('');
			setEditContent('');
			setNotice(remove ? 'Comment deleted.' : 'Comment updated.');
			try {
				await commentsQuery.refetch();
			} catch {
				if (currentAccount()) {
					setUncertain(true);
					setError('Comment updated, but comments could not refresh. Refresh before another change.');
				}
			}
		} catch {
			if (currentAccount()) {
				setUncertain(true);
				setError('Unable to confirm the change. Refresh and check the list before retrying.');
			}
		} finally {
			mutationLock.current = false;
			if (currentAccount()) setPending(false);
		}
	};

	const editHandler = (comment: CommunityComment) => {
		if (!currentAccount() || comment.memberId !== memberId || unavailable) return;
		setEditId(comment._id);
		setEditContent(comment.commentContent);
		setError('');
		setNotice('');
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	useEffect(() => {
		if (total != null && !commentsQuery.loading && !commentsQuery.error && page > Math.max(1, totalPages)) {
			void pageHandler(Math.max(1, totalPages), true).catch(() => {
				if (currentAccount()) setError('Unable to update the comments page. Please try again.');
			});
		}
	}, [total, totalPages, page, commentsQuery.loading, commentsQuery.error]);

	return (
		<section className={styles.comments} aria-label="Post comments">
			<div className={styles.commentsHead}>
				<h2>Comments{!commentsQuery.loading && !commentsQuery.error && total != null ? ` ${total}` : ''}</h2>
			</div>
			{notice && <p className={styles.notice} role="status">{notice}</p>}
			{(error || commentsQuery.error) && (
				<div className={styles.detailError} role="alert">
					<p>{error || 'Unable to load comments. Please try again.'}</p>
					<Button variant="secondary" disabled={pending || commentsQuery.loading} onClick={() => void refreshHandler()}>Refresh comments</Button>
				</div>
			)}
			{commentsQuery.loading ? (
				<p className={styles.commentState} role="status">Loading comments…</p>
			) : commentsQuery.error ? null : (
				<>
					{!comments.length && <p className={styles.commentState}>No comments yet.</p>}
					{comments.map((comment) => {
						const author = comment.memberData?._id === comment.memberId ? comment.memberData : null;
						const name = author?.memberNick || 'Author unavailable';
						const date = !Number.isNaN(Date.parse(comment.createdAt))
							? new Date(comment.createdAt).toLocaleDateString(router.locale === 'kr' ? 'ko' : router.locale || 'en', {
								month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
							})
							: '';
						return (
							<article className={styles.comment} key={comment._id}>
								<ServiceImage path={author?.memberImage} alt={name} avatar className={styles.avatar} />
								<div className={styles.commentCopy}>
									<div className={styles.commentMeta}>
										{author ? (
											<Link href={author._id === memberId ? '/mypage' : { pathname: '/member', query: { memberId: author._id } }}>
												<strong>{name}</strong>
											</Link>
										) : <strong>{name}</strong>}
										{date && <time dateTime={comment.createdAt}>{date}</time>}
									</div>
									{editId === comment._id ? (
										<form
											className={styles.editForm}
											onSubmit={(event) => {
												event.preventDefault();
												void updateHandler(comment);
											}}
										>
											<label htmlFor="edit-comment">Edit comment</label>
											<textarea
												id="edit-comment"
												value={editContent}
												maxLength={100}
												disabled={pending}
												onChange={(event) => setEditContent(event.target.value)}
											/>
											<div className={styles.commentActions}>
												<Button type="submit" disabled={unavailable}>Save</Button>
												<Button
													variant="ghost"
													disabled={pending}
													onClick={() => {
														setEditId('');
														setEditContent('');
													}}
												>
													Cancel
												</Button>
											</div>
										</form>
									) : <p>{comment.commentContent}</p>}
									{authenticated && comment.memberId === memberId && editId !== comment._id && (
										<div className={styles.commentActions}>
											<button type="button" disabled={unavailable} onClick={() => editHandler(comment)}>Edit</button>
											<button type="button" disabled={unavailable} onClick={() => void updateHandler(comment, true)}>Delete</button>
										</div>
									)}
								</div>
							</article>
						);
					})}
					<ServicePagination page={page} totalPages={totalPages} onChange={(value) => void navigatePageHandler(value)} />
				</>
			)}
			<form className={styles.commentForm} onSubmit={submitHandler}>
				<label htmlFor="new-comment">
					Add a comment
					<textarea
						id="new-comment"
						value={content}
						onChange={(event) => setContent(event.target.value)}
						maxLength={100}
						disabled={!authenticated || pending}
						placeholder={authenticated ? 'Write a comment…' : 'Log in to write a comment.'}
					/>
					{authenticated && <small>{content.length}/100</small>}
				</label>
				{authenticated ? (
					<Button type="submit" disabled={unavailable}>{pending ? 'Saving…' : 'Submit'}</Button>
				) : (
					<Button onClick={() => void loginHandler()}>Log in to comment</Button>
				)}
			</form>
		</section>
	);
};

export default CommunityComments;
