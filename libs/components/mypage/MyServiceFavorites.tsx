import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { FiHeart } from 'react-icons/fi';
import { GET_SERVICE_FAVORITES } from '../../../apollo/user/service.query';
import { LIKE_TARGET_SERVICE } from '../../../apollo/user/service.mutation';
import { userVar } from '../../../apollo/store';
import { Button } from '../homehero/UI';
import ServiceCard from '../service/ServiceCard';
import { ServicePagination, validPage } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/favorites.module.scss';

interface FavoriteServicesPanelProps {
	memberId: string;
}

const pageSize = 6;

const FavoriteServicesPanel = ({ memberId }: FavoriteServicesPanelProps) => {
	const router = useRouter();
	const page = validPage(router.query.page);
	const [pendingIds, setPendingIds] = useState<string[]>([]);
	const [actionError, setActionError] = useState('');
	const likeLocks = useRef(new Set<string>());
	const mounted = useRef(true);

	/** APOLLO REQUESTS **/
	const favoritesQuery = useQuery(GET_SERVICE_FAVORITES, {
		variables: { input: { page, limit: pageSize } },
		skip: !router.isReady || !memberId || userVar()._id !== memberId,
		fetchPolicy: 'no-cache',
		// Identical page inputs must not share an in-flight request across accounts.
		context: { queryDeduplication: false },
		notifyOnNetworkStatusChange: true,
	});
	const [likeTargetService] = useMutation(LIKE_TARGET_SERVICE);
	const favorites = favoritesQuery.data?.getFavorites.list ?? [];
	const counter = favoritesQuery.data?.getFavorites.metaCounter;
	const total = counter?.[0]?.total ?? (counter?.length === 0 ? 0 : undefined);
	const totalPages = total === undefined ? 0 : Math.ceil(total / pageSize);
	const loginHref = { pathname: '/account/join', query: { view: 'login', referrer: router.asPath } };

	/** HANDLERS **/
	const changePageHandler = async (nextPage: number, replace = false) => {
		if (!mounted.current || userVar()._id !== memberId) return;
		const query: typeof router.query = { ...router.query, category: 'myFavorites' };
		if (nextPage === 1) delete query.page;
		else query.page = String(nextPage);

		try {
			await router[replace ? 'replace' : 'push'](
				{ pathname: '/mypage', query },
				undefined,
				{ shallow: true, scroll: false },
			);
		} catch {
			if (mounted.current && userVar()._id === memberId) {
				setActionError('Unable to change page. Please try again.');
			}
		}
	};

	const removeFavoriteHandler = async (serviceId: string) => {
		if (!mounted.current || userVar()._id !== memberId || likeLocks.current.has(serviceId)) return;
		likeLocks.current.add(serviceId);
		setPendingIds(Array.from(likeLocks.current));
		setActionError('');

		try {
			await likeTargetService({ variables: { input: serviceId } });
			if (!mounted.current || userVar()._id !== memberId) return;
			try {
				await favoritesQuery.refetch();
			} catch {
				if (mounted.current && userVar()._id === memberId) {
					setActionError('Favorite updated, but the list could not refresh. Please retry.');
				}
			}
		} catch {
			if (mounted.current && userVar()._id === memberId) {
				setActionError('Unable to remove this favorite. Please try again.');
			}
		} finally {
			likeLocks.current.delete(serviceId);
			if (mounted.current && userVar()._id === memberId) setPendingIds(Array.from(likeLocks.current));
		}
	};

	const refreshFavoritesHandler = async () => {
		if (!mounted.current || userVar()._id !== memberId) return;
		try {
			await favoritesQuery.refetch();
			if (mounted.current && userVar()._id === memberId) setActionError('');
		} catch {
			if (mounted.current && userVar()._id === memberId) {
				setActionError('Unable to refresh favorites. Please try again.');
			}
		}
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);

	useEffect(() => {
		if (!favoritesQuery.loading && !favoritesQuery.error && total !== undefined && page > Math.max(1, totalPages)) {
			void changePageHandler(Math.max(1, totalPages), true);
		}
	}, [favoritesQuery.loading, favoritesQuery.error, total, totalPages, page]);

	return (
		<section className={styles.content} aria-busy={favoritesQuery.loading}>
			<div className={styles.sectionHeading}>
				<h2>Favorite services</h2>
				<p>Services you saved for later.</p>
			</div>
			{actionError && (
				<div className={styles.error} role="alert">
					{actionError}{' '}
					<Button variant="secondary" onClick={() => void refreshFavoritesHandler()}>Refresh favorites</Button>
				</div>
			)}
			{favoritesQuery.error ? (
				<div className={styles.state} role="alert">
					<h3>Unable to load favorite services</h3>
					<p>Please try again or log in to continue.</p>
					<Button variant="secondary" onClick={() => void refreshFavoritesHandler()}>Retry favorites</Button>
					<Link href={loginHref} className={styles.textLink}>Log in</Link>
				</div>
			) : favoritesQuery.loading ? (
				<div className={styles.state} role="status">Loading favorite services…</div>
			) : (
				<>
					{favorites.length ? (
						<div className={styles.grid}>
							{favorites.map((service) => (
								<ServiceCard
									key={service._id}
									service={service}
									variant="grid"
									saved
									detailHref={{ pathname: '/service/detail', query: { id: service._id, returnTo: '/service' } }}
									pending={pendingIds.includes(service._id)}
									onLike={removeFavoriteHandler}
								/>
							))}
						</div>
					) : (
						<div className={styles.state}>
							<FiHeart size={30} aria-hidden="true" />
							<h3>No favorite services yet</h3>
							<p>Explore services and save the ones you want to revisit.</p>
							<Link href="/service" className={styles.textLink}>Explore services</Link>
						</div>
					)}
					{total !== undefined && <p className={styles.total}>{total} favorite {total === 1 ? 'service' : 'services'}</p>}
					<ServicePagination page={page} totalPages={totalPages} onChange={(nextPage) => void changePageHandler(nextPage)} />
				</>
			)}
		</section>
	);
};

const MyServiceFavorites = () => {
	const user = useReactiveVar(userVar);
	return <FavoriteServicesPanel key={user._id} memberId={user._id} />;
};

export default MyServiceFavorites;
