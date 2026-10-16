import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { Dialog } from '@mui/material';
import { FiChevronLeft, FiChevronRight, FiEye, FiHeart, FiImage, FiMapPin, FiMessageCircle, FiX } from 'react-icons/fi';
import { GET_SERVICE } from '../../apollo/user/service.query';
import { LIKE_TARGET_SERVICE } from '../../apollo/user/service.mutation';
import { GET_SERVICE_COMMENTS } from '../../apollo/user/service-comment.query';
import type { ServiceComment } from '../../apollo/user/service-comment.query';
import { CREATE_COMMENT } from '../../apollo/user/mutation';
import { userVar } from '../../apollo/store';
import { CommentGroup } from '../../libs/enums/comment.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import type { CommentInput, CommentsInquiry } from '../../libs/types/comment/comment.input';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import { Button } from '../../libs/components/homehero/UI';
import { formatPrice, ServiceImage } from '../../libs/components/service/ServiceCard';
import { label, scalar, ServicePagination, validPage } from '../../libs/components/service/ServiceFilter';
import styles from '../../scss/homehero/service.module.scss';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		...(await serverSideTranslations(locale || 'en', ['common'])),
	},
});

function ServiceCommentItem({ comment, dateLabel }: { comment: ServiceComment; dateLabel: string }) {
	const { t: translate } = useTranslation('common');
	return (
		<div className={styles.comment}>
			<ServiceImage
				path={comment.memberData?.memberImage}
				alt={comment.memberData?.memberNick || translate('Member')}
				avatar
				className={styles.avatar}
			/>
			<div>
				<strong>{comment.memberData?.memberNick || translate('Member')}</strong>
				<time dateTime={comment.createdAt}>{dateLabel}</time>
				<p>{comment.commentContent}</p>
			</div>
		</div>
	);
}

