import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { FiStar } from 'react-icons/fi';
import { GET_AGENT_REVIEWS } from '../../../apollo/user/review.query';
import { CREATE_AGENT_REVIEW } from '../../../apollo/user/review.mutation';
import { userVar } from '../../../apollo/store';
import { getJwtToken } from '../../auth';
import { Button } from '../homehero/UI';
import { ServiceImage } from '../service/ServiceCard';
import { ServicePagination } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/agent.module.scss';

interface AgentReviewsProps {
	agentId: string;
	active: boolean;
	onTotal: (total: number | undefined) => void;
}

const AgentReviews = ({ agentId, active, onTotal }: AgentReviewsProps) => {
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const token = getJwtToken() || '';
	const [page, setPage] = useState(1);
	const [formOpen, setFormOpen] = useState(false);
	const [draft, setDraft] = useState('');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const mounted = useRef(false);
	const submitLock = useRef(false);
	const requestVersion = useRef(0);
	const canWrite = !!token && !!user._id && user.memberType === 'USER' && user.memberStatus === 'ACTIVE' && user._id !== agentId;
	const currentAccount = () => mounted.current &&
		userVar()._id === user._id &&
		userVar().memberType === user.memberType &&
		userVar().memberStatus === user.memberStatus &&
		(getJwtToken() || '') === token;
	const locale = router.locale === 'kr' ? 'ko' : router.locale || 'en';
	const loginHref = { pathname: '/account/join', query: { view: 'login', referrer: router.asPath } };

	/** APOLLO REQUESTS **/
	const reviewsQuery = useQuery(GET_AGENT_REVIEWS, {
		variables: { input: { agentId, page, limit: 6 } },
		skip: !active,
		fetchPolicy: 'no-cache',
		context: { queryDeduplication: false },
		notifyOnNetworkStatusChange: true,
	});
	const [createReview] = useMutation(CREATE_AGENT_REVIEW, { fetchPolicy: 'no-cache' });
	const result = reviewsQuery.data?.getAgentReviews;
	const rows = result?.list.filter((review) => review.agentId === agentId) ?? [];
	const total = result?.metaCounter?.[0]?.total ?? (result?.metaCounter?.length === 0 ? 0 : undefined);
	const totalPages = total == null ? 0 : Math.ceil(total / 6);

	/** HANDLERS **/
	const refreshHandler = async () => {
		const request = ++requestVersion.current;
		try {
			await reviewsQuery.refetch();
			if (currentAccount() && request === requestVersion.current) setError('');
		} catch {
			if (currentAccount() && request === requestVersion.current) setError('Unable to refresh reviews. Please try again.');
		}
	};

	const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!active || !canWrite || !currentAccount() || submitLock.current) return;
		const text = draft.trim();
		if (!text || text.length > 2000) {
			setError('Enter a review containing 1–2000 characters.');
			return;
		}
		submitLock.current = true;
		setPending(true);
		setError('');
		try {
			const response = await createReview({ variables: { input: { agentId, text } } });
			if (!currentAccount()) return;
			const review = response.data?.createAgentReview;
			if (!review ||
				!/^[a-f\d]{24}$/i.test(review._id) ||
				review.agentId !== agentId ||
				review.authorId !== user._id ||
				review.text !== text) {
				throw new Error('Review unavailable');
			}
			setDraft('');
			setFormOpen(false);
			// Creation is confirmed independently of the subsequent list refresh.
			try {
				await reviewsQuery.refetch({ input: { agentId, page: 1, limit: 6 } });
				if (currentAccount()) setPage(1);
			} catch {
				if (currentAccount()) setError('Review saved, but the list could not be refreshed. Refresh reviews; do not resubmit it.');
			}
		} catch {
			if (currentAccount()) {
				setError('Unable to confirm submission. Your draft is retained. Refresh reviews before deciding whether to submit again.');
			}
		} finally {
			submitLock.current = false;
			if (currentAccount()) setPending(false);
		}
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			requestVersion.current++;
		};
	}, []);
	useEffect(() => {
		onTotal(reviewsQuery.error ? undefined : total);
	}, [total, reviewsQuery.error, onTotal]);
	useEffect(() => {
		if (active && total != null && !reviewsQuery.loading && !reviewsQuery.error && page > Math.max(1, totalPages)) {
			setPage(Math.max(1, totalPages));
		}
	}, [active, total, totalPages, page, reviewsQuery.loading, reviewsQuery.error]);

	if (!active) return null;
	return (
		<div
			id="agent-reviews-panel"
			role="tabpanel"
			aria-labelledby="agent-reviews-tab"
			className={styles.reviewsLayout}
		>
			{/* Static Figma presentation, independent of real reviews and their total. */}
			<aside className={styles.ratingPreview} aria-label="Sample rating display, not calculated from real reviews">
				<strong>4.9</strong>
				<div className={styles.ratingStars} aria-hidden="true">
					{[1, 2, 3, 4, 5].map((star) => <FiStar
						key={star}
						size={17}
						fill="currentColor"
					/>)}
				</div>
				<div className={styles.ratingBars} aria-hidden="true">
					{[5, 4, 3, 2, 1].map((stars) => {
						const percentage = stars === 5 ? 88 : stars === 4 ? 9 : 1;
						return (
							<div key={stars}>
								<span>{stars}</span>
								<FiStar size={12} fill="currentColor" />
								<i>
									<b style={{ width: `${percentage}%` }} />
								</i>
								<small>{percentage}%</small>
							</div>
						);
					})}
				</div>
			</aside>
			<section className={styles.reviewList} aria-label="Agent reviews">
				<div className={styles.reviewsHeading}>
					<div>
						<h2>What customers say</h2>
						<p>
							{total == null || reviewsQuery.error ? 'Customer reviews' : `${total} customer ${total === 1 ? 'review' : 'reviews'}`}
						</p>
					</div>
					{!user._id ? (
						<Link href={loginHref} className={styles.messageButton}>
							Write a review
						</Link>
					) : canWrite ? (
						<Button
							variant="secondary"
							disabled={pending}
							onClick={() => setFormOpen(!formOpen)}
						>
							{formOpen ? 'Close form' : 'Write a review'}
						</Button>
					) : (
						<span className={styles.cardNotice}>Only active customers can write reviews.</span>
					)}
				</div>
				{formOpen && canWrite && (
					<form className={styles.reviewForm} onSubmit={submitHandler}>
						<h3>Write a review</h3>
						<label htmlFor="agent-review-text">How was your experience?</label>
						<textarea
							id="agent-review-text"
							value={draft}
							disabled={pending}
							maxLength={2000}
							onChange={(event) => setDraft(event.target.value)}
							placeholder="Share details about your experience with this professional…"
						/>
						<small>{draft.length}/2000 characters</small>
						<Button type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Submit review'}</Button>
					</form>
				)}
				{error && (
					<div className={styles.error} role="alert">
						<p>{error}</p>
						<Button
							variant="secondary"
							disabled={pending}
							onClick={() => void refreshHandler()}
						>
							Refresh reviews
						</Button>
					</div>
				)}
				{reviewsQuery.error ? (
					<div className={styles.state} role="alert">
						<p>Unable to load reviews.</p>
						<Button
							variant="secondary"
							disabled={pending}
							onClick={() => void refreshHandler()}
						>
							Retry
						</Button>
					</div>
				) : reviewsQuery.loading ? (
					<div className={styles.state} role="status">Loading reviews…</div>
				) : !rows.length ? (
					<div className={styles.state}>No reviews yet.</div>
				) : (
					<>
						{rows.map((review) => {
							const author = review.authorData;
							const name = author?.memberNick || 'Author unavailable';
							return (
								<article className={styles.reviewRow} key={review._id}>
									<ServiceImage
										path={author?.memberImage?.startsWith('/img/') ? undefined : author?.memberImage || undefined}
										alt={name}
										avatar
										className={styles.reviewAvatar}
									/>
									<div>
										<strong>{name}</strong>
										{!Number.isNaN(Date.parse(review.createdAt)) && (
											<time dateTime={review.createdAt}>
												{new Date(review.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
											</time>
										)}
										<p>{review.text}</p>
									</div>
								</article>
							);
						})}
						<ServicePagination
							page={page}
							totalPages={totalPages}
							onChange={setPage}
						/>
					</>
				)}
			</section>
		</div>
	);
};

export default AgentReviews;
