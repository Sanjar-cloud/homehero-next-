import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FiBell, FiCheck, FiMessageCircle, FiMessageSquare, FiRefreshCw, FiTool, FiX } from 'react-icons/fi';
import useNotifications from '../../hooks/useNotifications';
import { userVar } from '../../../apollo/store';
import { getJwtToken } from '../../auth';
import type { Notification } from '../../types/notification/notification';
import styles from '../../../scss/homehero/notification.module.scss';

interface Props {
	memberId: string;
	role: string;
	open: boolean;
	onToggle: () => void;
	onClose: () => void;
}

export function notificationTarget(item: Notification): string {
	if (item.notificationType === 'MESSAGE')
		return /^[a-f\d]{24}$/i.test(item.conversationId || '') ? `/chat?conversationId=${item.conversationId}` : '/chat';
	if (item.notificationType === 'SUPPORT_REPLY') return '/cs?tab=inquiry';
	return '/mypage?category=myServices';
}

function relativeTime(value: string, locale: string, now: number): string {
	const seconds = (Date.parse(value) - now) / 1000;
	const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	for (const [unit, size] of [
		['day', 86400],
		['hour', 3600],
		['minute', 60],
	] as const) {
		if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
	}
	return formatter.format(0, 'second');
}

export default function NotificationBell({ memberId, role, open, onToggle, onClose }: Props) {
	const { t } = useTranslation('common');
	const router = useRouter();
	const notifications = useNotifications(memberId, role);
	const wrapper = useRef<HTMLDivElement>(null);
	const button = useRef<HTMLButtonElement>(null);
	const [now, setNow] = useState(Date.now());
	const [navigationError, setNavigationError] = useState(false);
	const locale = router.locale === 'kr' ? 'ko' : router.locale || 'en';

	useEffect(() => {
		if (!open) return;
		setNow(Date.now());
		setNavigationError(false);
		const timer = setInterval(() => setNow(Date.now()), 60000);
		const outside = (event: PointerEvent) => {
			if (event.target instanceof Node && !wrapper.current?.contains(event.target)) onClose();
		};
		const escape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
				button.current?.focus();
			}
		};
		document.addEventListener('pointerdown', outside);
		document.addEventListener('keydown', escape);
		return () => {
			clearInterval(timer);
			document.removeEventListener('pointerdown', outside);
			document.removeEventListener('keydown', escape);
		};
	}, [open, onClose]);

	const openNotification = async (item: Notification) => {
		const token = getJwtToken();
		if (!(await notifications.markRead(item)) || userVar()._id !== memberId || getJwtToken() !== token) return;
		try {
			await router.push(notificationTarget(item));
			onClose();
		} catch {
			setNavigationError(true);
		}
	};
	const message = (item: Notification) => {
		if (item.notificationType === 'MESSAGE')
			return t('notification.message', { name: item.authorNick || t('notification.someone') });
		if (item.notificationType === 'SUPPORT_REPLY') return t('notification.supportReply');
		return t(`notification.serviceStatus.${item.serviceStatus || 'PAUSED'}`);
	};
	return (
		<div ref={wrapper} className={styles.wrapper}>
			<button
				ref={button}
				type="button"
				className={styles.bell}
				aria-label={t('notification.bell', { count: notifications.unreadCount })}
				aria-expanded={open}
				aria-controls="homehero-notifications"
				onClick={onToggle}
			>
				<FiBell size={21} aria-hidden="true" />
				{notifications.unreadCount > 0 && (
					<span className={styles.badge} aria-hidden="true">
						{notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
					</span>
				)}
			</button>
			{open && (
				<section id="homehero-notifications" aria-label={t('notification.title')} className={styles.panel}>
					<div className={styles.heading}>
						<h2>{t('notification.title')}</h2>
						<button type="button" aria-label={t('notification.close')} className={styles.iconButton} onClick={onClose}>
							<FiX size={18} aria-hidden="true" />
						</button>
					</div>
					<div className={styles.actions}>
						<button
							type="button"
							disabled={notifications.loading || notifications.pending || !notifications.unreadCount}
							onClick={() => void notifications.markRead()}
						>
							<FiCheck aria-hidden="true" />
							{t('notification.markAll')}
						</button>
						<button
							type="button"
							disabled={notifications.loading || notifications.pending}
							onClick={() => void notifications.refresh()}
							aria-label={t('notification.refresh')}
						>
							<FiRefreshCw aria-hidden="true" />
						</button>
					</div>
					{(notifications.error || navigationError) && (
						<p className={styles.error} role="alert">
							{navigationError ? t('notification.navigationError') : t(notifications.error)}
						</p>
					)}
					<div className={styles.content} aria-busy={notifications.loading}>
						{notifications.loading && !notifications.list.length ? (
							<p className={styles.empty} role="status">
								{t('notification.loading')}
							</p>
						) : !notifications.error && !notifications.list.length ? (
							<div className={styles.empty}>
								<FiBell size={28} aria-hidden="true" />
								<p>{t('notification.empty')}</p>
								<small>{t('notification.emptyHint')}</small>
							</div>
						) : null}
						<ul className={styles.list}>
							{notifications.list.map((item) => {
								const Icon =
									item.notificationType === 'MESSAGE'
										? FiMessageCircle
										: item.notificationType === 'SUPPORT_REPLY'
										? FiMessageSquare
										: FiTool;
								const unread = item.notificationStatus === 'WAIT';
								return (
									<li key={item._id}>
										<button
											type="button"
											className={`${styles.item} ${unread ? styles.unread : ''}`}
											disabled={notifications.pending}
											onClick={() => void openNotification(item)}
										>
											<span className={styles.typeIcon}>
												<Icon size={18} aria-hidden="true" />
											</span>
											<span className={styles.itemText}>
												<strong>{message(item)}</strong>
												{item.notificationType !== 'MESSAGE' && <span>{item.notificationTitle}</span>}
												<time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString(locale)}>
													{relativeTime(item.createdAt, locale, now)}
												</time>
											</span>
											{unread && (
												<span className={styles.dot}>
													<span className={styles.srOnly}>{t('notification.unread')}</span>
												</span>
											)}
										</button>
									</li>
								);
							})}
						</ul>
						{notifications.list.length < notifications.total && (
							<button
								type="button"
								className={styles.more}
								disabled={notifications.loading || notifications.pending}
								onClick={() => void notifications.loadMore()}
							>
								{t(notifications.loading ? 'notification.loading' : 'notification.loadMore')}
							</button>
						)}
					</div>
				</section>
			)}
		</div>
	);
}
