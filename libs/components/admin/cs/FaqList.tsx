import React, { useEffect, useRef, useState } from 'react';
import { useApolloClient, useReactiveVar } from '@apollo/client';
import {
	Alert, Box, Button, MenuItem, Stack, Table, TableBody, TableCell, TableContainer,
	TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import { userVar } from '../../../../apollo/store';
import { GET_SUPPORT_NOTICES_BY_ADMIN } from '../../../../apollo/admin/support.query';
import { CREATE_SUPPORT_NOTICE, UPDATE_SUPPORT_NOTICE } from '../../../../apollo/admin/support.mutation';
import { getJwtToken } from '../../../auth';
import { MemberStatus, MemberType } from '../../../enums/member.enum';
import { SupportNoticeCategory, SupportNoticeStatus } from '../../../enums/support.enum';
import type { SupportNotice, SupportNoticeContentInput, SupportTranslations } from '../../../types/support/support';

interface FaqArticlesPanelListProps {
	noticeCategory?: SupportNoticeCategory;
}

const emptyForm = {
	noticeTitle: '',
	noticeContent: '',
	noticeStatus: SupportNoticeStatus.HOLD,
	krTitle: '',
	krContent: '',
	ruTitle: '',
	ruContent: '',
};

export const FaqArticlesPanelList = ({ noticeCategory = SupportNoticeCategory.FAQ }: FaqArticlesPanelListProps) => {
	const user = useReactiveVar(userVar);
	const token = getJwtToken();
	const allowed = user._id && user.memberType === MemberType.ADMIN && user.memberStatus === MemberStatus.ACTIVE && token;

	if (!allowed) {
		return <Alert severity="info">An active administrator session is required.</Alert>;
	}

	return <SupportContentPanel key={`${user._id}:${token}:${noticeCategory}`} noticeCategory={noticeCategory} />;
};

// Remount on session/category changes so private rows, drafts and pending results cannot cross accounts.
const SupportContentPanel = ({ noticeCategory }: { noticeCategory: SupportNoticeCategory }) => {
	const client = useApolloClient();
	const sessionUser = userVar()._id;
	const sessionToken = getJwtToken();
	const mounted = useRef(true);
	const requestId = useRef(0);
	const mutationLock = useRef(false);
	const [rows, setRows] = useState<SupportNotice[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [limit, setLimit] = useState(10);
	const [status, setStatus] = useState<SupportNoticeStatus | ''>('');
	const [search, setSearch] = useState('');
	const [text, setText] = useState('');
	const [revision, setRevision] = useState(0);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [feedback, setFeedback] = useState('');
	const [editing, setEditing] = useState<SupportNotice | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [form, setForm] = useState({ ...emptyForm });
	const title = noticeCategory === SupportNoticeCategory.FAQ ? 'FAQ' : 'Announcements';

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
			query: GET_SUPPORT_NOTICES_BY_ADMIN,
			variables: { input: { page: page + 1, limit, noticeCategory, noticeStatus: status || null, text } },
			fetchPolicy: 'no-cache',
			context: { queryDeduplication: false },
		}).then(({ data }) => {
			if (!isCurrentSession() || currentRequest !== requestId.current) return;
			const result = data.getSupportNoticesByAdmin;
			const count = result.metaCounter[0]?.total ?? 0;
			if (page > 0 && page * limit >= count) {
				setPage(Math.max(0, Math.ceil(count / limit) - 1));
				return;
			}
			setRows(result.list);
			setTotal(count);
		}).catch(() => {
			if (isCurrentSession() && currentRequest === requestId.current) {
				setError('Support content could not be loaded. Check the API connection and try Refresh.');
			}
		}).finally(() => {
			if (isCurrentSession() && currentRequest === requestId.current) setLoading(false);
		});
	}, [client, page, limit, status, text, noticeCategory, revision]);

	/** HANDLERS **/
	const refreshHandler = () => setRevision((value) => value + 1);

	const searchHandler = (event: React.FormEvent) => {
		event.preventDefault();
		setPage(0);
		setText(search.trim());
		refreshHandler();
	};

	const openFormHandler = (notice?: SupportNotice) => {
		setEditing(notice ?? null);
		setForm(notice ? {
			noticeTitle: notice.noticeTitle,
			noticeContent: notice.noticeContent,
			noticeStatus: notice.noticeStatus,
			krTitle: notice.translations?.kr?.title ?? '',
			krContent: notice.translations?.kr?.content ?? '',
			ruTitle: notice.translations?.ru?.title ?? '',
			ruContent: notice.translations?.ru?.content ?? '',
		} : { ...emptyForm });
		setError('');
		setFeedback('');
		setFormOpen(true);
	};

	const saveHandler = async (event: React.FormEvent) => {
		event.preventDefault();
		if (mutationLock.current || !isCurrentSession()) return;
		const translations: SupportTranslations = {};
		const noticeTitle = form.noticeTitle.trim();
		const noticeContent = form.noticeContent.trim();
		if (noticeTitle.length < 3 || noticeTitle.length > 100 || !noticeContent || noticeContent.length > 5000) {
			setError('English title must contain 3–100 characters and content 1–5000 characters.');
			return;
		}
		for (const locale of ['kr', 'ru'] as const) {
			const translatedTitle = form[`${locale}Title`].trim();
			const translatedContent = form[`${locale}Content`].trim();
			if (!translatedTitle && !translatedContent) continue;
			if (translatedTitle.length < 3 || translatedTitle.length > 100 || !translatedContent || translatedContent.length > 5000) {
				setError(`${locale.toUpperCase()} translation requires a title of 3–100 and content of 1–5000 characters.`);
				return;
			}
			translations[locale] = { title: translatedTitle, content: translatedContent };
		}
		const input: SupportNoticeContentInput = {
			noticeTitle,
			noticeContent,
			noticeStatus: form.noticeStatus,
			translations: Object.keys(translations).length ? translations : null,
		};
		mutationLock.current = true;
		setSaving(true);
		setError('');
		setFeedback('');
		try {
			const result = editing
				? await client.mutate({
					mutation: UPDATE_SUPPORT_NOTICE,
					variables: { input: { ...input, _id: editing._id } },
					fetchPolicy: 'no-cache',
				})
				: await client.mutate({
					mutation: CREATE_SUPPORT_NOTICE,
					variables: { input: { ...input, noticeCategory } },
					fetchPolicy: 'no-cache',
				});
			if (!isCurrentSession()) return;
			const saved = result.data && ('updateSupportNotice' in result.data ? result.data.updateSupportNotice : result.data.createSupportNotice);
			if (!saved?._id) throw new Error('Unconfirmed save');
			setFormOpen(false);
			setFeedback('Content saved.');
			refreshHandler();
		} catch {
			if (isCurrentSession()) {
				setError('Save was not confirmed. Your draft is retained. Refresh and check existing content before retrying.');
			}
		} finally {
			mutationLock.current = false;
			if (isCurrentSession()) setSaving(false);
		}
	};

	return (
		<Stack spacing={3}>
			<Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
				<Typography variant="h2">{title} Management</Typography>
				<Button variant="contained" disabled={saving} onClick={() => openFormHandler()}>Add content</Button>
			</Stack>
			{error && <Alert severity="error">{error}</Alert>}
			{feedback && <Alert severity="success">{feedback}</Alert>}
			{formOpen && (
				<Box component="form" onSubmit={saveHandler}>
					<Stack spacing={2}>
						<Typography variant="h6">{editing ? 'Edit content' : 'New content'}</Typography>
						<Typography>English is required. Empty Korean/Russian translations fall back to English.</Typography>
						<TextField
							label="English title"
							required
							value={form.noticeTitle}
							disabled={saving}
							inputProps={{ minLength: 3, maxLength: 100 }}
							onChange={(event) => setForm({ ...form, noticeTitle: event.target.value })}
						/>
						<TextField
							label="English content"
							required
							multiline
							minRows={4}
							value={form.noticeContent}
							disabled={saving}
							inputProps={{ maxLength: 5000 }}
							onChange={(event) => setForm({ ...form, noticeContent: event.target.value })}
						/>
						{(['kr', 'ru'] as const).map((locale) => (
							<Stack key={locale} spacing={2}>
								<TextField label={`${locale === 'kr' ? 'Korean' : 'Russian'} title (optional)`} value={form[`${locale}Title`]} disabled={saving} inputProps={{ maxLength: 100 }} onChange={(event) => setForm({ ...form, [`${locale}Title`]: event.target.value })} />
								<TextField label={`${locale === 'kr' ? 'Korean' : 'Russian'} content (optional)`} multiline minRows={3} value={form[`${locale}Content`]} disabled={saving} inputProps={{ maxLength: 5000 }} onChange={(event) => setForm({ ...form, [`${locale}Content`]: event.target.value })} />
							</Stack>
						))}
						<TextField select label="Publication" value={form.noticeStatus} disabled={saving} onChange={(event) => setForm({ ...form, noticeStatus: event.target.value as SupportNoticeStatus })}>
							<MenuItem value={SupportNoticeStatus.HOLD}>Hidden</MenuItem>
							<MenuItem value={SupportNoticeStatus.ACTIVE}>Published</MenuItem>
						</TextField>
						<Stack direction="row" spacing={2}>
							<Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Save content'}</Button>
							<Button disabled={saving} onClick={() => setFormOpen(false)}>Cancel</Button>
						</Stack>
					</Stack>
				</Box>
			)}
			<Stack component="form" onSubmit={searchHandler} direction={{ xs: 'column', sm: 'row' }} spacing={2}>
				<TextField label="Search content" value={search} inputProps={{ maxLength: 100 }} onChange={(event) => setSearch(event.target.value)} />
				<Button type="submit">Search</Button>
				<TextField
					select
					label="Status"
					value={status}
					sx={{ minWidth: 150 }}
					onChange={(event) => {
						setStatus(event.target.value as SupportNoticeStatus | '');
						setPage(0);
					}}
				>
					<MenuItem value="">All</MenuItem>
					<MenuItem value={SupportNoticeStatus.ACTIVE}>Published</MenuItem>
					<MenuItem value={SupportNoticeStatus.HOLD}>Hidden</MenuItem>
				</TextField>
				<Button onClick={refreshHandler} disabled={loading}>Refresh</Button>
			</Stack>
			<TableContainer>
				<Table aria-label={`${title} content`}>
					<TableHead>
						<TableRow>
							{['Title', 'Status', 'Created', 'Actions'].map((label) => (
								<TableCell key={label}>{label}</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((notice) => (
							<TableRow key={notice._id}>
								<TableCell sx={{ overflowWrap: 'anywhere' }}>{notice.noticeTitle}</TableCell>
								<TableCell>{notice.noticeStatus === SupportNoticeStatus.ACTIVE ? 'Published' : 'Hidden'}</TableCell>
								<TableCell>{new Date(notice.createdAt).toLocaleDateString('en-GB')}</TableCell>
								<TableCell><Button disabled={saving} onClick={() => openFormHandler(notice)}>Edit / Publication</Button></TableCell>
							</TableRow>
						))}
						{!rows.length && (
							<TableRow>
								<TableCell colSpan={4}>
									{loading ? 'Loading content…' : error ? 'Content unavailable.' : 'No content found.'}
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
