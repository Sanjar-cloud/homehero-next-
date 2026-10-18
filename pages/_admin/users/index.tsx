import React, { useEffect, useRef, useState } from 'react';
import { useApolloClient, useReactiveVar } from '@apollo/client';
import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import { MemberPanelList } from '../../../libs/components/admin/users/MemberList';
import type { AdminMember } from '../../../libs/components/admin/users/MemberList';
import { GET_ALL_MEMBERS_BY_ADMIN } from '../../../apollo/admin/query';
import { UPDATE_MEMBER_BY_ADMIN } from '../../../apollo/admin/mutation';
import { userVar } from '../../../apollo/store';
import { getJwtToken } from '../../../libs/auth';
import { Direction } from '../../../libs/enums/common.enum';
import { MemberStatus, MemberType } from '../../../libs/enums/member.enum';
import type { MembersInquiry } from '../../../libs/types/member/member.input';
import { sweetConfirmAlert } from '../../../libs/sweetAlert';
import styles from '../../../scss/homehero/admin.module.scss';

const AdminUsers = () => {
	const user = useReactiveVar(userVar);
	const token = getJwtToken();
	const allowed = user._id && token && user.memberType === MemberType.ADMIN
		&& user.memberStatus === MemberStatus.ACTIVE;

	if (!allowed) {
		return <Alert severity="info">An active administrator session is required.</Alert>;
	}

	return <MembersPanel key={`${user._id}:${token}`} />;
};

