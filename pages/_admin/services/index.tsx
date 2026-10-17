import React, { useEffect, useRef, useState } from 'react';
import { useApolloClient, useReactiveVar } from '@apollo/client';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import ServiceList from '../../../libs/components/admin/services/ServiceList';
import { GET_ALL_SERVICES_BY_ADMIN } from '../../../apollo/admin/service.query';
import { UPDATE_SERVICE_BY_ADMIN } from '../../../apollo/admin/service.mutation';
import { userVar } from '../../../apollo/store';
import { getJwtToken } from '../../../libs/auth';
import { MemberStatus, MemberType } from '../../../libs/enums/member.enum';
import { Direction } from '../../../libs/enums/common.enum';
import { ServiceLocation, ServiceStatus } from '../../../libs/enums/service.enum';
import { sweetConfirmAlert } from '../../../libs/sweetAlert';
import type { AllServicesInquiry } from '../../../libs/types/service/service.input';
import type { Service } from '../../../libs/types/service/service';
import styles from '../../../scss/homehero/admin.module.scss';

const ServiceListPage = () => {
	const user = useReactiveVar(userVar);
	const token = getJwtToken();
	const allowed = user._id && token && user.memberType === MemberType.ADMIN
		&& user.memberStatus === MemberStatus.ACTIVE;

	if (!allowed) {
		return <Alert severity="info">An active administrator session is required.</Alert>;
	}

	return <ServicesPanel key={`${user._id}:${token}`} />;
};

