import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiFileText, FiHelpCircle, FiLayers, FiMessageSquare, FiUsers } from 'react-icons/fi';
import styles from '../../../scss/homehero/admin.module.scss';

interface AdminMenuListProps {
	onNavigate?: () => void;
}

const mainLinks = [
	{ label: 'Users', href: '/_admin/users', icon: FiUsers },
	{ label: 'Services', href: '/_admin/services', icon: FiLayers },
	{ label: 'Community', href: '/_admin/community', icon: FiMessageSquare },
];

const supportLinks = [
	{ label: 'FAQ', href: '/_admin/cs/faq', icon: FiHelpCircle },
	{ label: 'Announcements', href: '/_admin/cs/notice', icon: FiFileText },
	{ label: 'Requests', href: '/_admin/cs/inquiry', icon: FiMessageSquare },
];

const AdminMenuList = ({ onNavigate }: AdminMenuListProps) => {
	const router = useRouter();
	const isActive = (href: string) => router.pathname === href || router.pathname.startsWith(`${href}/`);

	return (
		<nav className={styles.navigation} aria-label="Admin navigation">
			<p className={styles.menuLabel}>Management</p>
			{mainLinks.map(({ label, href, icon: Icon }) => (
				<Link
					key={href}
					href={href}
					className={`${styles.navLink} ${isActive(href) ? styles.activeLink : ''}`}
					aria-current={isActive(href) ? 'page' : undefined}
					onClick={onNavigate}
				>
					<Icon aria-hidden="true" />
					<span>{label}</span>
				</Link>
			))}
			<section className={styles.supportGroup} aria-labelledby="admin-support-heading">
				<h2 id="admin-support-heading" className={styles.menuLabel}>Support</h2>
				{supportLinks.map(({ label, href, icon: Icon }) => (
					<Link
						key={href}
						href={href}
						className={`${styles.navLink} ${isActive(href) ? styles.activeLink : ''}`}
						aria-current={isActive(href) ? 'page' : undefined}
						onClick={onNavigate}
					>
						<Icon aria-hidden="true" />
						<span>{label}</span>
					</Link>
				))}
			</section>
		</nav>
	);
};

export default AdminMenuList;
