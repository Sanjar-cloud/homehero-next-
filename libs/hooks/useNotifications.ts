import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient, useReactiveVar } from '@apollo/client';
import { userVar } from '../../apollo/store';
import { GET_NOTIFICATIONS } from '../../apollo/user/notification.query';
import { MARK_ALL_NOTIFICATIONS_READ, MARK_NOTIFICATION_READ } from '../../apollo/user/notification.mutation';
import { getJwtToken } from '../auth';
import { privateSocketUrl } from './usePrivateMessaging';
import type { Notification, Notifications } from '../types/notification/notification';

const empty: Notifications = { list: [], total: 0, unreadCount: 0, readBefore: '' };
const limit = 10;
const queryOptions = { fetchPolicy: 'no-cache' as const, context: { queryDeduplication: false } };
type State = { key: string; data: Notifications; loading: boolean; error: string; pending: boolean };

export default function useNotifications(memberId: string, role: string) {
	const client = useApolloClient();
	const user = useReactiveVar(userVar);
	const token = getJwtToken() || '';
	const allowed = Boolean(
		memberId &&
			token &&
			user._id === memberId &&
			user.memberType === role &&
			user.memberStatus === 'ACTIVE' &&
			['USER', 'AGENT'].includes(role),
	);
	const key = `${memberId}:${role}:${token}`;
	const [state, setState] = useState<State>({ key: '', data: empty, loading: true, error: '', pending: false });
	const mounted = useRef(false);
	const denied = useRef(false);
	const request = useRef(0);
	const loadedPages = useRef(1);
	const mutationLock = useRef(false);
	const current = useCallback(
		() =>
			mounted.current &&
			!denied.current &&
			Boolean(token) &&
			userVar()._id === memberId &&
			userVar().memberType === role &&
			userVar().memberStatus === 'ACTIVE' &&
			['USER', 'AGENT'].includes(role) &&
			getJwtToken() === token,
		[memberId, role, token],
	);

	const refresh = useCallback(
		async (pages = loadedPages.current) => {
			if (!current()) return;
			const version = ++request.current;
			setState((old) => ({ ...old, loading: true }));
			try {
				// Reconcile loaded pages: new events shift offset pagination.
				const results = await Promise.all(
					Array.from({ length: pages }, (_, index) =>
						client.query({
							query: GET_NOTIFICATIONS,
							variables: { input: { page: index + 1, limit } },
							...queryOptions,
						}),
					),
				);
				if (!current() || version !== request.current) return;
				const first = results[0].data.getNotifications;
				const records = new Map<string, Notification>();
				results.forEach((result) => result.data.getNotifications.list.forEach((item) => records.set(item._id, item)));
				const list = Array.from(records.values()).sort(
					(a, b) => b.createdAt.localeCompare(a.createdAt) || b._id.localeCompare(a._id),
				);
				loadedPages.current = pages;
				setState((old) => ({ ...old, key, data: { ...first, list }, loading: false, error: '' }));
			} catch {
				if (current() && version === request.current) {
					setState((old) => ({
						...old,
						key,
						data: empty,
						loading: false,
						error: 'Notifications could not be loaded.',
					}));
				}
			}
		},
		[client, current, key],
	);

	useEffect(() => {
		mounted.current = true;
		denied.current = false;
		request.current++;
		loadedPages.current = 1;
		mutationLock.current = false;
		setState({ key, data: empty, loading: allowed, error: '', pending: false });
		if (allowed) void refresh();
		return () => {
			mounted.current = false;
			request.current++;
		};
	}, [key, allowed, refresh]);

	useEffect(() => {
		if (!allowed) return;
		let disposed = false;
		let socket: WebSocket | null = null;
		let retry: ReturnType<typeof setTimeout> | undefined;
		let authTimer: ReturnType<typeof setTimeout> | undefined;
		let debounce: ReturnType<typeof setTimeout> | undefined;
		let retries = 0;
		const scheduleRefresh = () => {
			clearTimeout(debounce);
			debounce = setTimeout(() => {
				if (!disposed) void refresh();
			}, 75);
		};
		const scheduleConnect = () => {
			if (!disposed && current()) retry = setTimeout(connect, Math.min(15000, 1000 * 2 ** Math.min(retries++, 4)));
		};
		const connect = () => {
			if (disposed || !current()) return;
			try {
				const active = new WebSocket(privateSocketUrl());
				socket = active;
				let authenticated = false;
				active.onopen = () => {
					if (disposed || !current()) {
						active.close();
						return;
					}
					active.send(JSON.stringify({ event: 'authenticate', data: { token } }));
					authTimer = setTimeout(() => active.close(), 10000);
				};
				active.onmessage = (event) => {
					if (disposed || !current()) return;
					try {
						const frame = JSON.parse(event.data);
						if (frame.event === 'connection:ready') {
							if (frame.data?.memberId !== memberId) {
								active.close(1008);
								return;
							}
							clearTimeout(authTimer);
							authenticated = true;
							retries = 0;
							scheduleRefresh();
						} else if (authenticated && frame.event === 'notification:changed' && frame.data?.memberId === memberId) {
							scheduleRefresh();
						}
					} catch {
						/* Ignore malformed frames without logging private payloads. */
					}
				};
				active.onerror = () => active.close();
				active.onclose = (event) => {
					clearTimeout(authTimer);
					if (disposed || !current()) return;
					if (event.code === 1008) {
						denied.current = true;
						request.current++;
						setState({
							key,
							data: empty,
							loading: false,
							pending: false,
							error: 'Notification access unavailable. Log in again.',
						});
						return;
					}
					scheduleConnect();
				};
			} catch {
				scheduleConnect();
			}
		};
		const foreground = () => {
			if (!disposed && current() && document.visibilityState === 'visible') scheduleRefresh();
		};
		connect();
		document.addEventListener('visibilitychange', foreground);
		window.addEventListener('focus', foreground);
		return () => {
			disposed = true;
			clearTimeout(retry);
			clearTimeout(authTimer);
			clearTimeout(debounce);
			document.removeEventListener('visibilitychange', foreground);
			window.removeEventListener('focus', foreground);
			if (socket) {
				socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
				socket.close();
			}
		};
	}, [allowed, current, key, memberId, refresh, token]);

	const markRead = async (item?: Notification): Promise<boolean> => {
		if (!current() || mutationLock.current || state.key !== key || (!item && !state.data.readBefore)) return false;
		if (item?.notificationStatus === 'READ') return true;
		mutationLock.current = true;
		setState((old) => ({ ...old, pending: true, error: '' }));
		try {
			if (item) {
				const result = await client.mutate({
					mutation: MARK_NOTIFICATION_READ,
					variables: { notificationId: item._id },
					fetchPolicy: 'no-cache',
				});
				if (!result.data?.markNotificationRead) throw new Error();
			} else {
				const result = await client.mutate({
					mutation: MARK_ALL_NOTIFICATIONS_READ,
					variables: { before: state.data.readBefore },
					fetchPolicy: 'no-cache',
				});
				if (!result.data?.markAllNotificationsRead) throw new Error();
			}
			if (!current()) return false;
			await refresh();
			return current();
		} catch {
			if (current()) setState((old) => ({ ...old, error: 'Unable to mark notifications as read. Try again.' }));
			return false;
		} finally {
			if (current()) {
				mutationLock.current = false;
				setState((old) => ({ ...old, pending: false }));
			}
		}
	};

	const visible =
		allowed && state.key === key ? state : { key, data: empty, loading: allowed, pending: false, error: '' };
	return {
		...visible.data,
		loading: visible.loading,
		error: visible.error,
		pending: visible.pending,
		refresh: () => refresh(),
		loadMore: () => refresh(loadedPages.current + 1),
		markRead,
	};
}