const ServicesPanel = () => {
	const client = useApolloClient();
	const sessionUser = userVar()._id;
	const sessionToken = getJwtToken();
	const mounted = useRef(true);
	const requestId = useRef(0);
	const mutationLock = useRef(false);
	const [input, setInput] = useState<AllServicesInquiry>({
		page: 1,
		limit: 10,
		sort: 'createdAt',
		direction: Direction.DESC,
		search: {},
	});
	const [rows, setRows] = useState<Service[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [revision, setRevision] = useState(0);
	const [error, setError] = useState('');
	const [feedback, setFeedback] = useState('');

	const isCurrentSession = () => {
		const current = userVar();
		return mounted.current && current._id === sessionUser && getJwtToken() === sessionToken
			&& current.memberType === MemberType.ADMIN && current.memberStatus === MemberStatus.ACTIVE;
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			requestId.current += 1;
		};
	}, []);

	useEffect(() => {
		const currentRequest = ++requestId.current;
		setLoading(true);
		setRows([]);
		setTotal(0);
		setError('');
		client.query({
			query: GET_ALL_SERVICES_BY_ADMIN,
			variables: { input },
			fetchPolicy: 'no-cache',
			context: { queryDeduplication: false },
		}).then(({ data }) => {
			if (!isCurrentSession() || currentRequest !== requestId.current) return;
			const result = data.getAllServicesByAdmin;
			const count = result.metaCounter?.[0]?.total ?? 0;
			if (input.page > 1 && (input.page - 1) * input.limit >= count) {
				setInput((previous) => ({
					...previous,
					page: Math.max(1, Math.ceil(count / previous.limit)),
				}));
				return;
			}
			setRows(result.list);
			setTotal(count);
		}).catch(() => {
			if (isCurrentSession() && currentRequest === requestId.current) {
				setError('Services could not be loaded. Check the API connection and try Refresh.');
			}
		}).finally(() => {
			if (isCurrentSession() && currentRequest === requestId.current) setLoading(false);
		});
	}, [client, input, revision]);

	/** HANDLERS **/
	const refreshHandler = () => {
		if (mutationLock.current) return;
		setFeedback('');
		setRevision((value) => value + 1);
	};

	const filterHandler = (field: 'status' | 'location' | 'direction', value: string) => {
		if (mutationLock.current) return;
		setFeedback('');
		setInput((previous) => ({
			...previous,
			page: 1,
			direction: field === 'direction' ? value as Direction : previous.direction,
			search: {
				...previous.search,
				...(field === 'status' ? { serviceStatus: value ? value as ServiceStatus : undefined } : {}),
				...(field === 'location' ? { serviceLocationList: value ? [value as ServiceLocation] : undefined } : {}),
			},
		}));
	};

	const paginationHandler = (page: number, limit: number) => {
		if (mutationLock.current) return;
		setInput((previous) => ({ ...previous, page, limit }));
	};

	const statusHandler = async (service: Service, status: ServiceStatus) => {
		const validTransition = service.serviceStatus === ServiceStatus.ACTIVE
			? status === ServiceStatus.PAUSED || status === ServiceStatus.DELETE
			: service.serviceStatus === ServiceStatus.PAUSED
				&& (status === ServiceStatus.ACTIVE || status === ServiceStatus.DELETE);
		if (mutationLock.current || loading || !isCurrentSession() || !validTransition
			|| !/^[a-f\d]{24}$/i.test(service._id) || !rows.includes(service)) return;

		mutationLock.current = true;
		setSaving(true);
		setError('');
		setFeedback('');
		try {
			if (status === ServiceStatus.DELETE) {
				const confirmed = await sweetConfirmAlert(`Delete “${service.serviceTitle}”? This service cannot be reactivated.`);
				if (!confirmed || !isCurrentSession()) return;
			}
			const { data } = await client.mutate({
				mutation: UPDATE_SERVICE_BY_ADMIN,
				variables: { input: { _id: service._id, serviceStatus: status } },
				fetchPolicy: 'no-cache',
			});
			if (!isCurrentSession()) return;
			if (data?.updateServiceByAdmin?._id !== service._id
				|| data.updateServiceByAdmin.serviceStatus !== status) {
				throw new Error('Unconfirmed status update');
			}
			setFeedback('Service status updated.');
			setRevision((value) => value + 1);
		} catch {
			if (isCurrentSession()) {
				setError('Status change was not confirmed. Refresh to check the current status before retrying.');
			}
		} finally {
			mutationLock.current = false;
			if (isCurrentSession()) setSaving(false);
		}
	};

	return (
		<div className="content">
			<Box className={`table-wrap ${styles.services}`}>
				<div className={styles.serviceHeading}>
					<Typography component="h2" variant="h5">Services Management</Typography>
					<Button variant="outlined" disabled={loading || saving} onClick={refreshHandler}>Refresh</Button>
				</div>
				<Stack className={styles.serviceFilters}>
					<TextField
						select
						label="Status"
						value={input.search.serviceStatus || ''}
						disabled={saving}
						SelectProps={{ displayEmpty: true }}
						InputLabelProps={{ shrink: true }}
						onChange={(event) => filterHandler('status', event.target.value)}
					>
						<MenuItem value="">All statuses</MenuItem>
						<MenuItem value={ServiceStatus.ACTIVE}>Active</MenuItem>
						<MenuItem value={ServiceStatus.PAUSED}>Paused</MenuItem>
						<MenuItem value={ServiceStatus.DELETE}>Deleted</MenuItem>
					</TextField>
					<TextField
						select
						label="Location"
						value={input.search.serviceLocationList?.[0] || ''}
						disabled={saving}
						SelectProps={{ displayEmpty: true }}
						InputLabelProps={{ shrink: true }}
						onChange={(event) => filterHandler('location', event.target.value)}
					>
						<MenuItem value="">All locations</MenuItem>
						{Object.values(ServiceLocation).map((location) => (
							<MenuItem key={location} value={location}>{location}</MenuItem>
						))}
					</TextField>
					<TextField
						select label="Sort by" value={input.direction} disabled={saving}
						onChange={(event) => filterHandler('direction', event.target.value)}
					>
						<MenuItem value={Direction.DESC}>Newest</MenuItem>
						<MenuItem value={Direction.ASC}>Oldest</MenuItem>
					</TextField>
				</Stack>
				{error && <Alert severity="error">{error}</Alert>}
				{feedback && <Alert severity="success">{feedback}</Alert>}
				<ServiceList
					rows={rows}
					total={total}
					page={input.page}
					limit={input.limit}
					loading={loading}
					saving={saving}
					error={Boolean(error)}
					onStatus={statusHandler}
					onPagination={paginationHandler}
				/>
			</Box>
		</div>
	);
};

export default withAdminLayout(ServiceListPage);
