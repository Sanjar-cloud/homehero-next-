import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { Dialog } from '@mui/material';
import { FiChevronRight, FiFilter, FiMapPin, FiSearch, FiX } from 'react-icons/fi';
import { GET_SERVICES } from '../../apollo/user/service.query';
import { LIKE_TARGET_SERVICE } from '../../apollo/user/service.mutation';
import { userVar } from '../../apollo/store';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import { Button, Input } from '../../libs/components/homehero/UI';
import ServiceCard from '../../libs/components/service/ServiceCard';
import ServiceFilter, {
	emptyFilters,
	label,
	listingInput,
	listingQuery,
	locations,
	parseListing,
	priceError,
	ServicePagination,
	sorts,
} from '../../libs/components/service/ServiceFilter';
import type { ListingState, ServiceFilters, SortKey } from '../../libs/components/service/ServiceFilter';
import styles from '../../scss/homehero/service.module.scss';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		...(await serverSideTranslations(locale || 'en', ['common'])),
	},
});

function ServiceListing() {
	const router = useRouter();
	const user = useReactiveVar(userVar);

	/** STATE AND URL VALUES **/
	const applied = useMemo(() => parseListing(router.query), [router.query]);
	const stateKey = JSON.stringify(applied);
	const navigation = useRef({ committed: applied, intended: applied, pending: false, sequence: 0 });
	const [draft, setDraft] = useState<ServiceFilters>(emptyFilters);
	const [clientReady, setClientReady] = useState(false);
	const [filterOpen, setFilterOpen] = useState(false);
	const [filterError, setFilterError] = useState('');
	const [actionError, setActionError] = useState('');
	const [pendingIds, setPendingIds] = useState<string[]>([]);
	const likeLocks = useRef(new Set<string>());
	const identity = useRef(user._id);
	const pageRef = useRef<HTMLDivElement>(null);
	const input = useMemo(() => listingInput(applied), [stateKey]);

	/** APOLLO REQUESTS **/
	const servicesQuery = useQuery(GET_SERVICES, {
		variables: { input },
		skip: !clientReady || !router.isReady,
		fetchPolicy: 'network-only',
		notifyOnNetworkStatusChange: true,
	});
	const [likeService] = useMutation(LIKE_TARGET_SERVICE);
	const total = servicesQuery.data?.getServices.metaCounter?.[0]?.total ?? 0;
	const totalPages = Math.ceil(total / 12);

	/** LIFECYCLES **/
	useEffect(() => {
		setClientReady(true);
	}, []);

	useEffect(() => {
		navigation.current.committed = applied;
		if (!navigation.current.pending) navigation.current.intended = applied;
		setDraft(applied);
		setFilterError('');
	}, [stateKey]);

	useEffect(() => {
		if (identity.current === user._id) return;
		identity.current = user._id;
		if (clientReady && router.isReady) {
			void servicesQuery.refetch().catch(() => setActionError('Unable to refresh favorites. Please retry.'));
		}
	}, [user._id, clientReady, router.isReady, servicesQuery.refetch]);

	useEffect(() => {
		if (!servicesQuery.loading && !servicesQuery.error && totalPages > 0 && applied.page > totalPages) {
			void router.replace(
				{ pathname: '/service', query: listingQuery({ ...applied, page: totalPages }) },
				undefined,
				{ shallow: true, scroll: false },
			);
		}
	}, [servicesQuery.loading, servicesQuery.error, totalPages, stateKey]);

	/** NAVIGATION AND FILTER HANDLERS **/
	const navigate = async (update: (latest: ListingState) => ListingState) => {
		// Compose rapid actions from the latest intent, before the URL transition finishes.
		const next = update(navigation.current.intended);
		const sequence = ++navigation.current.sequence;
		navigation.current.intended = next;
		navigation.current.pending = true;

		try {
			const completed = await router.push(
				{ pathname: '/service', query: listingQuery(next) },
				undefined,
				{ shallow: true, scroll: false },
			);
			if (!completed && sequence === navigation.current.sequence) {
				navigation.current.intended = navigation.current.committed;
			}
		} catch {
			if (sequence === navigation.current.sequence) {
				navigation.current.intended = navigation.current.committed;
				setActionError('Unable to update filters. Please try again.');
			}
		} finally {
			if (sequence === navigation.current.sequence) navigation.current.pending = false;
		}
	};

	const apply = () => {
		const error = priceError(draft);
		setFilterError(error);
		if (error) return;
		setFilterOpen(false);
		void navigate((latest) => ({ ...draft, q: draft.q.trim(), sort: latest.sort, page: 1 }));
	};

	const clear = () => {
		setDraft(emptyFilters);
		setFilterError('');
		setFilterOpen(false);
		void navigate((latest) => ({ ...emptyFilters, sort: latest.sort, page: 1 }));
	};

	const closeFilters = () => {
		setFilterOpen(false);
		setDraft(applied);
		setFilterError('');
	};

	const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		apply();
	};

	const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
		const sort = event.target.value as SortKey;
		void navigate((latest) => ({ ...latest, sort, page: 1 }));
	};

	/** LIKE HANDLER **/
	const like = async (id: string) => {
		if (!user._id) {
			await router.push({ pathname: '/account/join', query: { view: 'login', referrer: router.asPath } });
			return;
		}
		if (likeLocks.current.has(id)) return;
		likeLocks.current.add(id);
		setPendingIds(Array.from(likeLocks.current));
		setActionError('');

		try {
			await likeService({ variables: { input: id } });
			try {
				await servicesQuery.refetch();
			} catch {
				setActionError('Favorite saved, but the list could not refresh. Please retry.');
			}
		} catch {
			setActionError('Unable to update this favorite. Please try again.');
		} finally {
			likeLocks.current.delete(id);
			setPendingIds(Array.from(likeLocks.current));
		}
	};

	/** RENDER VALUES **/
	const filters = (
		<ServiceFilter values={draft} onChange={setDraft} onApply={apply} onClear={clear} error={filterError} />
	);
	const priceLimited =
		applied.minPrice !== '' || applied.maxPrice !== '' || applied.sort === 'priceAsc' || applied.sort === 'priceDesc';
	const returnQuery = listingQuery(applied);
	const returnTo = `/service${Object.keys(returnQuery).length ? `?${new URLSearchParams(returnQuery)}` : ''}`;

	return (
		<div className={styles.listingPage} ref={pageRef}>
			<Head>
				<title>Services | HomeHero</title>
			</Head>
			<div className={styles.searchBanner}>
				<form className={`${styles.container} ${styles.compactSearch}`} onSubmit={handleSearchSubmit}>
					<div>
						<FiSearch size={20} aria-hidden="true" />
						<Input
							aria-label="Search service titles"
							value={draft.q}
							onChange={(event) => setDraft({ ...draft, q: event.target.value })}
							placeholder="What service do you need?"
						/>
					</div>
					<label className={styles.searchLocation}>
						<FiMapPin size={20} aria-hidden="true" />
						<select
							aria-label="Search location"
							value={draft.location}
							onChange={(event) => setDraft({ ...draft, location: event.target.value })}
						>
							<option value="">All locations</option>
							{locations.map((value) => (
								<option key={value} value={value}>{label(value)}</option>
							))}
						</select>
					</label>
					<Button type="submit">Search</Button>
				</form>
				{filterError && (
					<p className={`${styles.container} ${styles.error}`} role="alert">{filterError}</p>
				)}
			</div>
			<div className={`${styles.container} ${styles.breadcrumbs}`}>
				<Link href="/">Home</Link>
				<FiChevronRight />
				<span>Services</span>
			</div>
			<div className={`${styles.container} ${styles.resultsLayout}`}>
				<div className={styles.desktopFilters}>{filters}</div>
				<section className={styles.results} aria-busy={servicesQuery.loading}>
					<div className={styles.resultsHeader}>
						<div>
							<h1>{applied.location ? `Home services in ${label(applied.location)}` : 'Home services'}</h1>
							<p>
								{servicesQuery.error
									? 'Service results unavailable'
									: servicesQuery.loading && !servicesQuery.data
										? 'Finding services…'
										: `${total} services found`}
							</p>
						</div>
						<div className={styles.sortWrap}>
							<button type="button" className={styles.mobileFilter} onClick={() => setFilterOpen(true)}>
								<FiFilter /> Filters
							</button>
							<label>
								Sort by:
								<select aria-label="Sort services" value={applied.sort} onChange={handleSortChange}>
									{Object.entries(sorts).map(([value, sort]) => (
										<option value={value} key={value}>{sort.title}</option>
									))}
								</select>
							</label>
						</div>
					</div>
					<div className={styles.activeFilters}>
						{(['q', 'category', 'location', 'minPrice', 'maxPrice'] as const)
							.filter((key) => applied[key])
							.map((key) => (
								<button
									type="button"
									key={key}
									onClick={() => void navigate((latest) => ({ ...latest, [key]: '', page: 1 }))}
								>
									{key === 'minPrice' ? `Min ₩${applied[key]}`
										: key === 'maxPrice' ? `Max ₩${applied[key]}`
											: key === 'q' ? applied[key] : label(applied[key])}
									<FiX aria-label={`Remove ${key} filter`} />
								</button>
							))}
					</div>
					{priceLimited && (
						<p className={styles.notice}>Price filters and price sorting show only services with a specified price.</p>
					)}
					{actionError && (
						<div role="alert" className={styles.error}>
							{actionError}{' '}
							<button
								type="button"
								onClick={() => void servicesQuery.refetch()
									.then(() => setActionError(''))
									.catch(() => setActionError('Unable to refresh. Please retry.'))}
							>
								Refresh
							</button>
						</div>
					)}
					{servicesQuery.error ? (
						<div className={styles.state} role="alert">
							<h2>Unable to load services</h2>
							<p>Please check your connection and try again.</p>
							<Button onClick={() => void servicesQuery.refetch().catch(() => {})}>Retry</Button>
						</div>
					) : !clientReady || !router.isReady || (servicesQuery.loading && !servicesQuery.data) ? (
						<div className={styles.state} role="status">Loading services…</div>
					) : (
						<>
							{servicesQuery.loading && <p role="status" className={styles.notice}>Updating services…</p>}
							<div className={styles.resultsList}>
								{servicesQuery.data?.getServices.list.map((service) => (
									<ServiceCard
										key={service._id}
										service={service}
										detailHref={{ pathname: '/service/detail', query: { id: service._id, returnTo } }}
										pending={pendingIds.includes(service._id)}
										onLike={like}
									/>
								))}
							</div>
							{!servicesQuery.data?.getServices.list.length && (
								<div className={styles.state}>
									<FiSearch size={30} />
									<h2>No matching services</h2>
									<p>Try a broader search or clear your filters.</p>
									<Button onClick={clear}>Clear filters</Button>
								</div>
							)}
							<ServicePagination
								page={applied.page}
								totalPages={totalPages}
								onChange={(page) => void navigate((latest) => ({ ...latest, page }))}
							/>
						</>
					)}
				</section>
			</div>
			<Dialog
				disablePortal
				container={() => pageRef.current}
				open={filterOpen}
				onClose={closeFilters}
				aria-labelledby="service-filter-heading"
				classes={{ paper: styles.filterSheet, container: styles.sheetContainer }}
				maxWidth={false}
			>
				<h2 id="service-filter-heading" className={styles.srOnly}>Service filters</h2>
				<span className={styles.sheetHandle} />
				<ServiceFilter
					values={draft}
					onChange={setDraft}
					onApply={apply}
					onClear={clear}
					onClose={closeFilters}
					error={filterError}
				/>
			</Dialog>
		</div>
	);
}

export default withLayoutHomeHero(ServiceListing);
