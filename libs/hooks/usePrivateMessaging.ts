import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { userVar } from '../../apollo/store';
import { GET_CONVERSATIONS, GET_MESSAGES } from '../../apollo/user/messaging.query';
import { SEND_MESSAGE, START_CONVERSATION } from '../../apollo/user/messaging.mutation';
import { getJwtToken } from '../auth';
import { GET_SERVICES } from '../../apollo/user/service.query';
import { Direction } from '../enums/common.enum';
import type { Service } from '../types/service/service';
import type { ChatMessage, Conversation } from '../types/messaging/messaging';

export const isMessagingId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
export const messageTextError = (text: string) => text.trim().length < 1 || text.trim().length > 2000 ? 'Enter a message containing 1–2000 characters.' : '';

export function mergeMessages(previous: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
	const records = new Map(previous.map((message) => [message._id, message]));
	incoming.forEach((message) => records.set(message._id, message));
	return Array.from(records.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a._id.localeCompare(b._id));
}

export function privateSocketUrl(): string {
	const base = process.env.REACT_APP_API_WS || process.env.REACT_APP_API_GRAPHQL_URL;
	if (!base) throw new Error('Messaging endpoint unavailable');
	const url = new URL(base);
	if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) throw new Error('Messaging endpoint unavailable');
	url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
	url.pathname = '/ws';
	url.search = '';
	url.hash = '';
	return url.toString();
}

const conversationLimit = 20;
const messageLimit = 30;
const queryOptions = { fetchPolicy: 'no-cache' as const, context: { queryDeduplication: false } };

