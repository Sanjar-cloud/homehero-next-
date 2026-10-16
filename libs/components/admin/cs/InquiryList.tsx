import React, { useEffect, useRef, useState } from 'react';
import { useApolloClient, useReactiveVar } from '@apollo/client';
import {
	Alert, Box, Button, Stack, Tab, Tabs, Table, TableBody, TableCell, TableContainer,
	TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import { userVar } from '../../../../apollo/store';
import { GET_SUPPORT_REQUESTS_BY_ADMIN } from '../../../../apollo/admin/support.query';
import { REPLY_SUPPORT_REQUEST } from '../../../../apollo/admin/support.mutation';
import { getJwtToken } from '../../../auth';
import { MemberStatus, MemberType } from '../../../enums/member.enum';
import { SupportRequestStatus } from '../../../enums/support.enum';
import type { SupportRequest } from '../../../types/support/support';

export const InquiryList = () => {
	const user = useReactiveVar(userVar);
	const token = getJwtToken();
	const allowed = user._id && user.memberType === MemberType.ADMIN && user.memberStatus === MemberStatus.ACTIVE && token;

	if (!allowed) {
		return <Alert severity="info">An active administrator session is required.</Alert>;
	}

	return <SupportRequestsPanel key={`${user._id}:${token}`} />;
};

const SupportRequestsPanel = () => {
	const client = useApolloClient();
	const sessionUser = userVar()._id;
	const sessionToken = getJwtToken();
	const mounted = useRef(true);
	const requestId = useRef(0);
	const mutationLock = useRef(false);
	const [rows, setRows] = useState<SupportRequest[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [limit, setLimit] = useState(10);
	const [status, setStatus] = useState(SupportRequestStatus.OPEN);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [revision, setRevision] = useState(0);
	const [selected, setSelected] = useState<SupportRequest | null>(null);
	const [reply, setReply] = useState('');
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
			query: GET_SUPPORT_REQUESTS_BY_ADMIN,
			variables: { input: { page: page + 1, limit, status } },
			fetchPolicy: 'no-cache',
			context: { queryDeduplication: false },
		}).then(({ data }) => {
			if (!isCurrentSession() || currentRequest !== requestId.current) return;
			const result = data.getSupportRequestsByAdmin;
			const count = result.metaCounter[0]?.total ?? 0;
			if (page > 0 && page * limit >= count) {
				setPage(Math.max(0, Math.ceil(count / limit) - 1));
				return;
			}
			setRows(result.list);
			setTotal(count);
		}).catch(() => {
			if (isCurrentSession() && currentRequest === requestId.current) {
				setError('Support requests could not be loaded. Check the API connection and try Refresh.');
			}
		}).finally(() => {
			if (isCurrentSession() && currentRequest === requestId.current) setLoading(false);
		});
	}, [client, page, limit, status, revision]);

	/** HANDLERS **/
	const refreshHandler = () => setRevision((value) => value + 1);

	const statusHandler = (_: React.SyntheticEvent, value: SupportRequestStatus) => {
		if (mutationLock.current) return;
		setStatus(value);
		setPage(0);
		setSelected(null);
		setReply('');
		setFeedback('');
	};

	const selectHandler = (request: SupportRequest) => {
		if (mutationLock.current) return;
		setSelected(request);
		setReply('');
		setError('');
		setFeedback('');
	};

	const replyHandler = async (event: React.FormEvent) => {
		event.preventDefault();
		if (mutationLock.current || !isCurrentSession() || !selected || selected.status !== SupportRequestStatus.OPEN) return;
		const text = reply.trim();
		if (!text || text.length > 2000) {
			setError('Reply must contain 1–2000 characters.');
			return;
		}
		mutationLock.current = true;
		setSaving(true);
		setError('');
		setFeedback('');
		try {
			const { data } = await client.mutate({
				mutation: REPLY_SUPPORT_REQUEST,
				variables: { input: { _id: selected._id, reply: text } },
				fetchPolicy: 'no-cache',
			});
			if (!isCurrentSession()) return;
			if (!data?.replySupportRequest?._id || data.replySupportRequest.status !== SupportRequestStatus.ANSWERED) {
				throw new Error('Unconfirmed reply');
			}
			setSelected(null);
			setReply('');
			setFeedback('Reply saved. The request is now answered.');
			refreshHandler();
		} catch {
			if (isCurrentSession()) {
				setError('Reply was not confirmed. Your draft is retained. Refresh to check whether another administrator already answered before retrying.');
			}
		} finally {
			mutationLock.current = false;
			if (isCurrentSession()) setSaving(false);
		}
	};

	return (
		<Stack spacing={3}>
			<Typography variant="h2">Support Requests</Typography>
			<Tabs value={status} onChange={statusHandler} aria-label="Request status">
				<Tab value={SupportRequestStatus.OPEN} label={status === SupportRequestStatus.OPEN && !loading && !error ? `OPEN (${total})` : 'OPEN'} disabled={saving} />
				<Tab value={SupportRequestStatus.ANSWERED} label="ANSWERED" disabled={saving} />
			</Tabs>
			{error && <Alert severity="error">{error}</Alert>}
			{feedback && <Alert severity="success">{feedback}</Alert>}
			<Button onClick={refreshHandler} disabled={loading || saving} sx={{ alignSelf: 'flex-start' }}>Refresh</Button>
			{selected && (
				<Box component="form" onSubmit={replyHandler}>
					<Stack spacing={2}>
						<Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{selected.subject}</Typography>
						<Typography>{selected.memberData?.memberNick ?? 'Member unavailable'}</Typography>
						<Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected.content}</Typography>
						{selected.status === SupportRequestStatus.ANSWERED ? (
							<Alert severity="info" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
								{selected.reply}
								{selected.repliedAt && ` — ${new Date(selected.repliedAt).toLocaleString('en-GB')}`}
							</Alert>
						) : (
							<>
								<TextField
									label="Admin reply"
									required
									multiline
									minRows={4}
									value={reply}
									disabled={saving}
									inputProps={{ maxLength: 2000 }}
									onChange={(event) => setReply(event.target.value)}
								/>
								<Typography>Only one reply is allowed. A confirmed reply cannot be edited or replaced.</Typography>
								<Button type="submit" variant="contained" disabled={saving}>{saving ? 'Sending…' : 'Send reply'}</Button>
							</>
						)}
						<Button disabled={saving} onClick={() => setSelected(null)}>Close details</Button>
					</Stack>
				</Box>
			)}
			<TableContainer>
				<Table aria-label="Support requests">
					<TableHead>
						<TableRow>
							{['Subject', 'Member', 'Status', 'Created', 'Actions'].map((label) => (
								<TableCell key={label}>{label}</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((request) => (
							<TableRow key={request._id}>
								<TableCell sx={{ overflowWrap: 'anywhere' }}>{request.subject}</TableCell>
								<TableCell>{request.memberData?.memberNick ?? 'Member unavailable'}<br />{request.memberData?.memberType}</TableCell>
								<TableCell>{request.status}</TableCell>
								<TableCell>{new Date(request.createdAt).toLocaleDateString('en-GB')}</TableCell>
								<TableCell><Button disabled={saving} onClick={() => selectHandler(request)}>{request.status === SupportRequestStatus.OPEN ? 'Reply' : 'View reply'}</Button></TableCell>
							</TableRow>
						))}
						{!rows.length && (
							<TableRow>
								<TableCell colSpan={5}>
									{loading ? 'Loading requests…' : error ? 'Requests unavailable.' : 'No requests found.'}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div"
				count={total}
				page={loading || error ? 0 : page}
				rowsPerPage={limit}
				rowsPerPageOptions={[10, 20, 50]}
				onPageChange={(_, value) => setPage(value)}
				onRowsPerPageChange={(event) => {
					setLimit(Number(event.target.value));
					setPage(0);
				}}
			/>
		</Stack>
	);
};
