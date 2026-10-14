import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useApolloClient, useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FiSearch } from 'react-icons/fi';
import { GET_AGENT_FOLLOWING_IDS, GET_PUBLIC_AGENTS } from '../../apollo/user/agent.query';
import type { PublicAgent } from '../../apollo/user/agent.query';
import { SUBSCRIBE, UNSUBSCRIBE } from '../../apollo/user/mutation';
import { userVar } from '../../apollo/store';
import { getJwtToken } from '../../libs/auth';
import { Direction } from '../../libs/enums/common.enum';
import type { AgentsInquiry } from '../../libs/types/member/member.input';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import AgentCard from '../../libs/components/agent/AgentCard';
import { Button, Input } from '../../libs/components/homehero/UI';
import { ServicePagination } from '../../libs/components/service/ServiceFilter';
import styles from '../../scss/homehero/agent.module.scss';

export const getStaticProps = async ({ locale }: { locale: string }) => ({
	props: { ...(await serverSideTranslations(locale, ['common'])) },
});

export function parseAgentInput(value: string | string[] | undefined): AgentsInquiry {
	const fallback: AgentsInquiry = { page: 1, limit: 12, sort: 'createdAt', direction: Direction.DESC, search: {} };
	if (typeof value !== 'string') return fallback;
	try {
		const input = JSON.parse(value);
		return {
			page: Number.isSafeInteger(input?.page) && input.page > 0 && input.page <= 2147483647 ? input.page : 1,
			limit: Number.isSafeInteger(input?.limit) && input.limit > 0 && input.limit <= 24 ? input.limit : 12,
			sort: ['createdAt', 'memberLikes', 'memberViews'].includes(input?.sort) ? input.sort : 'createdAt',
			direction: input?.sort === 'createdAt' && input.direction === Direction.ASC ? Direction.ASC : Direction.DESC,
			search: typeof input?.search?.text === 'string' && input.search.text.trim() ? { text: input.search.text.trim() } : {},
		};
	} catch { return fallback; }
}

interface AgentListProps {
	memberId: string;
	token: string;
	active: boolean;
}

