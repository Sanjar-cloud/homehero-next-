import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NetworkStatus, useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FiCheck, FiChevronRight, FiClock, FiMapPin, FiMessageCircle, FiPlus } from 'react-icons/fi';
import { GET_MEMBER } from '../../apollo/user/query';
import { SUBSCRIBE, UNSUBSCRIBE } from '../../apollo/user/mutation';
import { GET_SERVICES } from '../../apollo/user/service.query';
import { LIKE_TARGET_SERVICE } from '../../apollo/user/service.mutation';
import { userVar } from '../../apollo/store';
import { getJwtToken } from '../../libs/auth';
import { Direction } from '../../libs/enums/common.enum';
import type { Member } from '../../libs/types/member/member';
import AgentReviews from '../../libs/components/agent/AgentReviews';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import { Button } from '../../libs/components/homehero/UI';
import ServiceCard, { ServiceImage } from '../../libs/components/service/ServiceCard';
import { label, ServicePagination } from '../../libs/components/service/ServiceFilter';
import styles from '../../scss/homehero/agent.module.scss';

export const getStaticProps = async ({ locale }: { locale: string }) => ({
	props: { ...(await serverSideTranslations(locale, ['common'])) },
});

interface AgentDetailProps {
	agentId: string;
	memberId: string;
	token: string;
	role: string;
	active: boolean;
}

