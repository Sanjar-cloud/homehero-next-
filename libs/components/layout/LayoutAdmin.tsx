import React, { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client';
import { Avatar, Drawer, IconButton, Menu, MenuItem, useMediaQuery } from '@mui/material';
import { FiArrowUpRight, FiChevronDown, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { userVar } from '../../../apollo/store';
import { getJwtToken, logOut, updateUserInfo } from '../../auth';
import { MemberType } from '../../enums/member.enum';
import MenuList from '../admin/AdminMenuList';
import { Logo } from '../homehero/UI';
import { imageUrl } from '../service/ServiceCard';
import styles from '../../../scss/homehero/admin.module.scss';

const pageTitles: Record<string, string> = {
	'/_admin': 'Administration',
	'/_admin/users': 'Users',
	'/_admin/properties': 'Services',
	'/_admin/services': 'Services',
	'/_admin/community': 'Community',
	'/_admin/cs/faq': 'FAQ',
	'/_admin/cs/notice': 'Announcements',
	'/_admin/cs/inquiry': 'Support requests',
};

function withAdminLayout<P extends object>(Component: ComponentType<P>) {
	function AdminLayout(props: P) {
		const router = useRouter();
		const user = useReactiveVar(userVar);
		const desktop = useMediaQuery('(min-width:900px)');
		const [mobileOpen, setMobileOpen] = useState(false);
		const [anchorElUser, setAnchorElUser] = useState<HTMLElement | null>(null);
		const [loading, setLoading] = useState(true);
		// Retain the callbacks injected into existing admin pages.
		const [, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
		const [, setTitle] = useState('admin');
		const title = pageTitles[router.pathname] || 'Administration';

		/** LIFECYCLES **/
		useEffect(() => {
			const jwt = getJwtToken();
			if (jwt) updateUserInfo(jwt);
			setLoading(false);
		}, []);

		useEffect(() => {
			if (!loading && user.memberType !== MemberType.ADMIN) {
				router.push('/').then();
			}
		}, [loading, user, router]);

		useEffect(() => {
			setMobileOpen(false);
			setAnchorElUser(null);
		}, [router.asPath, user._id, desktop]);

		/** HANDLERS **/
		const closeNavigationHandler = () => setMobileOpen(false);

		const openUserMenuHandler = (event: React.MouseEvent<HTMLElement>) => {
			setAnchorElUser(event.currentTarget);
		};

		const closeUserMenuHandler = () => setAnchorElUser(null);

		const logoutHandler = () => {
			closeUserMenuHandler();
			logOut();
			router.push('/').then();
		};

		if (loading || user.memberType !== MemberType.ADMIN) return null;

		return (
			<main id="pc-wrap" className={`admin ${styles.root}`}>
				<Head><title>{title} | HomeHero Admin</title></Head>
				<Drawer
					variant={desktop ? 'permanent' : 'temporary'}
					open={desktop || mobileOpen}
					onClose={closeNavigationHandler}
					PaperProps={{ className: styles.sidebar }}
				>
					<div className={styles.sidebarTop}>
						<Logo tone="light" />
						<IconButton className={styles.closeNavigation} aria-label="Close navigation" onClick={closeNavigationHandler}>
							<FiX aria-hidden="true" />
						</IconButton>
					</div>
					<div className={styles.adminIdentity}>
						<Avatar src={imageUrl(user.memberImage)} alt={user.memberNick}>
							{user.memberNick.slice(0, 1).toUpperCase()}
						</Avatar>
						<div>
							<strong>{user.memberNick}</strong>
							<span>Administrator</span>
						</div>
					</div>
					<MenuList onNavigate={closeNavigationHandler} />
					<p className={styles.sidebarFooter}>HomeHero Administration</p>
				</Drawer>

				<header className={styles.header}>
					<div className={styles.headerTitle}>
						<IconButton
							className={styles.openNavigation}
							aria-label="Open navigation"
							aria-expanded={mobileOpen}
							onClick={() => setMobileOpen(true)}
						>
							<FiMenu aria-hidden="true" />
						</IconButton>
						<div>
							<span>Administration</span>
							<h1>{title}</h1>
						</div>
					</div>
					<div className={styles.headerActions}>
						<Link href="/" className={styles.siteLink}>
							<span>View website</span>
							<FiArrowUpRight aria-hidden="true" />
						</Link>
						<button
							type="button"
							className={styles.accountButton}
							onClick={openUserMenuHandler}
							aria-label="Admin account menu"
							aria-controls={anchorElUser ? 'admin-account-menu' : undefined}
							aria-expanded={Boolean(anchorElUser)}
							aria-haspopup="menu"
						>
							<Avatar src={imageUrl(user.memberImage)} alt={user.memberNick}>
								{user.memberNick.slice(0, 1).toUpperCase()}
							</Avatar>
							<strong>{user.memberNick}</strong>
							<FiChevronDown aria-hidden="true" />
						</button>
					</div>
				</header>
				<Menu
					id="admin-account-menu"
					anchorEl={anchorElUser}
					open={Boolean(anchorElUser)}
					onClose={closeUserMenuHandler}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
					transformOrigin={{ vertical: 'top', horizontal: 'right' }}
					PaperProps={{ className: styles.accountMenu }}
				>
					<MenuItem onClick={logoutHandler}>
						<FiLogOut aria-hidden="true" />
						Logout
					</MenuItem>
				</Menu>

				<div id="bunker" className={styles.content}>
					<Component {...props} setSnackbar={setSnackbar} setTitle={setTitle} />
				</div>
			</main>
		);
	}

	AdminLayout.displayName = `withAdminLayout(${Component.displayName || Component.name || 'Component'})`;
	return AdminLayout;
}

export default withAdminLayout;