const AgentList = ({ memberId, token, active }: AgentListProps) => {
	const router = useRouter();
	const client = useApolloClient();
	const input = parseAgentInput(router.query.input);
	const [search, setSearch] = useState(input.search.text || '');
	const [followingIds, setFollowingIds] = useState<string[]>([]);
	const [followReady, setFollowReady] = useState(!memberId);
	const [followError, setFollowError] = useState('');
	const [pendingId, setPendingId] = useState('');
	const [navigationError, setNavigationError] = useState('');
	const mounted = useRef(false);
	const mutationLock = useRef(false);
	const followingRequest = useRef(0);
	const latestInput = useRef({ route: router.query.input, input });
	if (latestInput.current.route !== router.query.input) latestInput.current = { route: router.query.input, input };
	const currentAccount = () => mounted.current && userVar()._id === memberId && (getJwtToken() || '') === token;

	/** APOLLO REQUESTS **/
	const [subscribe] = useMutation(SUBSCRIBE, { fetchPolicy: 'no-cache' });
	const [unsubscribe] = useMutation(UNSUBSCRIBE, { fetchPolicy: 'no-cache' });
	const agentsQuery = useQuery(GET_PUBLIC_AGENTS, {
		variables: { input: { ...input, search: input.search.text ? { text: input.search.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } : {} } },
		skip: !router.isReady,
		fetchPolicy: 'no-cache',
		context: { queryDeduplication: false },
		notifyOnNetworkStatusChange: true,
	});
	const agents = agentsQuery.data?.getAgents.list.filter((agent) => agent.memberType === 'AGENT' && agent.memberStatus === 'ACTIVE') ?? [];
	const counter = agentsQuery.data?.getAgents.metaCounter;
	const total = counter?.[0]?.total ?? (counter?.length === 0 ? 0 : undefined);
	const totalPages = total == null ? 0 : Math.ceil(total / input.limit);

	/** HANDLERS **/
	const changeInputHandler = async (changes: Partial<AgentsInquiry>, replace = false) => {
		const next = { ...latestInput.current.input, ...changes };
		latestInput.current.input = next;
		try {
			await router[replace ? 'replace' : 'push']({ pathname: '/agent', query: { ...router.query, input: JSON.stringify(next) } }, undefined, { shallow: true, scroll: false });
			if (mounted.current) setNavigationError('');
		} catch {
			latestInput.current.input = parseAgentInput(router.query.input);
			if (mounted.current) setNavigationError('Unable to update the search. Please try again.');
		}
	};

	const loadFollowings = async () => {
		if (!currentAccount() || !memberId || !active) return;
		const request = ++followingRequest.current;
		setFollowReady(false);
		setFollowError('');
		try {
			const ids: string[] = [];
			let page = 1;
			let pages = 1;
			while (page <= pages) {
				const result = await client.query({
					query: GET_AGENT_FOLLOWING_IDS,
					variables: { input: { page, limit: 100, search: { followerId: memberId } } },
					fetchPolicy: 'no-cache',
					context: { queryDeduplication: false },
				});
				if (!currentAccount() || request !== followingRequest.current) return;
				const data = result.data.getMemberFollowings;
				if (data.list.some((row) => row.followerId !== memberId)) throw new Error('Following unavailable');
				ids.push(...data.list.map((row) => row.followingId));
				const total = data.metaCounter?.[0]?.total ?? (data.metaCounter?.length === 0 ? 0 : undefined);
				if (total == null) throw new Error('Following unavailable');
				pages = Math.ceil(total / 100);
				page++;
			}
			setFollowingIds(ids);
			setFollowReady(true);
		} catch {
			if (currentAccount() && request === followingRequest.current) setFollowError('Unable to confirm your following status. Please retry.');
		}
	};

	const followHandler = async (agent: PublicAgent) => {
		if (!memberId) {
			try { await router.push({ pathname: '/account/join', query: { view: 'login', referrer: router.asPath } }); }
			catch { if (mounted.current) setNavigationError('Unable to open login. Please try again.'); }
			return;
		}
		if (!currentAccount() || !active || !followReady || mutationLock.current || agent._id === memberId) return;
		mutationLock.current = true;
		setPendingId(agent._id);
		setFollowError('');
		const followed = followingIds.includes(agent._id);
		try {
			const result = await (followed ? unsubscribe : subscribe)({ variables: { input: agent._id } });
			if (!currentAccount()) return;
			const record = followed ? result.data?.unsubscribe : result.data?.subscribe;
			if (record?.followerId !== memberId || record?.followingId !== agent._id) throw new Error('Following unavailable');
			setFollowingIds((ids) => followed ? ids.filter((id) => id !== agent._id) : [...ids, agent._id]);
			await agentsQuery.refetch();
		} catch {
			if (currentAccount()) {
				setFollowReady(false);
				setFollowError('Unable to confirm the update. Retry following status before trying again.');
			}
		} finally {
			mutationLock.current = false;
			if (currentAccount()) setPendingId('');
		}
	};

	const searchHandler = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void changeInputHandler({ page: 1, search: search.trim() ? { text: search.trim() } : {} });
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		void loadFollowings();
		return () => { mounted.current = false; followingRequest.current++; };
	}, []);
	useEffect(() => { setSearch(input.search.text || ''); }, [input.search.text]);
	useEffect(() => {
		if (total != null && agentsQuery.data && !agentsQuery.loading && input.page > Math.max(1, totalPages)) void changeInputHandler({ page: Math.max(1, totalPages) }, true);
	}, [agentsQuery.data, agentsQuery.loading, input.page, totalPages, total]);

	return (
		<div className={styles.page}>
			<Head><title>Find Pros | HomeHero</title></Head>
			<section className={styles.hero}>
				<div className={styles.container}>
					<span className={styles.eyebrow}>Meet the professionals</span>
					<h1>Find a pro you can trust</h1>
					<p>Explore local service providers, see their work, and connect directly.</p>
					<form className={styles.search} onSubmit={searchHandler}>
						<FiSearch size={20} aria-hidden="true" />
						<Input aria-label="Search professionals" placeholder="Search pros by nickname" value={search} onChange={(event) => setSearch(event.target.value)} />
						<Button type="submit">Search</Button>
					</form>
				</div>
			</section>
			<section className={`${styles.container} ${styles.results}`}>
				<div className={styles.toolbar}>
					<div><h2>Professionals</h2><p>{agentsQuery.loading ? 'Loading professionals…' : agentsQuery.error ? 'Results unavailable' : total == null ? 'Browse professionals' : `${total} professionals found`}</p></div>
					<label>Sort by:
						<select aria-label="Sort professionals" value={`${input.sort}:${input.direction}`} onChange={(event) => {
							const [sort, direction] = event.target.value.split(':');
							void changeInputHandler({ page: 1, sort, direction: direction as Direction });
						}}>
							<option value="createdAt:DESC">Newest</option>
							<option value="createdAt:ASC">Oldest</option>
							<option value="memberLikes:DESC">Most liked</option>
							<option value="memberViews:DESC">Most viewed</option>
						</select>
					</label>
				</div>
				{navigationError && <p role="alert" className={styles.error}>{navigationError}</p>}
				{followError && <div role="alert" className={styles.error}><p>{followError}</p><Button variant="secondary" disabled={!!pendingId} onClick={() => void loadFollowings()}>Retry following status</Button></div>}
				{agentsQuery.error ? (
					<div className={styles.state} role="alert"><p>Unable to load professionals.</p><Button variant="secondary" onClick={() => void agentsQuery.refetch().catch(() => setNavigationError('Unable to reload professionals.'))}>Retry</Button></div>
				) : agentsQuery.loading || !router.isReady ? (
					<div className={styles.state} role="status">Loading professionals…</div>
				) : !agents.length ? (
					<div className={styles.state}><FiSearch size={24} /><h3>No professionals found</h3><p>Try searching for another nickname.</p><Button variant="secondary" onClick={() => { setSearch(''); void changeInputHandler({ page: 1, search: {} }); }}>Clear search</Button></div>
				) : (
					<>
						<div className={styles.grid}>
							{agents.map((agent) => (
								<AgentCard
									key={agent._id}
									agent={agent}
									following={followingIds.includes(agent._id)}
									pending={!!pendingId}
									followReady={!memberId || active && followReady}
									self={agent._id === memberId}
									onFollow={(target) => void followHandler(target)}
								/>
							))}
						</div>
						<ServicePagination page={input.page} totalPages={totalPages} onChange={(page) => void changeInputHandler({ page })} />
					</>
				)}
			</section>
		</div>
	);
};

const AgentPage = () => {
	const user = useReactiveVar(userVar);
	const token = getJwtToken() || '';
	return (
		<AgentList
			key={`${user._id}:${token}:${user.memberStatus}`}
			memberId={user._id}
			token={token}
			active={!!token && user.memberStatus === 'ACTIVE'}
		/>
	);
};

export default withLayoutHomeHero(AgentPage);
