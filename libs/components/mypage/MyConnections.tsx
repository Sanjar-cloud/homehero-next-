import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { FiHeart, FiMapPin } from 'react-icons/fi';
import { GET_MY_PAGE_FOLLOWERS, GET_MY_PAGE_FOLLOWINGS } from '../../../apollo/user/my-page.query';
import type { MyPageConnection } from '../../../apollo/user/my-page.query';
import { LIKE_TARGET_MEMBER, SUBSCRIBE, UNSUBSCRIBE } from '../../../apollo/user/mutation';
import { userVar } from '../../../apollo/store';
import { Button } from '../homehero/UI';
import { ServiceImage } from '../service/ServiceCard';
import { ServicePagination, validPage } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/mypage.module.scss';

const MyConnections = ({ category }: { category: 'followers' | 'followings' }) => {
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const memberId = user._id;
	const page = validPage(router.query.page);
	const followers = category === 'followers';
	const input = { page, limit: 6, search: followers ? { followingId: memberId } : { followerId: memberId } };
	const [pendingIds, setPendingIds] = useState<string[]>([]);
	const [actionError, setActionError] = useState('');
	const mounted = useRef(true);
	const locks = useRef(new Set<string>());

	/** APOLLO REQUESTS **/
	const followersQuery = useQuery(GET_MY_PAGE_FOLLOWERS, {
		variables: { input }, skip: !followers || !router.isReady || !memberId,
		fetchPolicy: 'no-cache', context: { queryDeduplication: false }, notifyOnNetworkStatusChange: true,
	});
	const followingsQuery = useQuery(GET_MY_PAGE_FOLLOWINGS, {
		variables: { input }, skip: followers || !router.isReady || !memberId,
		fetchPolicy: 'no-cache', context: { queryDeduplication: false }, notifyOnNetworkStatusChange: true,
	});
	const [subscribe] = useMutation(SUBSCRIBE, { fetchPolicy: 'no-cache' });
	const [unsubscribe] = useMutation(UNSUBSCRIBE, { fetchPolicy: 'no-cache' });
	const [likeMember] = useMutation(LIKE_TARGET_MEMBER, { fetchPolicy: 'no-cache' });
	const query = followers ? followersQuery : followingsQuery;
	const result = followers ? followersQuery.data?.getMemberFollowers : followingsQuery.data?.getMemberFollowings;
	const rows = result?.list ?? [];
	const total = result?.metaCounter?.[0]?.total ?? (result?.metaCounter?.length === 0 ? 0 : undefined);
	const totalPages = total == null ? 0 : Math.ceil(total / 6);

	/** HANDLERS **/
	const changePageHandler = async (nextPage: number, replace = false) => {
		if (!mounted.current || userVar()._id !== memberId) return;
		const nextQuery = { ...router.query };
		if (nextPage === 1) delete nextQuery.page;
		else nextQuery.page = String(nextPage);
		try {
			await router[replace ? 'replace' : 'push']({ pathname: '/mypage', query: nextQuery }, undefined, { shallow: true, scroll: false });
		} catch {
			if (mounted.current && userVar()._id === memberId) setActionError('Unable to change page. Please try again.');
		}
	};

	const refreshHandler = async () => {
		if (!mounted.current || userVar()._id !== memberId) return;
		try {
			await query.refetch();
			if (mounted.current && userVar()._id === memberId) setActionError('');
		} catch {
			if (mounted.current && userVar()._id === memberId) setActionError('Unable to refresh connections. Please try again.');
		}
	};

	const connectionActionHandler = async (row: MyPageConnection, action: 'like' | 'follow') => {
		const target = followers ? row.followerData : row.followingData;
		if (!target || target._id === memberId || !mounted.current || userVar()._id !== memberId || locks.current.has(target._id)) return;
		locks.current.add(target._id);
		setPendingIds(Array.from(locks.current));
		setActionError('');
		try {
			const followed = row.meFollowed?.some((item) => item.myFollowing);
			const mutation = action === 'like' ? likeMember : followed ? unsubscribe : subscribe;
			await mutation({ variables: { input: target._id } });
			if (!mounted.current || userVar()._id !== memberId) return;
			await query.refetch();
		} catch {
			if (mounted.current && userVar()._id === memberId) setActionError('Unable to update or refresh this connection. Please retry.');
		} finally {
			locks.current.delete(target._id);
			if (mounted.current && userVar()._id === memberId) setPendingIds(Array.from(locks.current));
		}
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	useEffect(() => {
		if (!query.loading && !query.error && total != null && page > Math.max(1, totalPages)) {
			void changePageHandler(Math.max(1, totalPages), true);
		}
	}, [query.loading, query.error, total, totalPages, page]);

	return (
		<section aria-busy={query.loading}>
			<div className={styles.sectionHeading}>
				<h2>{followers ? 'Your followers' : 'Professionals you follow'}</h2>
				<p>{followers ? 'People who want to keep up with your services.' : 'Your network of local specialists.'}</p>
			</div>
			{actionError && <div className={styles.error} role="alert">{actionError} <Button variant="secondary" onClick={() => void refreshHandler()}>Refresh</Button></div>}
			{query.error ? (
				<div className={styles.state} role="alert">
					<h3>Unable to load connections</h3>
					<Button variant="secondary" onClick={() => void refreshHandler()}>Retry connections</Button>
				</div>
			) : query.loading ? (
				<div className={styles.state} role="status">Loading connections…</div>
			) : (
				<>
					{rows.length ? (
						<div className={followers ? '' : styles.connections}>
							{rows.map((row) => {
								const target = followers ? row.followerData : row.followingData;
								if (!target) return <div className={styles.state} key={row._id}>Member unavailable</div>;
								const name = target.memberFullName || target.memberNick;
								const liked = row.meLiked?.some((item) => item.myFavorite) ?? false;
								const followed = row.meFollowed?.some((item) => item.myFollowing) ?? false;
								const date = new Date(row.createdAt);
								return (
									<article className={followers ? styles.follower : styles.connection} key={row._id}>
										{!followers && <div className={styles.connectionCover} aria-hidden="true" />}
										{followers && <ServiceImage path={target.memberImage} alt={name} avatar className={styles.miniAvatar} />}
										<div className={followers ? undefined : styles.connectionBody}>
											{!followers && <ServiceImage path={target.memberImage} alt={name} avatar className={styles.connectionAvatar} />}
											<h3><Link href={{ pathname: '/member', query: { memberId: target._id } }}>{name}</Link></h3>
											{target.memberAddress && <p><FiMapPin size={12} aria-hidden="true" /> {target.memberAddress}</p>}
											{!followers && target.memberDesc && <p>{target.memberDesc}</p>}
											{!followers && (
												<div className={styles.connectionStats}>
													<span><strong>{target.memberServices}</strong><small>Services</small></span>
													<span><strong>{target.memberFollowers}</strong><small>Followers</small></span>
													<span><strong>{target.memberLikes}</strong><small>Likes</small></span>
												</div>
											)}
											{followers && Number.isFinite(date.getTime()) && <small>Following since {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</small>}
											{target._id !== memberId && (
												<div className={styles.connectionActions}>
													<Button variant="secondary" disabled={pendingIds.includes(target._id)} onClick={() => void connectionActionHandler(row, 'follow')}>{followed ? 'Unfollow' : 'Follow'}</Button>
													<Button variant="secondary" aria-label={liked ? 'Unlike member' : 'Like member'} aria-pressed={liked} disabled={pendingIds.includes(target._id)} onClick={() => void connectionActionHandler(row, 'like')}><FiHeart fill={liked ? 'currentColor' : 'none'} /> {target.memberLikes}</Button>
												</div>
											)}
										</div>
										{followers && <Link href="/chat" className={styles.textLink}>Message</Link>}
									</article>
								);
							})}
						</div>
					) : <div className={styles.state}><h3>No {category} yet</h3><Link href="/agent" className={styles.textLink}>Find Pros</Link></div>}
					{total != null && <p className={styles.total}>{total} {category}</p>}
					<ServicePagination page={page} totalPages={totalPages} onChange={(nextPage) => void changePageHandler(nextPage)} />
				</>
			)}
		</section>
	);
};

export default MyConnections;
