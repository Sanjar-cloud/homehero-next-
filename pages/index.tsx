import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';
import type { GetStaticProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { FiArrowRight, FiEye, FiHome, FiMessageCircle, FiSearch, FiTool, FiZap } from 'react-icons/fi';
import { GET_SERVICES } from '../apollo/user/service.query';
import { LIKE_TARGET_SERVICE } from '../apollo/user/service.mutation';
import { userVar } from '../apollo/store';
import { Direction } from '../libs/enums/common.enum';
import type { ServicesInquiry } from '../libs/types/service/service.input';
import withLayoutHomeHero from '../libs/components/layout/LayoutHomeHero';
import HomeHeroHero from '../libs/components/homepage/HomeHeroHero';
import HomeHeroCategories from '../libs/components/homepage/HomeHeroCategories';
import HomeHeroServices from '../libs/components/homepage/HomeHeroServices';
import { Button } from '../libs/components/homehero/UI';
import styles from '../scss/homehero/home.module.scss';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		...(await serverSideTranslations(locale || 'en', ['common'])),
	},
});

const popularInput: ServicesInquiry = {
	page: 1,
	limit: 4,
	sort: 'serviceLikes',
	direction: Direction.DESC,
	search: {},
};
const newestInput: ServicesInquiry = {
	page: 1,
	limit: 8,
	sort: 'createdAt',
	direction: Direction.DESC,
	search: {},
};

