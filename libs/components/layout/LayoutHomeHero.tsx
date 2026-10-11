import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client';
import { userVar } from '../../../apollo/store';
import { getJwtToken, logOut, updateUserInfo } from '../../auth';
import Header from '../homehero/Header';
import Footer from '../homehero/Footer';
import type { AuthLinks } from '../homehero/UI';
import styles from '../../../scss/homehero/HomeHero.module.scss';

export default function withLayoutHomeHero<P extends object>(Component: ComponentType<P>) {
	function HomeHeroLayout(props: P) {
		const router = useRouter();
		const user = useReactiveVar(userVar);
		const [authReady, setAuthReady] = useState(false);
		useEffect(() => {
			const jwt = getJwtToken();
			if (jwt) updateUserInfo(jwt);
			setAuthReady(true);
		}, []);
		const referrer = router.query.referrer;
		const query = referrer === undefined ? {} : { referrer };
		const authLinks: AuthLinks = {
			login: { pathname: '/account/join', query: { ...query, view: 'login' } },
			signup: { pathname: '/account/join', query: { ...query, view: 'signup' } },
			agentSignup: { pathname: '/account/join', query: { ...query, view: 'signup', role: 'AGENT' } },
		};
		return (
			<>
				<Head>
					<title>HomeHero</title><meta name="title" content="HomeHero" />
					<link key="homehero-inter" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
				</Head>
				<div className={styles.root}>
					<Header user={authReady ? user : null} onLogout={logOut} authLinks={authLinks} />
					<main><Component {...props} /></main>
					<Footer authLinks={authLinks} />
				</div>
			</>
		);
	}
	HomeHeroLayout.displayName = `withLayoutHomeHero(${Component.displayName || Component.name || 'Component'})`;
	return HomeHeroLayout;
}
