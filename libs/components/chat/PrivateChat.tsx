import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client';
import { FiMessageCircle, FiRefreshCw, FiSearch, FiSend } from 'react-icons/fi';
import { userVar } from '../../../apollo/store';
import { getJwtToken, updateUserInfo } from '../../auth';
import usePrivateMessaging, { isMessagingId } from '../../hooks/usePrivateMessaging';
import type { Service } from '../../types/service/service';
import type { Conversation } from '../../types/messaging/messaging';
import { Button, Input } from '../homehero/UI';
import { ServiceImage } from '../service/ServiceCard';
import styles from '../../../scss/homehero/chat.module.scss';

const scalar = (value: string | string[] | undefined) => typeof value === 'string' ? value.toLowerCase() : '';
const dateLabel = (value: string, locale: string) => new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
const timeLabel = (value: string, locale: string) => new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

interface ChatPanelProps {
	memberId: string;
	role: string;
}

const ChatPanel = ({ memberId, role }: ChatPanelProps) => {
	const router = useRouter();
	const conversationId = scalar(router.query.conversationId);
	const agentId = scalar(router.query.agentId);
	const suppliedServiceId = scalar(router.query.serviceId);
	const entry = Boolean(agentId && !conversationId);
	const validRecipient = isMessagingId(agentId);
	const [entryService, setEntryService] = useState<Service | null>(null);
	const [entryLoading, setEntryLoading] = useState(true);
	const [entryError, setEntryError] = useState('');
	const [entryVersion, setEntryVersion] = useState(0);
	const [search, setSearch] = useState('');
	const [draft, setDraft] = useState('');
	const [contextService, setContextService] = useState<{ conversationId: string; serviceId: string; title: string } | null>(null);
	const [navigationError, setNavigationError] = useState('');
	const history = useRef<HTMLDivElement>(null);
	const nearBottom = useRef(true);
	const scrollAnchor = useRef<{ id: string; offset: number } | null>(null);
	const entryKey = `${agentId}:${suppliedServiceId}`;
	const activeEntry = useRef(entryKey);
	activeEntry.current = entryKey;
	const activeRoute = useRef(conversationId);
	activeRoute.current = conversationId;
	const locale = router.locale === 'kr' ? 'ko' : router.locale || 'en';
	const chat = usePrivateMessaging(memberId, role, conversationId);

	/** APOLLO REQUESTS **/
	const visibleConversations = chat.conversations.filter((conversation) => {
		const participant = role === 'USER' ? conversation.agentData : conversation.userData;
		return (participant?.memberNick || '').toLowerCase().includes(search.toLowerCase().trim());
	});
	const participant = chat.selected && (role === 'USER' ? chat.selected.agentData : chat.selected.userData);

	/** HANDLERS **/
	const selectConversation = async (conversation: Conversation) => {
		try {
			await router.push({ pathname: '/chat', query: { conversationId: conversation._id } }, undefined, { shallow: true, scroll: false });
		} catch {
			setNavigationError('Unable to open the conversation. Please try again.');
		}
	};

	const startHandler = async (serviceId: string, title: string) => {
		const requestedEntry = entryKey;
		const conversation = await chat.startConversation(serviceId, agentId);
		if (!conversation || userVar()._id !== memberId || activeEntry.current !== requestedEntry) return;
		setContextService({ conversationId: conversation._id, serviceId, title });
		try {
			await router.replace({ pathname: '/chat', query: { conversationId: conversation._id } }, undefined, { shallow: true, scroll: false });
		} catch {
			setNavigationError('Conversation confirmed, but navigation failed. Open it from Messages.');
		}
	};

	const sendHandler = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const selectedId = conversationId;
		const context = contextService?.conversationId === selectedId ? contextService.serviceId : undefined;
		const sent = await chat.sendMessage(draft, context);
		if (sent && userVar()._id === memberId && activeRoute.current === selectedId) setDraft('');
	};

	const loadOlder = async () => {
		const container = history.current;
		const firstVisible = container &&
			Array.from(container.querySelectorAll<HTMLElement>('[data-message-id]')).find((element) => element.offsetTop + element.offsetHeight >= container.scrollTop);
		if (container && firstVisible) scrollAnchor.current = {
			id: firstVisible.dataset.messageId || '',
			offset: firstVisible.offsetTop - container.scrollTop
		};
		await chat.refreshHistory(true);
	};

	/** LIFECYCLES **/
	useEffect(() => {
		setDraft('');
		setNavigationError('');
		scrollAnchor.current = null;
		nearBottom.current = true;
	}, [conversationId]);

	useEffect(() => {
		let cancelled = false;
		const token = getJwtToken();
		const stillCurrent = () => !cancelled && userVar()._id === memberId && getJwtToken() === token && activeEntry.current === entryKey;
		setEntryService(null);
		setEntryError('');
		setEntryLoading(true);
		if (!entry || role !== 'USER' || !validRecipient || (suppliedServiceId && !isMessagingId(suppliedServiceId))) return;
		const resolveEntry = async () => {
			try {
				const result = await chat.resolveRecipient(agentId, suppliedServiceId);
				if (!stillCurrent()) return;
				if (result.conversation) {
					setContextService(result.service ? {
						conversationId: result.conversation._id,
						serviceId: result.service._id,
						title: result.service.serviceTitle
					} : null);
					await router.replace({ pathname: '/chat', query: { conversationId: result.conversation._id } }, undefined, { shallow: true, scroll: false });
				} else {
					setEntryService(result.service);
				}
			} catch {
				if (stillCurrent()) setEntryError('Unable to open this conversation. Please try again.');
			} finally {
				if (stillCurrent()) setEntryLoading(false);
			}
		};
		void resolveEntry();
		return () => {
			cancelled = true;
		};
	}, [entry, entryKey, agentId, suppliedServiceId, memberId, role, validRecipient, chat.resolveRecipient, router, entryVersion]);

	useEffect(() => {
		const container = history.current;
		if (!container) return;
		if (scrollAnchor.current) {
			const anchor = Array.from(container.querySelectorAll<HTMLElement>('[data-message-id]')).find((element) => element.dataset.messageId === scrollAnchor.current?.id);
			if (anchor) container.scrollTop = anchor.offsetTop - scrollAnchor.current.offset;
			scrollAnchor.current = null;
		} else if (nearBottom.current) {
			container.scrollTop = container.scrollHeight;
		}
	}, [chat.messages]);

	return (
		<div className={styles.page}>
			<Head>
				<title>Messages | HomeHero</title>
			</Head>
			<div className={styles.shell}>
				<aside className={styles.conversations}>
					<div className={styles.sideHead}>
						<h1>Messages</h1>
						<button onClick={() => void chat.refreshConversations()} aria-label="Refresh conversations">
							<FiRefreshCw />
						</button>
					</div>
					<div className={styles.search}>
						<FiSearch aria-hidden="true" />
						<Input
							aria-label="Search loaded conversations"
							placeholder="Search conversations"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>
					<p className={styles.searchHint}>Search applies to this loaded page.</p>
					<div className={styles.conversationRows}>
						{chat.loadingList && (
							<p className={styles.notice} role="status">Loading conversations…</p>
						)}
						{chat.listError && (
							<p className={styles.notice} role="alert">{chat.listError}</p>
						)}
						{!chat.loadingList &&
							!chat.listError &&
							!visibleConversations.length && (
							<p className={styles.notice}>
								{search ? 'No matching conversations on this page.' : 'No conversations yet.'}
							</p>
						)}
						{visibleConversations.map((conversation) => {
							const other = role === 'USER' ? conversation.agentData : conversation.userData;
							return (
								<button
									key={conversation._id}
									className={`${styles.conversation} ${conversation._id === conversationId ? styles.active : ''}`}
									onClick={() => void selectConversation(conversation)}
									aria-label={`Open conversation with ${other?.memberNick || 'Participant unavailable'}`}
									aria-current={conversation._id === conversationId ? 'true' : undefined}
								>
									<ServiceImage
										avatar
										path={other?.memberImage}
										alt={other?.memberNick || 'Participant unavailable'}
										className={styles.avatar}
									/>
									<span className={styles.conversationCopy}>
										<strong>{other?.memberNick || 'Participant unavailable'}</strong>
										<small>{conversation.lastMessage?.text || 'No messages yet'}</small>
									</span>
									<small className={styles.conversationTime}>{dateLabel(conversation.activityAt, locale)}</small>
								</button>
							);
						})}
					</div>
					<div className={styles.listPagination}>
						<button
							disabled={chat.page === 1 || chat.loadingList}
							onClick={() => chat.setPage(chat.page - 1)}
							aria-label="Previous conversations"
						>
							‹
						</button>
						<span>{chat.page}</span>
						<button
							disabled={chat.page * 20 >= chat.conversationTotal || chat.loadingList}
							onClick={() => chat.setPage(chat.page + 1)}
							aria-label="Next conversations"
						>
							›
						</button>
					</div>
				</aside>
				<section className={styles.thread} aria-label="Private conversation">
					{entry ? (
						<div className={styles.entry}>
							<h2>Message Agent</h2>
							{role !== 'USER' ? <p>Only customers can start a conversation. Open an existing conversation to reply.</p> : !validRecipient || (suppliedServiceId && !isMessagingId(suppliedServiceId)) ? <p role="alert">Invalid recipient or service link.</p> : (
								<>
									{entryLoading ? <p role="status">Checking your conversation…</p> : entryError ? (
										<div role="alert">
											<p>{entryError}</p>
											<Button variant="secondary" onClick={() => setEntryVersion((version) => version + 1)}>Retry</Button>
										</div>
									) : entryService ? (
										<>
											<p>Start a private conversation with this provider.</p>
											<div className={styles.serviceOption}>
												<strong>{entryService.serviceTitle}</strong>
												<Button disabled={chat.starting} onClick={() => void startHandler(entryService._id, entryService.serviceTitle)}>{chat.starting ? 'Please wait…' : 'Start conversation'}</Button>
											</div>
										</>
									) : <p>No active service is available to start a conversation with this provider.</p>}
								</>
							)}
							{(chat.actionError || navigationError) && (
								<p className={styles.error} role="alert">{chat.actionError || navigationError}</p>
							)}
						</div>
					) : !conversationId ? (
						<div className={styles.empty}>
							<FiMessageCircle size={32} />
							<h2>Your conversations</h2>
							<p>
								{role === 'USER' ? 'Select a conversation or find a Service to contact its provider.' : 'Select a conversation to reply. Customers appear here when they contact you.'}
							</p>
							<p role="status">{chat.connection}</p>
							{role === 'USER' && (
								<Link href="/service">Explore services</Link>
							)}
						</div>
					) : (
						<>
							<div className={styles.threadHead}>
								<ServiceImage
									avatar
									path={participant?.memberImage}
									alt={participant?.memberNick || 'Participant unavailable'}
									className={styles.avatar}
								/>
								<div>
									<strong>{participant?.memberNick || 'Private conversation'}</strong>
									<small>{chat.connection}</small>
								</div>
								<button aria-label="Refresh message history" onClick={chat.retryThread}>
									<FiRefreshCw />
								</button>
							</div>
							<div
								className={styles.messages}
								ref={history}
								onScroll={() => {
									const container = history.current;
									if (container) nearBottom.current = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
								}}
							>
								{chat.loadingHistory && (
									<p className={styles.notice} role="status">Loading messages…</p>
								)}
								{chat.threadError && (
									<p className={styles.error} role="alert">{chat.threadError}</p>
								)}
								{chat.messages.length < chat.messageTotal && (
									<Button
										variant="secondary"
										disabled={chat.loadingHistory}
										onClick={() => void loadOlder()}
									>
										Load older messages
									</Button>
								)}
								{!chat.loadingHistory &&
									!chat.threadError &&
									chat.selected &&
									!chat.messages.length && (
									<p className={styles.notice}>No messages yet. Start with a message.</p>
								)}
								{chat.messages.map((message, index) => (
									<div key={message._id} data-message-id={message._id}>
										{(index === 0 || dateLabel(message.createdAt, locale) !== dateLabel(chat.messages[index - 1].createdAt, locale)) && (
											<span className={styles.date}>{dateLabel(message.createdAt, locale)}</span>
										)}
										<div className={`${styles.message} ${message.senderId === memberId ? styles.sent : ''}`}>
											{message.serviceContext && (
												<small className={styles.serviceContext}>Regarding: {message.serviceContext.serviceTitle}</small>
											)}
											<p>{message.text}</p>
											<time dateTime={message.createdAt}>{timeLabel(message.createdAt, locale)}</time>
										</div>
									</div>
								))}
							</div>
							<form className={styles.composer} onSubmit={sendHandler}>
								{contextService?.conversationId === conversationId && (
									<div className={styles.context}>Regarding {contextService.title}<button type="button" onClick={() => setContextService(null)}>Remove context</button></div>
								)}
								{(chat.actionError || navigationError) && (
									<p className={styles.error} role="alert">{chat.actionError || navigationError}</p>
								)}
								<Input
									aria-label="Message text"
									value={draft}
									maxLength={2000}
									disabled={!chat.selected || !!chat.threadError || chat.sending}
									onChange={(event) => setDraft(event.target.value)}
									placeholder="Type a message…"
								/>
								<button
									type="submit"
									className={styles.send}
									disabled={!chat.selected || !!chat.threadError || chat.sending || !draft.trim()}
									aria-label="Send message"
								>
									<FiSend size={18} />
								</button>
							</form>
						</>
					)}
				</section>
			</div>
		</div>
	);
};