const MembersPanel = () => {
	const client = useApolloClient();
	const sessionUser = userVar()._id;
	const sessionToken = getJwtToken();
	const mounted = useRef(true);
	const requestId = useRef(0);
	const mutationLock = useRef(false);
	const [input, setInput] = useState<MembersInquiry>({
		page: 1,
		limit: 10,
		sort: 'createdAt',
		direction: Direction.DESC,
		search: {},
	});
	const [members, setMembers] = useState<AdminMember[]>([]);
	const [total, setTotal] = useState(0);
	const [searchText, setSearchText] = useState('');
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
		setMembers([]);
		setTotal(0);
		setError('');
		client.query<{ getAllMembersByAdmin: { list: AdminMember[]; metaCounter: { total: number | null }[] | null } }>({
			query: GET_ALL_MEMBERS_BY_ADMIN,
			variables: { input },
			fetchPolicy: 'no-cache',
			context: { queryDeduplication: false },
		}).then(({ data }) => {
			if (!isCurrentSession() || currentRequest !== requestId.current) return;
			const result = data.getAllMembersByAdmin;
			const count = result.metaCounter?.[0]?.total ?? 0;
			if (input.page > 1 && (input.page - 1) * input.limit >= count) {
				setInput((previous) => ({
					...previous,
					page: Math.max(1, Math.ceil(count / previous.limit)),
				}));
				return;
			}
			setMembers(result.list);
			setTotal(count);
		}).catch(() => {
			if (isCurrentSession() && currentRequest === requestId.current) {
				setError('Members could not be loaded. Check the API connection and try Refresh.');
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

	const filterHandler = (field: 'memberType' | 'memberStatus', value: string) => {
		if (mutationLock.current) return;
		setFeedback('');
		setInput((previous) => ({
			...previous,
			page: 1,
			search: { ...previous.search, [field]: value || undefined },
		}));
	};

	const searchHandler = (event: React.FormEvent) => {
		event.preventDefault();
		if (mutationLock.current) return;
		// The backend uses a regex. Escape metacharacters for a literal nickname search.
		const text = searchText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		setFeedback('');
		setInput((previous) => ({
			...previous,
			page: 1,
			search: { ...previous.search, text: text || undefined },
		}));
	};

	const clearSearchHandler = () => {
		if (mutationLock.current) return;
		setSearchText('');
		setFeedback('');
		setInput((previous) => ({
			...previous,
			page: 1,
			search: { ...previous.search, text: undefined },
		}));
	};

	const paginationHandler = (page: number, limit: number) => {
		if (mutationLock.current) return;
		setInput((previous) => ({ ...previous, page, limit }));
	};

	const updateMemberHandler = async (
		member: AdminMember,
		field: 'memberType' | 'memberStatus',
		value: MemberType | MemberStatus,
	) => {
		const validValue = field === 'memberType'
			? Object.values(MemberType).includes(value as MemberType)
			: Object.values(MemberStatus).includes(value as MemberStatus);
		if (mutationLock.current || loading || !isCurrentSession() || !validValue
			|| member._id === sessionUser || member[field] === value
			|| !/^[a-f\d]{24}$/i.test(member._id) || !members.includes(member)) return;

		mutationLock.current = true;
		setSaving(true);
		setError('');
		setFeedback('');
		try {
			const label = field === 'memberType' ? 'role' : 'status';
			const confirmed = await sweetConfirmAlert(`Change ${member.memberNick}'s ${label} to ${value}? This does not revoke existing sessions.`);
			if (!confirmed || !isCurrentSession()) return;
			const { data } = await client.mutate<{ updateMemberByAdmin: AdminMember }>({
				mutation: UPDATE_MEMBER_BY_ADMIN,
				variables: { input: { _id: member._id, [field]: value } },
				fetchPolicy: 'no-cache',
			});
			if (!isCurrentSession()) return;
			if (data?.updateMemberByAdmin?._id !== member._id || data.updateMemberByAdmin[field] !== value) {
				throw new Error('Unconfirmed member update');
			}
			setFeedback(`Member ${label} updated.`);
			setRevision((previous) => previous + 1);
		} catch {
			if (isCurrentSession()) {
				setError('Member change was not confirmed. Refresh to check the current values before retrying.');
			}
		} finally {
			mutationLock.current = false;
			if (isCurrentSession()) setSaving(false);
		}
	};

	return (
		<div className="content">
			<Box className={`table-wrap ${styles.users}`}>
				<div className={styles.usersHeading}>
					<Typography component="h2" variant="h5">Users Management</Typography>
					<Button variant="outlined" disabled={loading || saving} onClick={refreshHandler}>
						Refresh
					</Button>
				</div>
				<form className={styles.usersSearch} onSubmit={searchHandler}>
					<TextField
						label="Search nickname"
						value={searchText}
						disabled={saving}
						onChange={(event) => setSearchText(event.target.value)}
					/>
					<Button type="submit" variant="outlined" disabled={saving}>Search</Button>
					<Button
						type="button"
						disabled={saving || (!searchText && !input.search.text)}
						onClick={clearSearchHandler}
					>
						Clear
					</Button>
				</form>
				<div className={styles.usersFilters}>
					<TextField
						select
						label="Role"
						value={input.search.memberType || ''}
						disabled={saving}
						SelectProps={{ displayEmpty: true }}
						InputLabelProps={{ shrink: true }}
						onChange={(event) => filterHandler('memberType', event.target.value)}
					>
						<MenuItem value="">All roles</MenuItem>
						{Object.values(MemberType).map((type) => (
							<MenuItem key={type} value={type}>{type}</MenuItem>
						))}
					</TextField>
					<TextField
						select
						label="Status"
						value={input.search.memberStatus || ''}
						disabled={saving}
						SelectProps={{ displayEmpty: true }}
						InputLabelProps={{ shrink: true }}
						onChange={(event) => filterHandler('memberStatus', event.target.value)}
					>
						<MenuItem value="">All statuses</MenuItem>
						<MenuItem value={MemberStatus.ACTIVE}>Active</MenuItem>
						<MenuItem value={MemberStatus.BLOCK}>Blocked</MenuItem>
						<MenuItem value={MemberStatus.DELETE}>Deleted</MenuItem>
					</TextField>
				</div>
				<p className={styles.usersHint}>Role/status changes update member records; they do not revoke existing sessions. Your own account is read-only here.</p>
				{error && <Alert severity="error">{error}</Alert>}
				{feedback && <Alert severity="success">{feedback}</Alert>}
				<MemberPanelList
					members={members}
					currentMemberId={sessionUser}
					total={total}
					page={input.page}
					limit={input.limit}
					loading={loading}
					saving={saving}
					error={Boolean(error)}
					onUpdate={updateMemberHandler}
					onPagination={paginationHandler}
				/>
			</Box>
		</div>
	);
};

export default withAdminLayout(AdminUsers);