const HowHomeHeroWorks = () => {
	const { t: translate } = useTranslation('common');
	const steps = [
		{ title: 'Search', icon: FiSearch, text: 'Choose a service category and find professionals in your area.' },
		{ title: 'Compare', icon: FiEye, text: 'Explore service details, provider information, and prices when listed.' },
		{ title: 'Comment', icon: FiMessageCircle, text: 'Log in to save favorites and share your thoughts on a service.' },
	];

	return (
		<section className={`${styles.section} ${styles.howSection}`}>
			<div className={styles.container}>
				<div className={styles.sectionHeading}>
					<div>
						<span className={styles.eyebrow}>{translate('Simple and straightforward')}</span>
						<h2>{translate('How HomeHero works')}</h2>
						<p>{translate('Find local home services in a few simple steps.')}</p>
					</div>
				</div>
				<div className={styles.steps}>
					{steps.map(({ title, icon: Icon, text }, index) => (
						<div className={styles.step} key={title}>
							<span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
							<span className={styles.stepIcon}><Icon aria-hidden="true" /></span>
							<h3>{translate(title)}</h3>
							<p>{translate(text)}</p>
							{index < 2 && <FiArrowRight className={styles.stepArrow} aria-hidden="true" />}
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

const HomeHeroAgentCTA = ({ authenticated }: { authenticated: boolean }) => {
	const { t: translate } = useTranslation('common');
	return (
	<section className={styles.ctaWrap}>
		<div className={styles.container}>
			<div className={styles.agentCTA}>
				<div className={styles.ctaCopy}>
					<span className={styles.eyebrow}>{translate('Grow your business')}</span>
					<h2>{translate('Great at what you do?')}</h2>
					<p>{translate('Join HomeHero as a service provider and share your home services with local customers.')}</p>
					<Link
						href={authenticated ? '/service' : { pathname: '/account/join', query: { view: 'signup', role: 'AGENT' } }}
						className={styles.ctaLink}
					>
						{authenticated ? translate('Explore services') : translate('Join as Agent')} <FiArrowRight aria-hidden="true" />
					</Link>
				</div>
				<div className={styles.ctaArt} aria-hidden="true">
					<span><FiTool /></span><span><FiHome /></span><span><FiZap /></span>
				</div>
			</div>
		</div>
	</section>
);
};

const Home: NextPage = () => {
	const { t: translate } = useTranslation('common');
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const [clientReady, setClientReady] = useState(false);
	const [pendingIds, setPendingIds] = useState<string[]>([]);
	const [actionError, setActionError] = useState('');
	const likeLocks = useRef(new Set<string>());
	const identity = useRef(user._id);

	/** APOLLO REQUESTS **/
	const popularQuery = useQuery(GET_SERVICES, {
		variables: { input: popularInput },
		skip: !clientReady || !router.isReady,
		fetchPolicy: 'network-only',
		notifyOnNetworkStatusChange: true,
	});
	const newestQuery = useQuery(GET_SERVICES, {
		variables: { input: newestInput },
		skip: !clientReady || !router.isReady,
		fetchPolicy: 'network-only',
		notifyOnNetworkStatusChange: true,
	});
	const [likeTargetService] = useMutation(LIKE_TARGET_SERVICE);

	/** LIFECYCLES **/
	useEffect(() => {
		setClientReady(true);
	}, []);

	useEffect(() => {
		if (identity.current === user._id) return;
		identity.current = user._id;
		if (clientReady && router.isReady) {
			void Promise.all([popularQuery.refetch(), newestQuery.refetch()])
				.catch(() => setActionError('Unable to refresh favorites. Please retry.'));
		}
	}, [user._id, clientReady, router.isReady, popularQuery.refetch, newestQuery.refetch]);

	/** LIKE HANDLER **/
	const likeServiceHandler = async (id: string) => {
		if (!user._id) {
			await router.push({ pathname: '/account/join', query: { view: 'login', referrer: router.asPath } });
			return;
		}
		if (likeLocks.current.has(id)) return;
		likeLocks.current.add(id);
		setPendingIds(Array.from(likeLocks.current));
		setActionError('');

		try {
			await likeTargetService({ variables: { input: id } });
			try {
				await Promise.all([popularQuery.refetch(), newestQuery.refetch()]);
			} catch {
				setActionError('Favorite saved, but services could not refresh. Please retry.');
			}
		} catch {
			setActionError('Unable to update this favorite. Please try again.');
		} finally {
			likeLocks.current.delete(id);
			setPendingIds(Array.from(likeLocks.current));
		}
	};

	const refreshServicesHandler = async () => {
		try {
			await Promise.all([popularQuery.refetch(), newestQuery.refetch()]);
			setActionError('');
		} catch {
			setActionError('Unable to refresh services. Please retry.');
		}
	};

	/** RENDER VALUES **/
	const ready = clientReady && router.isReady;
	const popularServices = popularQuery.data?.getServices.list ?? [];
	const newestServices = newestQuery.data?.getServices.list ?? [];
	const showHeroData = ready && !popularQuery.loading && !popularQuery.error && Boolean(popularQuery.data);
	const serviceTotal = popularQuery.data?.getServices.metaCounter?.[0]?.total;

	return (
		<div className={styles.homePage}>
			<HomeHeroHero
				featuredService={showHeroData ? popularServices[0] : undefined}
				total={showHeroData ? serviceTotal ?? (popularServices.length ? undefined : 0) : undefined}
			/>
			<HomeHeroCategories />
			{actionError && (
				<div className={`${styles.container} ${styles.error}`} role="alert">
					{translate(actionError, { defaultValue: actionError })}{' '}
					<Button variant="secondary" onClick={() => void refreshServicesHandler()}>{translate('Refresh services')}</Button>
				</div>
			)}
			<HomeHeroServices
				eyebrow="Explore local services"
				title="Popular services"
				description="Discover services ordered by likes."
				services={popularServices}
				loading={!ready || popularQuery.loading}
				error={Boolean(popularQuery.error)}
				sort="mostLiked"
				soft
				pendingIds={pendingIds}
				onLike={likeServiceHandler}
				onRetry={() => void popularQuery.refetch().catch(() => {})}
			/>
			<HomeHeroServices
				eyebrow="Fresh finds"
				title="Newest services"
				description="Explore recently added home service listings."
				services={newestServices}
				loading={!ready || newestQuery.loading}
				error={Boolean(newestQuery.error)}
				sort="newest"
				pendingIds={pendingIds}
				onLike={likeServiceHandler}
				onRetry={() => void newestQuery.refetch().catch(() => {})}
			/>
			<HowHomeHeroWorks />
			<HomeHeroAgentCTA authenticated={clientReady && Boolean(user._id)} />
		</div>
	);
};

export default withLayoutHomeHero(Home);
