import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient, useReactiveVar } from '@apollo/client';
import { useTranslation } from 'next-i18next';
import { FiMessageSquare } from 'react-icons/fi';
import { userVar } from '../../../apollo/store';
import { GET_MY_SUPPORT_REQUESTS } from '../../../apollo/user/support.query';
import { CREATE_SUPPORT_REQUEST } from '../../../apollo/user/support.mutation';
import { getJwtToken } from '../../auth';
import { MemberStatus, MemberType } from '../../enums/member.enum';
import { SupportRequestStatus } from '../../enums/support.enum';
import type { SupportRequest } from '../../types/support/support';
import { Button, Input } from '../homehero/UI';
import { ServicePagination } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/support.module.scss';

const Inquiry = () => {
	const { t: translate } = useTranslation('common');
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const [ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	const token = getJwtToken();
	const allowed = user.memberStatus === MemberStatus.ACTIVE
		&& (user.memberType === MemberType.USER || user.memberType === MemberType.AGENT);

	if (!ready) return <p className={styles.state}>{translate('Loading…')}</p>;
	if (!user._id || !token) {
		return (
			<div className={styles.state}>
				<FiMessageSquare aria-hidden="true" size={30} />
				<h2>{translate('Log in to contact support')}</h2>
				<p>{translate('Your requests and admin replies are only visible to your account.')}</p>
				<Link className={styles.login} href={{ pathname: '/account/join', query: { view: 'login', referrer: router.asPath } }}>
					{translate('Log in')}
				</Link>
			</div>
		);
	}
	if (!allowed) {
		return <p className={styles.state}>{translate('Support requests are available to active customer and service provider accounts.')}</p>;
	}

	return <OwnRequests key={`${user._id}:${token}`} memberId={user._id} token={token} />;
};

const OwnRequests = ({ memberId, token }: { memberId: string; token: string }) => {
	const client = useApolloClient();
	const router = useRouter();
	const { t: translate } = useTranslation('common');
	const mounted = useRef(false);
	const requestId = useRef(0);
	const mutationLock = useRef(false);
	const [rows, setRows] = useState<SupportRequest[]>([]);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [status, setStatus] = useState<SupportRequestStatus | ''>('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [revision, setRevision] = useState(0);
	const [subject, setSubject] = useState('');
	const [content, setContent] = useState('');
	const [listError, setListError] = useState('');
	const [formError, setFormError] = useState('');
	const [feedback, setFeedback] = useState('');
	const limit = 6;
	const locale = router.locale === 'kr' ? 'ko-KR' : router.locale === 'ru' ? 'ru-RU' : 'en-GB';

	const isCurrentSession = () => {
		const user = userVar();
		return mounted.current && user._id === memberId && getJwtToken() === token
			&& user.memberStatus === MemberStatus.ACTIVE
			&& (user.memberType === MemberType.USER || user.memberType === MemberType.AGENT);
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
		setListError('');
		client.query({
			query: GET_MY_SUPPORT_REQUESTS,
			variables: { input: { page, limit, status: status || null } },
			fetchPolicy: 'no-cache',
			context: { queryDeduplication: false },
		}).then(({ data }) => {
			if (!isCurrentSession() || currentRequest !== requestId.current) return;
			const result = data.getMySupportRequests;
			if (result.list.some((request) => request.memberId !== memberId)) throw new Error('Unexpected request owner');
			const count = result.metaCounter[0]?.total ?? 0;
			if (page > 1 && (page - 1) * limit >= count) {
				setPage(Math.max(1, Math.ceil(count / limit)));
				return;
			}
			setRows(result.list);
			setTotal(count);
		}).catch(() => {
			if (isCurrentSession() && currentRequest === requestId.current) {
				setListError('Your requests could not be loaded. Please try Refresh.');
			}
		}).finally(() => {
			if (isCurrentSession() && currentRequest === requestId.current) setLoading(false);
		});
	}, [client, memberId, token, page, status, revision]);

	/** HANDLERS **/
	const refreshHandler = () => setRevision((value) => value + 1);

	const statusHandler = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setStatus(event.target.value as SupportRequestStatus | '');
		setPage(1);
	};

	const submitHandler = async (event: React.FormEvent) => {
		event.preventDefault();
		if (mutationLock.current || !isCurrentSession()) return;
		const input = { subject: subject.trim(), content: content.trim() };
		if (input.subject.length < 3 || input.subject.length > 100 || !input.content || input.content.length > 2000) {
			setFormError('Subject must contain 3–100 characters and message 1–2000 characters.');
			return;
		}
		mutationLock.current = true;
		setSaving(true);
		setFormError('');
		setFeedback('');
		try {
			const { data } = await client.mutate({
				mutation: CREATE_SUPPORT_REQUEST,
				variables: { input },
				fetchPolicy: 'no-cache',
			});
			if (!isCurrentSession()) return;
			if (!data?.createSupportRequest?._id || data.createSupportRequest.memberId !== memberId) {
				throw new Error('Unconfirmed request');
			}
			setSubject('');
			setContent('');
			setFeedback('Your request was sent. The admin reply will appear here.');
			setStatus('');
			setPage(1);
			refreshHandler();
		} catch {
			if (isCurrentSession()) {
				setFormError('Submission was not confirmed. Your draft is retained. Refresh your requests before retrying to avoid duplicates.');
			}
		} finally {
			mutationLock.current = false;
			if (isCurrentSession()) setSaving(false);
		}
	};

	return (
		<div className={styles.requests}>
			<form className={styles.form} onSubmit={submitHandler}>
				<h2>{translate('Ask for help')}</h2>
				<p>{translate('Describe your question. Never include passwords, tokens, or payment details.')}</p>
				<label htmlFor="support-subject">{translate('Subject')}</label>
				<Input
					id="support-subject"
					value={subject}
					onChange={(event) => setSubject(event.target.value)}
					required
					minLength={3}
					maxLength={100}
					disabled={saving}
				/>
				<label htmlFor="support-content">{translate('Your message')}</label>
				<textarea
					id="support-content"
					value={content}
					onChange={(event) => setContent(event.target.value)}
					required
					maxLength={2000}
					rows={6}
					disabled={saving}
				/>
				{formError && <p className={styles.error} role="alert">{translate(formError)}</p>}
				{feedback && <p className={styles.success} role="status">{translate(feedback)}</p>}
				<Button type="submit" disabled={saving}>{translate(saving ? 'Sending…' : 'Send request')}</Button>
			</form>
			<section className={styles.history} aria-label={translate('My requests')}>
				<div className={styles.heading}>
					<h2>{translate('My requests')}</h2>
					<Button variant="secondary" onClick={refreshHandler} disabled={loading}>{translate('Refresh')}</Button>
				</div>
				<label className={styles.filter}>
					{translate('Request status')}
					<select value={status} onChange={statusHandler}>
						<option value="">{translate('All')}</option>
						<option value={SupportRequestStatus.OPEN}>{translate('Open')}</option>
						<option value={SupportRequestStatus.ANSWERED}>{translate('Answered')}</option>
					</select>
				</label>
				{loading && <p className={styles.state} role="status">{translate('Loading your requests…')}</p>}
				{listError && <p className={styles.error} role="alert">{translate(listError)}</p>}
				{!loading && !listError && !rows.length && <p className={styles.state}>{translate('No support requests found.')}</p>}
				{rows.map((request) => (
					<article key={request._id} className={styles.request}>
						<div className={styles.requestMeta}>
							<span className={request.status === SupportRequestStatus.ANSWERED ? styles.answered : styles.open}>
								{translate(request.status === SupportRequestStatus.ANSWERED ? 'Answered' : 'Open')}
							</span>
							<time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleDateString(locale)}</time>
						</div>
						<h3>{request.subject}</h3>
						<p className={styles.text}>{request.content}</p>
						{request.status === SupportRequestStatus.ANSWERED && request.reply ? (
							<div className={styles.reply}>
								<strong>{translate('HomeHero support reply')}</strong>
								{request.repliedAt && <time dateTime={request.repliedAt}>{new Date(request.repliedAt).toLocaleDateString(locale)}</time>}
								<p className={styles.text}>{request.reply}</p>
							</div>
						) : <p className={styles.muted}>{translate('Waiting for an admin reply.')}</p>}
					</article>
				))}
				{!loading && !listError && <ServicePagination page={page} totalPages={Math.ceil(total / limit)} onChange={setPage} />}
			</section>
		</div>
	);
};

export default Inquiry;