function ServiceDetail() {
	const { t: translate } = useTranslation('common');
	const router = useRouter();
	const user = useReactiveVar(userVar);

	/** STATE AND URL VALUES **/
	const id = scalar(router.query.id).toLowerCase();
	const validId = /^[a-f\d]{24}$/i.test(id);
	const commentPage = validPage(router.query.commentPage);
	const returnValue = scalar(router.query.returnTo);
	const returnTo = returnValue === '/service' || returnValue.startsWith('/service?') ? returnValue : '/service';
	const [clientReady, setClientReady] = useState(false);
	const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
	const [content, setContent] = useState('');
	const [commentError, setCommentError] = useState('');
	const [actionError, setActionError] = useState('');
	const [likePending, setLikePending] = useState(false);
	const [commentPending, setCommentPending] = useState(false);
	const likeLock = useRef(false);
	const commentLock = useRef(false);
	const activeId = useRef(id);
	activeId.current = id;
	const identity = useRef(user._id);
	const pageRef = useRef<HTMLDivElement>(null);

	/** APOLLO REQUESTS **/
	const serviceQuery = useQuery(GET_SERVICE, {
		variables: { input: id },
		skip: !clientReady || !router.isReady || !validId,
		fetchPolicy: 'network-only',
		notifyOnNetworkStatusChange: true,
	});
	const service = serviceQuery.data?.getService?._id === id ? serviceQuery.data.getService : undefined;
	const commentInput: CommentsInquiry = {
		page: commentPage,
		limit: 5,
		sort: 'createdAt',
		direction: Direction.DESC,
		search: { commentRefId: id },
	};
	const commentsQuery = useQuery(GET_SERVICE_COMMENTS, {
		variables: { input: commentInput },
		skip: !clientReady || !router.isReady || !validId || !service || Boolean(serviceQuery.error),
		fetchPolicy: 'network-only',
		notifyOnNetworkStatusChange: true,
	});
	const [likeService] = useMutation(LIKE_TARGET_SERVICE);
	const [createComment] = useMutation<{ createComment: { _id: string } }, { input: CommentInput }>(CREATE_COMMENT);
	const commentTotal = commentsQuery.data?.getComments.metaCounter?.[0]?.total ?? 0;
	const commentPages = Math.ceil(commentTotal / 5);

	/** LIFECYCLES **/
	useEffect(() => {
		setClientReady(true);
	}, []);

	useEffect(() => {
		setGalleryIndex(null);
		setContent('');
		setCommentError('');
		setActionError('');
	}, [id]);

	useEffect(() => {
		if (identity.current === user._id) return;
		identity.current = user._id;
		if (clientReady && router.isReady && validId) {
			void serviceQuery.refetch().catch(() => setActionError('Unable to refresh this service. Please retry.'));
		}
	}, [user._id, clientReady, router.isReady, validId, serviceQuery.refetch]);

	useEffect(() => {
		if (!commentsQuery.loading && !commentsQuery.error && commentPages > 0 && commentPage > commentPages) {
			void changeCommentPage(commentPages, true);
		}
	}, [commentsQuery.loading, commentsQuery.error, commentPages, commentPage]);

	/** NAVIGATION HANDLERS **/
	const changeCommentPage = (page: number, replace = false) =>
		router[replace ? 'replace' : 'push'](
			{ pathname: '/service/detail', query: { ...router.query, commentPage: String(page) } },
			undefined,
			{ shallow: true, scroll: false },
		);

	const login = () => router.push({ pathname: '/account/join', query: { view: 'login', referrer: router.asPath } });

	/** LIKE HANDLER **/
	const like = async () => {
		if (!user._id) {
			await login();
			return;
		}
		if (likeLock.current || !service) return;
		likeLock.current = true;
		setLikePending(true);
		setActionError('');
		const targetId = id;

		try {
			await likeService({ variables: { input: targetId } });
			if (activeId.current !== targetId) return;
			try {
				await serviceQuery.refetch();
			} catch {
				setActionError('Favorite saved, but the service could not refresh. Please retry.');
			}
		} catch {
			if (activeId.current === targetId) setActionError('Unable to update this favorite. Please try again.');
		} finally {
			likeLock.current = false;
			setLikePending(false);
		}
	};

	/** COMMENT HANDLER **/
	const submitComment = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!user._id) {
			await login();
			return;
		}
		if (commentLock.current || !service) return;
		const text = content.trim();
		if (!text || text.length > 100) {
			setCommentError('Enter a comment between 1 and 100 characters.');
			return;
		}
		commentLock.current = true;
		setCommentPending(true);
		setCommentError('');
		const targetId = id;

		try {
			await createComment({
				variables: {
					input: { commentGroup: CommentGroup.SERVICE, commentRefId: targetId, commentContent: text },
				},
			});
			if (activeId.current !== targetId) return;
			setContent('');
			try {
				await changeCommentPage(1, true);
				await Promise.all([
					commentsQuery.refetch({ input: { ...commentInput, page: 1 } }),
					serviceQuery.refetch(),
				]);
			} catch {
				setCommentError('Comment posted, but the page could not refresh. Please retry loading comments.');
			}
		} catch {
			if (activeId.current === targetId) setCommentError('Unable to post your comment. Please try again.');
		} finally {
			commentLock.current = false;
			setCommentPending(false);
		}
	};

	/** GALLERY AND DISPLAY VALUES **/
	const dateLabel = (date: string) => {
		const parsed = new Date(date);
		return Number.isNaN(parsed.getTime())
			? ''
			: parsed.toLocaleDateString(router.locale === 'kr' ? 'ko-KR' : router.locale === 'ru' ? 'ru-RU' : 'en-US');
	};
	const images = service?.serviceImages ?? [];
	const moveGallery = (delta: number) =>
		setGalleryIndex((index) =>
			index === null || !images.length ? null : (index + delta + images.length) % images.length,
		);
	const liked = service?.meLiked?.some((item) => item.myFavorite) ?? false;
	const unavailable = serviceQuery.error?.graphQLErrors.some((error) => error.message === Message.NO_DATA_FOUND);
	let status: 'loading' | 'invalid' | 'missing' | 'error' | 'ready';
	if (!clientReady || !router.isReady) {
		status = 'loading';
	} else if (!validId) {
		status = 'invalid';
	} else if (serviceQuery.error) {
		status = unavailable ? 'missing' : 'error';
	} else if (!service) {
		status = serviceQuery.loading ? 'loading' : 'missing';
	} else {
		status = 'ready';
	}

	return (
		<div className={styles.detailPage} ref={pageRef}>
			<Head>
				<title>{service ? `${service.serviceTitle} | HomeHero` : translate('Service | HomeHero')}</title>
			</Head>
			<div className={`${styles.container} ${styles.breadcrumbs}`}>
				<Link href="/">{translate('Home')}</Link>
				<FiChevronRight />
				<Link href={returnTo}>{translate('Services')}</Link>
				{service && <><FiChevronRight /><span>{service.serviceTitle}</span></>}
			</div>
			{status !== 'ready' ? (
				<div className={`${styles.container} ${styles.state}`} role={status === 'loading' ? 'status' : 'alert'}>
					<h1>
						{status === 'loading' ? translate('Loading service…')
							: status === 'invalid' ? translate('Invalid service link')
								: status === 'missing' ? translate('Service unavailable') : translate('Unable to load this service')}
					</h1>
					<p>
						{status === 'invalid' ? translate('This link does not contain a valid service ID.')
							: status === 'missing' ? translate('This service may no longer be available.')
								: status === 'error' ? translate('Please check your connection and try again.') : translate('Please wait.')}
					</p>
					{status === 'error' && (
						<Button onClick={() => void serviceQuery.refetch().catch(() => {})}>{translate('Retry')}</Button>
					)}{' '}
					{status !== 'loading' && (
						<Link className={styles.detailLink} href={returnTo}>{translate('Back to services')}</Link>
					)}
				</div>
			) : service && (
				<>
					<div className={`${styles.container} ${styles.gallery} ${images.length < 3 ? styles.smallGallery : ''} ${images.length < 2 ? styles.singleGallery : ''}`}>
						<div className={styles.galleryMain}>
							<ServiceImage path={images[0]} alt={service.serviceTitle} />
						</div>
						{images.slice(1, 3).map((image, index) => (
							<ServiceImage key={`${image}-${index}`} path={image} alt={translate('Service photo {{number}}', { number: index + 2 })} />
						))}
						{images.length > 0 && (
							<button type="button" onClick={() => setGalleryIndex(0)}>
								<FiImage size={18} />{translate('View all')} {images.length} {translate('photos')}
							</button>
						)}
					</div>
					<div className={`${styles.container} ${styles.detailLayout}`}>
						<article className={styles.detailMain}>
							<div className={styles.detailTitle}>
								<div>
									<span className={`${styles.category} ${styles.staticCategory}`}>{translate(label(service.serviceCategory), { defaultValue: label(service.serviceCategory) })}</span>
									<h1>{service.serviceTitle}</h1>
									<p className={styles.location}><FiMapPin size={15} />{translate(label(service.serviceLocation), { defaultValue: label(service.serviceLocation) })}</p>
									<div className={styles.stats}>
										<span><FiHeart /> {service.serviceLikes} {translate('likes')}</span>
										<span><FiEye /> {service.serviceViews} {translate('views')}</span>
										<span><FiMessageCircle /> {service.serviceComments} {translate('comments')}</span>
									</div>
								</div>
								<button
									type="button"
									className={`${styles.roundAction} ${liked ? styles.saved : ''}`}
									disabled={likePending}
									aria-pressed={liked}
									aria-label={liked ? translate('Remove from favorites') : translate('Save service')}
									onClick={() => void like()}
								>
									<FiHeart size={21} fill={liked ? 'currentColor' : 'none'} />
								</button>
							</div>
							{serviceQuery.loading && <p role="status" className={styles.notice}>{translate('Updating service…')}</p>}
							{actionError && (
								<p role="alert" className={styles.error}>
									{translate(actionError, { defaultValue: actionError })}{' '}
									<button
										type="button"
										onClick={() => void serviceQuery.refetch().then(() => setActionError('')).catch(() => {})}
									>
										{translate('Refresh')}
									</button>
								</p>
							)}
							<section className={styles.detailSection}>
								<h2>{translate('About this service')}</h2>
								<p className={styles.description}>{service.serviceDesc || translate('No description provided.')}</p>
							</section>
							<section className={styles.detailSection}>
								<h2>{translate('Service location')}</h2>
								<span className={styles.locationChip}><FiMapPin />{translate(label(service.serviceLocation), { defaultValue: label(service.serviceLocation) })}</span>
							</section>
							<section className={styles.detailSection} aria-busy={commentsQuery.loading}>
								<h2>{translate('Comments')} {commentsQuery.data ? `(${commentTotal})` : ''}</h2>
								{commentsQuery.error ? (
									<div role="alert" className={styles.error}>
										{translate('Unable to load comments.')}{' '}
										<Button variant="secondary" onClick={() => void commentsQuery.refetch().catch(() => {})}>
											{translate('Retry comments')}
										</Button>
									</div>
								) : commentsQuery.loading && !commentsQuery.data ? (
									<p role="status">{translate('Loading comments…')}</p>
								) : (
									<>
										{commentsQuery.loading && <p role="status" className={styles.notice}>{translate('Updating comments…')}</p>}
										{commentsQuery.data?.getComments.list.map((comment) => (
											<ServiceCommentItem key={comment._id} comment={comment} dateLabel={dateLabel(comment.createdAt)} />
										))}
										{!commentsQuery.data?.getComments.list.length && <p className={styles.notice}>{translate('No comments yet.')}</p>}
										<ServicePagination
											page={commentPage}
											totalPages={commentPages}
											onChange={(page) => void changeCommentPage(page)}
										/>
									</>
								)}
							</section>
							<section className={styles.detailSection}>
								<h2>{translate('Write a comment')}</h2>
								{user._id ? (
									<form onSubmit={submitComment} aria-busy={commentPending}>
										<label className={styles.commentLabel} htmlFor="service-comment">
											{translate('Share your thoughts')}
											<textarea
												id="service-comment"
												value={content}
												onChange={(event) => {
													setContent(event.target.value);
													setCommentError('');
												}}
												maxLength={100}
												required
												disabled={commentPending}
												placeholder={translate('Write a comment about this service…')}
											/>
										</label>
										<p className={styles.notice}>{content.length}{translate('/100 characters')}</p>
										{commentError && <p role="alert" className={styles.error}>{translate(commentError, { defaultValue: commentError })}</p>}
										<Button type="submit" disabled={commentPending || !content.trim()}>
											{commentPending ? translate('Posting…') : translate('Post comment')}
										</Button>
									</form>
								) : (
									<>
										<p>{translate('Log in to leave a comment.')}</p>
										<Button onClick={() => void login()}>{translate('Log in')}</Button>
									</>
								)}
							</section>
						</article>
						<aside className={styles.providerPanel}>
							<div className={styles.price}>
								<span>{translate('Service price')}</span>
								<strong>{translate(formatPrice(service.servicePrice), { defaultValue: formatPrice(service.servicePrice) })}</strong>
							</div>
							<Link
								href={{ pathname: '/agent/detail', query: { agentId: service.memberId, serviceId: service._id } }}
								className={`${styles.providerProfile} ${styles.providerLink}`}
							>
								<ServiceImage
									path={service.memberData?.memberImage}
									alt={service.memberData?.memberNick || translate('Provider unavailable')}
									avatar
									className={`${styles.avatar} ${styles.largeAvatar}`}
								/>
								<div>
									<h2>{service.memberData?.memberNick || translate('Provider unavailable')}</h2>
									<span>{translate('Service provider')}</span>
								</div>
							</Link>
							{service.memberData?.memberDesc && <p className={styles.description}>{service.memberData.memberDesc}</p>}
							{service.memberData && (
								<div className={styles.providerCount}>
									<strong>{service.memberData.memberServices}</strong>
									<span>{translate('Active services')}</span>
								</div>
							)}
						</aside>
					</div>
				</>
			)}
			<Dialog
				disablePortal
				container={() => pageRef.current}
				open={galleryIndex !== null}
				onClose={() => setGalleryIndex(null)}
				aria-labelledby="service-gallery-title"
				classes={{ paper: styles.galleryDialog }}
				maxWidth={false}
				onKeyDown={(event) => {
					if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
						event.preventDefault();
						moveGallery(event.key === 'ArrowLeft' ? -1 : 1);
					}
				}}
			>
				<div className={styles.galleryToolbar}>
					<h2 id="service-gallery-title">{translate('Service photos')}</h2>
					<button type="button" aria-label={translate('Close gallery')} onClick={() => setGalleryIndex(null)}>
						<FiX size={24} />
					</button>
				</div>
				{galleryIndex !== null && (
					<ServiceImage
						path={images[galleryIndex]}
						alt={translate('Service photo {{number}}', { number: galleryIndex + 1 })}
						className={styles.galleryPhoto}
					/>
				)}
				<div className={styles.galleryControls}>
					<button type="button" aria-label={translate('Previous photo')} disabled={images.length < 2} onClick={() => moveGallery(-1)}>
						<FiChevronLeft size={24} />
					</button>
					<span aria-live="polite">{galleryIndex === null ? 0 : galleryIndex + 1} / {images.length}</span>
					<button type="button" aria-label={translate('Next photo')} disabled={images.length < 2} onClick={() => moveGallery(1)}>
						<FiChevronRight size={24} />
					</button>
				</div>
			</Dialog>
		</div>
	);
}

export default withLayoutHomeHero(ServiceDetail);
