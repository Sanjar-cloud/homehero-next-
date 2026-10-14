import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { FiEdit3, FiEye, FiImage, FiPauseCircle, FiPlus, FiTool, FiTrash2 } from 'react-icons/fi';
import { userVar } from '../../../apollo/store';
import { GET_AGENT_SERVICES } from '../../../apollo/user/service.query';
import { UPDATE_SERVICE } from '../../../apollo/user/service.mutation';
import { Direction } from '../../enums/common.enum';
import { ServiceStatus } from '../../enums/service.enum';
import type { Service } from '../../types/service/service';
import { Button } from '../homehero/UI';
import { formatPrice, imageUrl } from '../service/ServiceCard';
import { label, ServicePagination, validPage } from '../service/ServiceFilter';
import AddNewService from './AddNewService';
import styles from '../../../scss/homehero/service-management.module.scss';

const MyServices = () => {
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const memberId = user._id;
	const page = validPage(router.query.page);
	const [editing, setEditing] = useState<Service | null>(null);
	const [pendingIds, setPendingIds] = useState<string[]>([]);
	const [actionError, setActionError] = useState('');
	const [success, setSuccess] = useState('');
	const locks = useRef(new Set<string>());
	const mounted = useRef(true);
	const isCurrentAgent = () => mounted.current && userVar()._id === memberId && userVar().memberType === 'AGENT';

	/** APOLLO REQUESTS **/
	const servicesQuery = useQuery(GET_AGENT_SERVICES, {
		variables: { input: { page, limit: 6, sort: 'createdAt', direction: Direction.DESC, search: {} } },
		skip: !router.isReady || !memberId || user.memberType !== 'AGENT',
		fetchPolicy: 'no-cache',
		context: { queryDeduplication: false },
		notifyOnNetworkStatusChange: true,
	});
	const [updateService] = useMutation(UPDATE_SERVICE, { fetchPolicy: 'no-cache' });
	const result = servicesQuery.data?.getAgentServices;
	const services = result?.list.filter((service) => service.memberId === memberId) ?? [];
	const total = result?.metaCounter?.[0]?.total ?? (result?.metaCounter?.length === 0 ? 0 : undefined);
	const totalPages = total === undefined ? 0 : Math.ceil(total / 6);

	/** HANDLERS **/
	const changePageHandler = async (nextPage: number, replace = false) => {
		if (!isCurrentAgent()) return;
		const query: typeof router.query = { ...router.query, category: 'myServices' };
		if (nextPage === 1) delete query.page;
		else query.page = String(nextPage);
		try {
			await router[replace ? 'replace' : 'push']({ pathname: '/mypage', query }, undefined, { shallow: true, scroll: false });
		} catch {
			if (isCurrentAgent()) setActionError('Unable to change page. Please try again.');
		}
	};

	const refreshHandler = async () => {
		if (!isCurrentAgent()) return;
		try {
			await servicesQuery.refetch();
			if (isCurrentAgent()) setActionError('');
		} catch {
			if (isCurrentAgent()) setActionError('Unable to refresh your services. Please retry.');
		}
	};

	const statusHandler = async (service: Service, status: ServiceStatus) => {
		if (!isCurrentAgent() || service.memberId !== memberId || locks.current.has(service._id)) return;
		if (status === ServiceStatus.DELETE &&
			!window.confirm('Delete this service? It will be removed from your listings. This action cannot be undone here.')) {
			return;
		}
		locks.current.add(service._id);
		setPendingIds(Array.from(locks.current));
		setActionError('');
		setSuccess('');
		try {
			const response = await updateService({ variables: { input: { _id: service._id, serviceStatus: status } } });
			const saved = response.data?.updateService;
			if (saved?._id !== service._id || saved.memberId !== memberId || saved.serviceStatus !== status) {
				throw new Error('Invalid response');
			}
			if (!isCurrentAgent()) return;
			setSuccess(status === ServiceStatus.DELETE ? 'Service deleted.' : status === ServiceStatus.PAUSED ? 'Service paused.' : 'Service activated.');
			try {
				await servicesQuery.refetch();
			} catch {
				if (isCurrentAgent()) setActionError('Service updated, but the list could not refresh. Please retry loading.');
			}
		} catch {
			if (isCurrentAgent()) setActionError('Unable to confirm the update. Refresh your services before trying again.');
		} finally {
			locks.current.delete(service._id);
			if (isCurrentAgent()) setPendingIds(Array.from(locks.current));
		}
	};

	const editSavedHandler = async () => {
		if (!isCurrentAgent()) return;
		await servicesQuery.refetch();
		if (isCurrentAgent()) {
			setEditing(null);
			setSuccess('Service updated successfully.');
		}
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	useEffect(() => {
		setEditing(null);
	}, [page]);

	useEffect(() => {
		if (!servicesQuery.loading && !servicesQuery.error && total !== undefined && page > Math.max(1, totalPages)) {
			void changePageHandler(Math.max(1, totalPages), true);
		}
	}, [servicesQuery.loading, servicesQuery.error, total, totalPages, page]);

	if (!memberId || user.memberType !== 'AGENT') return <p role="alert">This destination is for service providers.</p>;
	if (editing) {
		return (
			<AddNewService
				key={`${memberId}:${editing._id}`}
				service={editing}
				onSaved={editSavedHandler}
				onCancel={() => setEditing(null)}
			/>
		);
	}

	return (
		<section className={styles.panel} aria-busy={servicesQuery.loading}>
			<div className={styles.listHeading}>
				<div className={styles.heading}>
					<h2>My services</h2>
					<p>Manage listings and track how customers engage with them.</p>
				</div>
				<Link href="/mypage?category=addService" className={styles.addLink}><FiPlus />Add service</Link>
			</div>
			{success && (
				<p className={styles.success} role="status">{success}</p>
			)}
			{actionError && (
				<p className={styles.error} role="alert">
					{actionError}
					<Button variant="secondary" onClick={() => void refreshHandler()}>Refresh services</Button>
				</p>
			)}
			{servicesQuery.error ? (
				<div className={styles.state} role="alert">
					<h3>Unable to load your services</h3>
					<p>Please retry or log in again.</p>
					<Button variant="secondary" onClick={() => void refreshHandler()}>Retry</Button>
					<Link href={{ pathname: '/account/join', query: { view: 'login', referrer: router.asPath } }}>Log in</Link>
				</div>
			) : servicesQuery.loading ? (
				<div className={styles.state} role="status">Loading your services…</div>
			) : services.length ? (
				<>
					<div className={styles.table}>
						<div className={styles.tableHead}>
							<span>Service</span>
							<span>Status</span>
							<span>Views</span>
							<span>Likes</span>
							<span>Comments</span>
							<span>Actions</span>
						</div>
						{services.map((service) => (
							<div className={styles.tableRow} key={service._id}>
								<div className={styles.listing}>
									{service.serviceImages[0] ? <img src={imageUrl(service.serviceImages[0])} alt="" /> : <FiImage size={32} aria-hidden="true" />}
									<div>
										<strong>{service.serviceTitle}</strong>
										<small>{label(service.serviceCategory)} · {formatPrice(service.servicePrice)}</small>
									</div>
								</div>
								<span className={`${styles.status} ${service.serviceStatus === ServiceStatus.PAUSED ? styles.paused : ''}`}>{label(service.serviceStatus)}</span>
								<span className={styles.metric}>
									<small>Views</small>
									{service.serviceViews}
								</span>
								<span className={styles.metric}>
									<small>Likes</small>
									{service.serviceLikes}
								</span>
								<span className={styles.metric}>
									<small>Comments</small>
									{service.serviceComments}
								</span>
								<div className={styles.rowActions}>
									<button
										disabled={pendingIds.includes(service._id)}
										onClick={() => {
											setSuccess('');
											setActionError('');
											setEditing(service);
										}}
									><FiEdit3 />Edit</button>
									<button disabled={pendingIds.includes(service._id)} onClick={() => void statusHandler(service, service.serviceStatus === ServiceStatus.ACTIVE ? ServiceStatus.PAUSED : ServiceStatus.ACTIVE)}>
										{service.serviceStatus === ServiceStatus.ACTIVE ? <FiPauseCircle /> : <FiEye />}
										{service.serviceStatus === ServiceStatus.ACTIVE ? 'Pause' : 'Activate'}
									</button>
									<button
										className={styles.delete}
										disabled={pendingIds.includes(service._id)}
										onClick={() => void statusHandler(service, ServiceStatus.DELETE)}
									><FiTrash2 />Delete</button>
								</div>
							</div>
						))}
					</div>
					{total !== undefined && (
						<p className={styles.total}>
							{total}{' '}
							{total === 1 ? 'service' : 'services'}
						</p>
					)}
					<ServicePagination
						page={page}
						totalPages={totalPages}
						onChange={(nextPage) => void changePageHandler(nextPage)}
					/>
				</>
			) : (
				<div className={styles.state}>
					<FiTool size={30} aria-hidden="true" />
					<h3>No services yet</h3>
					<p>Publish your first service to start reaching customers.</p>
					<Link href="/mypage?category=addService" className={styles.addLink}>Add a service</Link>
				</div>
			)}
		</section>
	);
};

export default MyServices;