const AgentDetail = ({ agentId, memberId, token, role, active }: AgentDetailProps) => {
	const { t: translate } = useTranslation('common');
	const router = useRouter();
	const tab = router.query.tab === 'reviews' ? 'reviews' : 'services';
	const [reviewTotal, setReviewTotal] = useState<number | undefined>();
	const [pending, setPending] = useState('');
	const [actionError, setActionError] = useState('');
	const [followUncertain, setFollowUncertain] = useState(false);
	const mounted = useRef(false);
	const mutationLock = useRef(false);
	const rawPage = typeof router.query.page === 'string' ? Number(router.query.page) : 1;
	const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 2147483647 ? rawPage : 1;
	const currentAccount = () => mounted.current && userVar()._id === memberId && (getJwtToken() || '') === token;
	const queryOptions = {
		fetchPolicy: 'no-cache' as const,
		context: { queryDeduplication: false },
		notifyOnNetworkStatusChange: true
	};

	/** APOLLO REQUESTS **/
	const profileQuery = useQuery<{ getMember: Member | null }>(GET_MEMBER, {
		variables: { input: agentId },
		...queryOptions,
	});
	const profile = profileQuery.data?.getMember;
	const agent = profile?._id === agentId && profile.memberType === 'AGENT' && profile.memberStatus === 'ACTIVE' ? profile : null;
	const servicesQuery = useQuery(GET_SERVICES, {
		variables: {
			input: { page, limit: 6, sort: 'createdAt', direction: Direction.DESC, search: { memberId: agentId } }
		},
		skip: !agent,
		...queryOptions,
	});
	const coverQuery = useQuery(GET_SERVICES, {
		variables: {
			input: {
				page: 1,
				limit: 1,
				sort: 'createdAt',
				direction: Direction.DESC,
				search: { memberId: agentId }
			}
		},
		skip: !agent,
		...queryOptions,
	});
	const [subscribe] = useMutation(SUBSCRIBE, { fetchPolicy: 'no-cache' });
	const [unsubscribe] = useMutation(UNSUBSCRIBE, { fetchPolicy: 'no-cache' });
	const [likeService] = useMutation(LIKE_TARGET_SERVICE, { fetchPolicy: 'no-cache' });
	const services = servicesQuery.data?.getServices.list.filter((service) => service.memberId === agentId && service.serviceStatus === 'ACTIVE') ?? [];
	const latest = coverQuery.data?.getServices.list.find((service) => service.memberId === agentId && service.serviceStatus === 'ACTIVE');
	const counter = servicesQuery.data?.getServices.metaCounter;
	const total = counter?.[0]?.total ?? (counter?.length === 0 ? 0 : undefined);
	const totalPages = total == null ? 0 : Math.ceil(total / 6);
	const following = !!agent?.meFollowed?.some((row) => row.followerId === memberId && row.followingId === agentId && row.myFollowing);
	const name = agent?.memberFullName || agent?.memberNick || '';
	const avatar = agent?.memberImage?.startsWith('/img/') ? undefined : agent?.memberImage;
	const self = memberId === agentId;
	const messageHref = { pathname: '/chat', query: { agentId } };
	const loginHref = { pathname: '/account/join', query: { view: 'login', referrer: router.asPath } };
	const messageLoginHref = { pathname: '/account/join', query: { view: 'login', referrer: `/chat?agentId=${agentId}` } };
	const locale = router.locale === 'kr' ? 'ko' : router.locale || 'en';

	/** HANDLERS **/
	const loginHandler = async () => {
		try {
			await router.push(loginHref);
		}
		catch {
			if (mounted.current) setActionError('Unable to open login. Please try again.');
		}
	};

	const followHandler = async () => {
		if (!memberId) {
			await loginHandler();
			return;
		}
		if (!currentAccount() || !agent || !active || self || followUncertain || mutationLock.current) return;
		mutationLock.current = true;
		setPending('follow');
		setActionError('');
		try {
			const result = await (following ? unsubscribe : subscribe)({ variables: { input: agentId } });
			if (!currentAccount()) return;
			const record = following ? result.data?.unsubscribe : result.data?.subscribe;
			if (record?.followerId !== memberId || record?.followingId !== agentId) throw new Error('Following unavailable');
			await profileQuery.refetch();
		} catch {
			if (currentAccount()) {
				setFollowUncertain(true);
				setActionError('Unable to confirm the follow update. Refresh the profile before trying again.');
			}
		} finally {
			mutationLock.current = false;
			if (currentAccount()) setPending('');
		}
	};

	const likeHandler = async (serviceId: string) => {
		if (!memberId) {
			await loginHandler();
			return;
		}
		if (!currentAccount() || !active || mutationLock.current || !services.some((service) => service._id === serviceId)) return;
		mutationLock.current = true;
		setPending(serviceId);
		setActionError('');
		try {
			const result = await likeService({ variables: { input: serviceId } });
			if (!currentAccount()) return;
			if (result.data?.likeTargetService._id !== serviceId || result.data.likeTargetService.memberId !== agentId) {
				throw new Error('Service unavailable');
			}
			await servicesQuery.refetch();
		} catch {
			if (currentAccount()) setActionError('Unable to confirm the favorite update. Refresh services before trying again.');
		} finally {
			mutationLock.current = false;
			if (currentAccount()) setPending('');
		}
	};

	const changeTabHandler = async (nextTab: 'services' | 'reviews') => {
		const query = { ...router.query };
		if (nextTab === 'reviews') query.tab = 'reviews';
		else delete query.tab;
		try {
			await router.push({ pathname: '/agent/detail', query }, undefined, { shallow: true, scroll: false });
		} catch {
			if (mounted.current) setActionError('Unable to open the tab. Please try again.');
		}
	};

	const changePageHandler = async (nextPage: number, replace = false) => {
		const query = { ...router.query };
		if (nextPage === 1) delete query.page;
		else query.page = String(nextPage);
		try {
			await router[replace ? 'replace' : 'push']({ pathname: '/agent/detail', query }, undefined, { shallow: true, scroll: false });
		} catch {
			if (mounted.current) setActionError('Unable to change page. Please try again.');
		}
	};

	const refreshHandler = () => void Promise.all([profileQuery.refetch(), servicesQuery.refetch()])
		.then(() => {
			if (currentAccount()) {
				setActionError('');
				setFollowUncertain(false);
			}
		})
		.catch(() => {
			if (currentAccount()) setActionError('Unable to refresh. Please try again.');
		});

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	useEffect(() => {
		if (total != null && !servicesQuery.loading && !servicesQuery.error && page > Math.max(1, totalPages)) {
			void changePageHandler(Math.max(1, totalPages), true);
		}
	}, [total, totalPages, page, servicesQuery.loading, servicesQuery.error]);

	if (profileQuery.loading && !(profileQuery.networkStatus === NetworkStatus.refetch && agent)) {
		return <div className={`${styles.container} ${styles.state}`} role="status">{translate('Loading professional…')}</div>;
	}
	if (profileQuery.error) return (
		<div className={`${styles.container} ${styles.state}`} role="alert">
			<h1>{translate('Professional unavailable')}</h1>
			<p>{translate('We could not load this profile. It may no longer be available.')}</p>
			<Button variant="secondary" onClick={() => void profileQuery.refetch().catch(() => setActionError('Unable to reload the profile.'))}>{translate('Retry')}</Button>
			<Link href="/agent">{translate('Back to Find Pros')}</Link>
			{actionError && (
				<p role="alert">{translate(actionError, { defaultValue: actionError })}</p>
			)}
		</div>
	);
	if (!agent) return (
		<div className={`${styles.container} ${styles.state}`}>
			<h1>{translate('Professional unavailable')}</h1>
			<p>{translate('No active professional was found for this link.')}</p>
			<Link href="/agent">{translate('Back to Find Pros')}</Link>
		</div>
	);

	return (
		<div className={styles.detailPage}>
			<Head>
				<title>{name} {translate('| HomeHero')}</title>
			</Head>
			<nav className={`${styles.container} ${styles.breadcrumbs}`} aria-label={translate('Breadcrumb')}>
				<Link href="/">{translate('Home')}</Link>
				<FiChevronRight size={14} />
				<Link href="/agent">{translate('Find Pros')}</Link>
				<FiChevronRight size={14} />
				<span>{name}</span>
			</nav>
			<section className={`${styles.container} ${styles.profileHeader}`}>
				<div className={styles.detailCover}>
					{latest?.serviceImages[0] && <ServiceImage path={latest.serviceImages[0]} alt="" />}
				</div>
				<div className={styles.profileContent}>
					<ServiceImage
						path={avatar}
						alt={name}
						avatar
						className={styles.detailAvatar}
					/>
					<div className={styles.profileIdentity}>
						<h1>{name}</h1>
						{latest && (
							<p className={styles.specialty}>{translate('Latest service:', { nsSeparator: false })} {translate(label(latest.serviceCategory), { defaultValue: label(latest.serviceCategory) })}</p>
						)}
						{agent.memberDesc && (
							<p className={styles.detailBio}>{agent.memberDesc}</p>
						)}
						<div className={styles.profileLocation}>
							{agent.memberAddress && (
								<span>
									<FiMapPin size={15} />
									{agent.memberAddress}
								</span>
							)}
							{!Number.isNaN(Date.parse(agent.createdAt)) && (
								<span><FiClock size={15} />{translate('Member since')} {new Date(agent.createdAt).toLocaleDateString(locale, { month: 'short', year: 'numeric' })}</span>
							)}
						</div>
					</div>
					<div className={styles.profileActions}>
						<Button
							variant={following || self ? 'secondary' : 'primary'}
							className={styles.profileFollow}
							disabled={!!pending || followUncertain || profileQuery.loading || self || !!memberId && !active}
							onClick={() => void followHandler()}
							aria-pressed={following}
							aria-busy={pending === 'follow'}
							aria-label={self ? translate('Your profile') : `${following ? 'Unfollow' : 'Follow'} ${name}`}
						>
							{!self && (following ? <FiCheck size={17} /> : <FiPlus size={17} />)}
							{self ? translate('Your profile') : pending === 'follow' ? translate('Please wait…') : following ? translate('Following') : translate('Follow')}
						</Button>
						{!memberId || role === 'USER' && active ? (
							<Link className={styles.messageButton} href={memberId ? messageHref : messageLoginHref}><FiMessageCircle size={18} />{translate('Message')}</Link>
						) : <Link className={styles.messageButton} href="/chat"><FiMessageCircle size={18} />{translate('Messages')}</Link>}
					</div>
				</div>
				<div className={styles.detailStats}>
					<span>
						<strong>
							{servicesQuery.loading ? '…' : servicesQuery.error || total == null ? '—' : total}
						</strong>
						<small>{translate('Services')}</small>
					</span>
					<span>
						<strong>{agent.memberFollowers}</strong>
						<small>{translate('Followers')}</small>
					</span>
				</div>
			</section>
			<section className={`${styles.container} ${styles.detailContent}`}>
				{actionError && (
					<div className={styles.error} role="alert">
						<p>{translate(actionError, { defaultValue: actionError })}</p>
						<Button
							variant="secondary"
							disabled={!!pending}
							onClick={refreshHandler}
						>
							{translate('Refresh')}
						</Button>
					</div>
				)}
				{coverQuery.error && (
					<p className={styles.cardNotice}>{translate('Cover unavailable.')}</p>
				)}
				<div
					className={styles.tabs}
					role="tablist"
					aria-label={translate('Professional information')}
				>
					<button
						id="agent-services-tab"
						role="tab"
						aria-selected={tab === 'services'}
						aria-controls="agent-services-panel"
						className={tab === 'services' ? styles.selectedTab : ''}
						onClick={() => void changeTabHandler('services')}
					>{translate('Services')} {total != null && !servicesQuery.error && (
							<span>{total}</span>
					)}</button>
					<button
						id="agent-reviews-tab"
						role="tab"
						aria-selected={tab === 'reviews'}
						aria-controls="agent-reviews-panel"
						className={tab === 'reviews' ? styles.selectedTab : ''}
						onClick={() => void changeTabHandler('reviews')}
					>{translate('Reviews')} {reviewTotal != null && (
							<span>{reviewTotal}</span>
					)}</button>
				</div>
				<AgentReviews
					agentId={agentId}
					active={tab === 'reviews'}
					onTotal={setReviewTotal}
				/>
				{tab === 'services' && (
					<div
						id="agent-services-panel"
						role="tabpanel"
						aria-labelledby="agent-services-tab"
					>
						<h2 className={styles.servicesTitle}>{translate('Services by')} {name}</h2>
						<p className={styles.servicesIntro}>{translate('Explore available services and get in touch directly.')}</p>
						{servicesQuery.error ? (
							<div className={styles.state} role="alert">
								<p>{translate('Unable to load services.')}</p>
								<Button
									variant="secondary"
									onClick={() => void servicesQuery.refetch().catch(() => setActionError('Unable to reload services.'))}
								>
									{translate('Retry')}
								</Button>
							</div>
						) : servicesQuery.loading ? (
							<div className={styles.state} role="status">{translate('Loading services…')}</div>
						) : !services.length ? (
							<div className={styles.state}>{translate('No active services are available.')}</div>
						) : (
							<>
								<div className={styles.serviceGrid}>
									{services.map((service) => (
										<ServiceCard
											key={service._id}
											service={service}
											variant="grid"
											detailHref={{ pathname: '/service/detail', query: { id: service._id } }}
											pending={!!pending || !!memberId && !active}
											onLike={likeHandler}
										/>
									))}
								</div>
								<ServicePagination
									page={page}
									totalPages={totalPages}
									onChange={(next) => void changePageHandler(next)}
								/>
							</>
						)}
					</div>
				)}
			</section>
		</div>
	);
};

const AgentDetailPage = () => {
	const { t: translate } = useTranslation('common');
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const token = getJwtToken() || '';
	const agentId = typeof router.query.agentId === 'string' ? router.query.agentId.toLowerCase() : '';
	if (!router.isReady) return <div className={`${styles.container} ${styles.state}`} role="status">{translate('Loading professional…')}</div>;
	if (!/^[a-f\d]{24}$/i.test(agentId)) return (
		<div className={`${styles.container} ${styles.state}`}>
			<h1>{translate('Invalid professional link')}</h1>
			<Link href="/agent">{translate('Back to Find Pros')}</Link>
		</div>
	);
	return (
		<AgentDetail
			key={`${agentId}:${user._id}:${token}:${user.memberType}:${user.memberStatus}`}
			agentId={agentId}
			memberId={user._id}
			token={token}
			role={user.memberType}
			active={!!token && user.memberStatus === 'ACTIVE'}
		/>
	);
};

export default withLayoutHomeHero(AgentDetailPage);