export default function PrivateChat() {
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const [ready, setReady] = useState(false);
	const [sessionVersion, setSessionVersion] = useState(0);
	useEffect(() => {
		setReady(true);
		const sessionChanged = (event: StorageEvent) => {
			if (!['accessToken', 'login', 'logout'].includes(event.key || '')) return;
			const token = getJwtToken();
			if (token) {
				try {
					updateUserInfo(token);
				} catch { /* Server authorization remains authoritative. */ }
			}
			setSessionVersion((version) => version + 1);
		};
		window.addEventListener('storage', sessionChanged);
		return () => window.removeEventListener('storage', sessionChanged);
	}, []);
	useEffect(() => {
		if (ready && router.isReady && !getJwtToken()) {
			void router.replace({ pathname: '/account/join', query: { view: 'login', referrer: router.asPath } });
		}
	}, [ready, router.isReady, router.asPath, user._id, sessionVersion]);

	if (!ready || !router.isReady || !user._id || !getJwtToken()) {
		return <div className={styles.empty} role="status">Loading Messages…</div>;
	}
	if (!['USER', 'AGENT'].includes(user.memberType) || user.memberStatus !== 'ACTIVE') {
		return <div className={styles.empty} role="alert">Private messaging is available to active customers and service providers.</div>;
	}
	return (
		<ChatPanel
			key={`${user._id}:${sessionVersion}`}
			memberId={user._id}
			role={user.memberType}
		/>
	);
}
