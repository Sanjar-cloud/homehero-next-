import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client';
import { FiChevronRight, FiFileText, FiHeart, FiMessageCircle, FiPlus, FiSettings, FiTool, FiUser, FiUsers } from 'react-icons/fi';
import { userVar } from '../../../apollo/store';
import { ServiceImage } from '../service/ServiceCard';
import styles from '../../../scss/homehero/mypage.module.scss';

interface MyPageLayoutProps {
	category: string;
	children: ReactNode;
}

export const userTabs = [
	{ label: 'Profile', category: 'myProfile', Icon: FiUser },
	{ label: 'Favorites', category: 'myFavorites', Icon: FiHeart },
	{ label: 'My Posts', category: 'myArticles', Icon: FiFileText },
	{ label: 'Followings', category: 'followings', Icon: FiUsers },
	{ label: 'Account settings', category: 'accountSettings', Icon: FiSettings },
];
const agentTabs = [
	{ label: 'Profile', category: 'myProfile', Icon: FiUser },
	{ label: 'Add Service', category: 'addService', Icon: FiPlus },
	{ label: 'My Services', category: 'myServices', Icon: FiTool },
	{ label: 'My Posts', category: 'myArticles', Icon: FiFileText },
	{ label: 'Followers', category: 'followers', Icon: FiUsers },
	{ label: 'Followings', category: 'followings', Icon: FiHeart },
];

export function MyPageComingSoon({ category }: { category: string }) {
	const user = useReactiveVar(userVar);
	const providerOnly = ['addService', 'myServices'].includes(category) && user.memberType !== 'AGENT';
	const panels = {
		addService: { title: 'Add Service', text: 'The service creation interface is not connected yet.', Icon: FiPlus },
		myServices: { title: 'My Services', text: 'The service management interface is not connected yet.', Icon: FiTool },
		messages: { title: 'Messages', text: 'Private messaging is available in the backend. This interface is not connected yet.', Icon: FiMessageCircle },
	};
	const panel = panels[category as keyof typeof panels];
	const Icon = panel?.Icon || FiUser;

	return (
		<section>
			<div className={styles.sectionHeading}>
				<h2>{panel?.title || 'Page unavailable'}</h2>
				<p>{providerOnly ? 'This destination is for service providers.' : panel?.text || 'This My Page category is not available.'}</p>
			</div>
			<div className={styles.state}>
				<Icon size={32} aria-hidden="true" />
				<h3>{providerOnly ? 'Service provider access' : 'Not available yet'}</h3>
				<p>No {category === 'messages' ? 'message' : 'request'} has been submitted.</p>
				<Link href="/mypage" className={styles.textLink}>Back to Profile</Link>
				<Link href="/service" className={styles.textLink}>Explore services</Link>
			</div>
		</section>
	);
}

const MyPageLayout = ({ category, children }: MyPageLayoutProps) => {
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const [clientReady, setClientReady] = useState(false);
	const [redirectError, setRedirectError] = useState(false);
	const loginHref = { pathname: '/account/join', query: { view: 'login', referrer: router.asPath } };
	const name = user.memberFullName || user.memberNick;
	const avatar = user.memberImage?.startsWith('/img/') ? undefined : user.memberImage;
	const agent = user.memberType === 'AGENT';
	const tabs = agent ? agentTabs : userTabs;

	/** LIFECYCLES **/
	useEffect(() => { setClientReady(true); }, []);
	useEffect(() => {
		if (!clientReady || !router.isReady || user._id) return;
		void router.replace(loginHref).catch(() => setRedirectError(true));
	}, [clientReady, router.isReady, user._id, router.asPath]);

	return (
		<div className={styles.page}>
			<Head><title>{`${category === 'messages' ? 'Messages' : 'My Page'} | HomeHero`}</title></Head>
			{!clientReady || !router.isReady || !user._id ? (
				<div className={`${styles.container} ${styles.state}`} role={redirectError ? 'alert' : 'status'}>
					<p>{redirectError ? 'Unable to open login. Please try again.' : 'Loading your account…'}</p>
					{redirectError && <Link href={loginHref} className={styles.textLink}>Log in</Link>}
				</div>
			) : (
				<>
					<div className={`${styles.container} ${styles.pageHeading}`}>
						<div>
							<span className={styles.eyebrow}>Your HomeHero hub</span>
							<h1>My Page</h1>
							<p>{agent ? 'Manage your profile, activity, and services in one place.' : 'Manage your profile, favorites, posts, and activity in one place.'}</p>
						</div>
					</div>
					<div className={`${styles.container} ${styles.layout}`}>
						<aside className={styles.sidebar}>
							<div className={styles.miniProfile}>
								<ServiceImage
									path={avatar}
									alt={name}
									avatar
									className={`${styles.miniAvatar} ${agent ? styles.agentAvatar : ''}`}
								/>
								<span><strong>{name}</strong><small>{agent ? 'Professional' : 'Customer'}</small></span>
							</div>
							<nav aria-label="My Page navigation">
								{tabs.map(({ label, category: target, Icon }) => (
									<Link
										key={target}
										href={{ pathname: '/mypage', query: { category: target } }}
										className={category === target ? styles.active : ''}
										aria-current={category === target ? 'page' : undefined}
										scroll={false}
									>
										<Icon size={18} aria-hidden="true" />
										{label}
										<FiChevronRight size={15} aria-hidden="true" />
									</Link>
								))}
							</nav>
						</aside>
						<div className={styles.content} key={`${user._id}:${category}`}>{children}</div>
					</div>
				</>
			)}
		</div>
	);
};

export default MyPageLayout;