export default function usePrivateMessaging(memberId: string, role: string, conversationId: string) {
	const client = useApolloClient();
	const token = getJwtToken() || '';
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [page, setPage] = useState(1);
	const [conversationTotal, setConversationTotal] = useState(0);
	const [selected, setSelected] = useState<Conversation | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [messageTotal, setMessageTotal] = useState(0);
	const [loadingList, setLoadingList] = useState(true);
	const [loadingHistory, setLoadingHistory] = useState(false);
	const [sending, setSending] = useState(false);
	const [starting, setStarting] = useState(false);
	const [listError, setListError] = useState('');
	const [threadError, setThreadError] = useState('');
	const [actionError, setActionError] = useState('');
	const [connection, setConnection] = useState('Connecting…');
	const [selectionVersion, setSelectionVersion] = useState(0);
	const accessDenied = useRef(false);
	const mounted = useRef(false);
	const listRequest = useRef(0);
	const threadRequest = useRef(0);
	const historyPages = useRef(1);
	const sendLock = useRef(false);
	const startLock = useRef(false);
	const selectedRef = useRef<Conversation | null>(null);
	const conversationIdRef = useRef(conversationId);
	conversationIdRef.current = conversationId;

	const currentAccount = useCallback(() => mounted.current &&
		!accessDenied.current &&
		userVar()._id === memberId &&
		userVar().memberType === role &&
		getJwtToken() === token, [memberId, role, token]);
	const ownsConversation = useCallback((conversation: Conversation) => role === 'USER' ? conversation.userId === memberId : role === 'AGENT' && conversation.agentId === memberId, [memberId, role]);

	/** GRAPHQL READS **/
	const findConversation = useCallback(async (id: string, byAgent = false): Promise<Conversation | null> => {
		let index = 1;
		let totalPages = 1;
		while (index <= totalPages) {
			if (!currentAccount()) throw new Error('Conversation unavailable');
			const result = await client.query({
				query: GET_CONVERSATIONS,
				variables: { input: { page: index, limit: 100 } },
				...queryOptions
			});
			if (!currentAccount()) throw new Error('Conversation unavailable');
			const data = result.data.getConversations;
			if (data.list.some((item) => !ownsConversation(item))) throw new Error('Conversation unavailable');
			const found = data.list.find((item) => byAgent ? item.agentId === id : item._id === id);
			if (found) return found;
			totalPages = Math.ceil((data.metaCounter[0]?.total ?? 0) / 100);
			index++;
		}
		return null;
	}, [client, currentAccount, ownsConversation]);

	const resolveRecipient = useCallback(async (agentId: string, serviceId: string) => {
		if (role !== 'USER' || !isMessagingId(agentId) || (serviceId && !isMessagingId(serviceId))) {
			throw new Error('Invalid recipient');
		}
		const conversation = await findConversation(agentId, true);
		// Existing pairs do not require an active service to remain accessible.
		if (conversation && !serviceId) return { conversation, service: null };
		let service: Service | null = null;
		let index = 1;
		let totalPages = 1;
		try {
			while (!service && index <= totalPages) {
				if (!currentAccount()) throw new Error('Service unavailable');
				const result = await client.query({
					query: GET_SERVICES,
					variables: {
						input: {
							page: index,
							limit: 100,
							sort: 'createdAt',
							direction: Direction.DESC,
							search: { memberId: agentId }
						}
					},
					...queryOptions,
				});
				if (!currentAccount()) throw new Error('Service unavailable');
				const data = result.data.getServices;
				service = data.list.find((item) => item.memberId === agentId && item.serviceStatus === 'ACTIVE' && (!serviceId || item._id === serviceId)) ?? null;
				totalPages = serviceId ? Math.ceil((data.metaCounter?.[0]?.total ?? 0) / 100) : 0;
				index++;
			}
		} catch {
			if (!conversation || !currentAccount()) throw new Error('Service unavailable');
		}
		return { conversation, service };
	}, [client, currentAccount, findConversation, role]);

	const refreshConversations = useCallback(async () => {
		if (!currentAccount()) return;
		const request = ++listRequest.current;
		setLoadingList(true);
		try {
			const result = await client.query({
				query: GET_CONVERSATIONS,
				variables: { input: { page, limit: conversationLimit } },
				...queryOptions
			});
			if (!currentAccount() || request !== listRequest.current) return;
			const data = result.data.getConversations;
			if (data.list.some((conversation) => !ownsConversation(conversation))) throw new Error('Conversation unavailable');
			const total = data.metaCounter[0]?.total ?? 0;
			setConversations(data.list);
			setConversationTotal(total);
			setListError('');
			if (page > Math.max(1, Math.ceil(total / conversationLimit))) setPage(Math.max(1, Math.ceil(total / conversationLimit)));
		} catch {
			if (currentAccount() && request === listRequest.current) {
				setConversations([]);
				setListError('Unable to load conversations. Retry or log in again.');
			}
		} finally {
			if (currentAccount() && request === listRequest.current) setLoadingList(false);
		}
	}, [client, currentAccount, ownsConversation, page]);

	const refreshHistory = useCallback(async (loadOlder = false) => {
		const conversation = selectedRef.current;
		if (!currentAccount() || !conversation || conversation._id !== conversationIdRef.current) return;
		const request = ++threadRequest.current;
		const pages = historyPages.current + (loadOlder ? 1 : 0);
		setLoadingHistory(true);
		try {
			// Reconcile all loaded pages because incoming messages shift offset pagination.
			const results = await Promise.all(Array.from({ length: pages }, (_, index) => client.query({
				query: GET_MESSAGES,
				variables: { input: { conversationId: conversation._id, page: index + 1, limit: messageLimit } },
				...queryOptions,
			})));
			if (!currentAccount() || request !== threadRequest.current || conversation._id !== conversationIdRef.current) return;
			const incoming = results.flatMap((result) => result.data.getMessages.list);
			if (incoming.some((message) => message.conversationId !== conversation._id || ![conversation.userId, conversation.agentId].includes(message.senderId))) {
				throw new Error('Conversation unavailable');
			}
			historyPages.current = pages;
			setMessages((previous) => mergeMessages(previous, incoming));
			setMessageTotal(results[0].data.getMessages.metaCounter[0]?.total ?? 0);
			setThreadError('');
		} catch {
			if (currentAccount() && request === threadRequest.current) {
				setThreadError('Unable to load this conversation. Retry or log in again.');
			}
		} finally {
			if (currentAccount() && request === threadRequest.current) setLoadingHistory(false);
		}
	}, [client, currentAccount]);

	/** MUTATIONS **/
	const startConversation = async (serviceId: string, agentId: string): Promise<Conversation | null> => {
		if (!currentAccount() || role !== 'USER' || startLock.current || !isMessagingId(serviceId) || !isMessagingId(agentId)) {
			return null;
		}
		startLock.current = true;
		setStarting(true);
		setActionError('');
		try {
			const result = await client.mutate({ mutation: START_CONVERSATION, variables: { input: { serviceId } }, fetchPolicy: 'no-cache' });
			if (!currentAccount()) return null;
			const conversation = result.data?.startConversation;
			if (!conversation || !ownsConversation(conversation) || conversation.agentId !== agentId) {
				throw new Error('Conversation unavailable');
			}
			return conversation;
		} catch {
			if (currentAccount()) setActionError('Unable to confirm the conversation. Check Messages before trying again.');
			return null;
		} finally {
			startLock.current = false;
			if (currentAccount()) setStarting(false);
		}
	};

	const sendMessage = async (text: string, serviceId?: string): Promise<boolean> => {
		const conversation = selectedRef.current;
		if (!currentAccount() || sendLock.current || !conversation || conversation._id !== conversationIdRef.current) return false;
		const error = messageTextError(text);
		setActionError(error);
		if (error || (serviceId && (role !== 'USER' || !isMessagingId(serviceId)))) return false;
		sendLock.current = true;
		setSending(true);
		const requestThread = conversation._id;
		try {
			const result = await client.mutate({
				mutation: SEND_MESSAGE,
				variables: {
					input: { conversationId: requestThread, text: text.trim(), ...(serviceId ? { serviceId } : {}) }
				},
				fetchPolicy: 'no-cache',
			});
			if (!currentAccount() || requestThread !== conversationIdRef.current) return false;
			const message = result.data?.sendMessage;
			if (!message || message.senderId !== memberId || message.conversationId !== requestThread) {
				throw new Error('Message unavailable');
			}
			setMessages((previous) => mergeMessages(previous, [message]));
			void refreshConversations();
			void refreshHistory();
			return true;
		} catch {
			if (currentAccount() && requestThread === conversationIdRef.current) {
				setActionError('Unable to confirm sending. Refresh the history before sending this message again.');
			}
			return false;
		} finally {
			sendLock.current = false;
			if (currentAccount()) setSending(false);
		}
	};

	/** ACCOUNT / SELECTION LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			listRequest.current++;
			threadRequest.current++;
		};
	}, []);

	useEffect(() => {
		accessDenied.current = false;
	}, [token]);

	useEffect(() => {
		void refreshConversations();
	}, [refreshConversations]);

	useEffect(() => {
		let cancelled = false;
		threadRequest.current++;
		selectedRef.current = null;
		historyPages.current = 1;
		setSelected(null);
		setMessages([]);
		setMessageTotal(0);
		setActionError('');
		setThreadError('');
		if (!conversationId) {
			setLoadingHistory(false);
			return;
		}
		if (!isMessagingId(conversationId)) {
			setThreadError('Invalid conversation link.');
			return;
		}
		setLoadingHistory(true);
		const resolveConversation = async () => {
			try {
				const found = await findConversation(conversationId);
				if (cancelled || !currentAccount()) return;
				if (!found) throw new Error('Conversation unavailable');
				selectedRef.current = found;
				setSelected(found);
				await refreshHistory();
			} catch {
				if (!cancelled && currentAccount()) {
					setThreadError('Conversation unavailable. Choose one of your conversations or log in again.');
					setLoadingHistory(false);
				}
			}
		};
		void resolveConversation();
		return () => {
			cancelled = true;
		};
	}, [conversationId, currentAccount, findConversation, refreshHistory, selectionVersion]);

	const refreshListRef = useRef(refreshConversations);
	refreshListRef.current = refreshConversations;

	/** PRIVATE WEBSOCKET — never shared with legacy socketVar **/
	useEffect(() => {
		if (!memberId || !token || !['USER', 'AGENT'].includes(role)) return;
		let disposed = false;
		let socket: WebSocket | null = null;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let authTimer: ReturnType<typeof setTimeout> | undefined;
		let retries = 0;
		let denied = false;
		const connect = () => {
			if (disposed || !currentAccount() || denied) return;
			try {
				setConnection('Connecting…');
				socket = new WebSocket(privateSocketUrl());
				const activeSocket = socket;
				let authenticated = false;
				socket.onopen = () => {
					if (!currentAccount() || disposed) {
						activeSocket.close();
						return;
					}
					activeSocket.send(JSON.stringify({ event: 'authenticate', data: { token } }));
					authTimer = setTimeout(() => activeSocket.close(), 10000);
				};
				socket.onmessage = (event) => {
					if (disposed || !currentAccount()) return;
					try {
						const frame = JSON.parse(event.data);
						if (frame.event === 'connection:ready') {
							if (frame.data?.memberId !== memberId) {
								denied = true;
								activeSocket.close();
								return;
							}
							clearTimeout(authTimer);
							authenticated = true;
							retries = 0;
							setConnection('Realtime connected');
							void refreshListRef.current();
							void refreshHistory();
						} else if (authenticated && frame.event === 'message:new') {
							const message = frame.data as ChatMessage;
							if (!isMessagingId(message?._id) ||
								!isMessagingId(message.conversationId) ||
								!isMessagingId(message.senderId) ||
								typeof message.text !== 'string' ||
								messageTextError(message.text) ||
								typeof message.createdAt !== 'string' ||
								!Number.isFinite(Date.parse(message.createdAt))) {
								return;
							}
							if (message.serviceContext != null &&
								(!isMessagingId(message.serviceContext.serviceId) || typeof message.serviceContext.serviceTitle !== 'string')) {
								return;
							}
							const conversation = selectedRef.current;
							if (conversation?._id === message.conversationId && [conversation.userId, conversation.agentId].includes(message.senderId)) {
								setMessages((previous) => mergeMessages(previous, [message]));
								void refreshHistory();
							}
							void refreshListRef.current();
						}
					} catch { /* Ignore malformed frames without exposing their content. */ }
				};
				socket.onerror = () => {
					if (!disposed && currentAccount()) setConnection('Realtime unavailable; use Refresh');
				};
				socket.onclose = (event) => {
					clearTimeout(authTimer);
					if (disposed || !currentAccount()) return;
					if (event.code === 1008 || denied) {
						denied = true;
						accessDenied.current = true;
						listRequest.current++;
						threadRequest.current++;
						setLoadingList(false);
						setLoadingHistory(false);
						setConnection('Realtime access unavailable; log in again');
						setMessages([]);
						setConversations([]);
						selectedRef.current = null;
						setSelected(null);
						setThreadError('Access unavailable. Log in again to continue.');
						return;
					}
					setConnection('Reconnecting…');
					timer = setTimeout(connect, Math.min(15000, 1000 * 2 ** Math.min(retries++, 4)));
				};
			} catch {
				setConnection('Realtime unavailable; use Refresh');
			}
		};
		const foreground = () => {
			if (!currentAccount() || document.visibilityState !== 'visible') return;
			void refreshListRef.current();
			void refreshHistory();
		};
		connect();
		document.addEventListener('visibilitychange', foreground);
		return () => {
			disposed = true;
			clearTimeout(timer);
			clearTimeout(authTimer);
			document.removeEventListener('visibilitychange', foreground);
			if (socket) {
				socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
				socket.close();
			}
		};
	}, [memberId, role, token, currentAccount, refreshHistory]);

	const retryThread = () => {
		if (!currentAccount()) return;
		if (selectedRef.current) void refreshHistory();
		else setSelectionVersion((version) => version + 1);
	};

	return {
		conversations,
		page,
		setPage,
		conversationTotal,
		selected,
		messages,
		messageTotal,
		loadingList,
		loadingHistory,
		sending,
		starting,
		listError,
		threadError,
		actionError,
		connection,
		refreshConversations,
		refreshHistory,
		retryThread,
		resolveRecipient,
		startConversation,
		sendMessage,
	};
}
