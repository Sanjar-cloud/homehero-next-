import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FiChevronDown, FiGlobe, FiHeart, FiLogOut, FiMenu, FiUser, FiX } from 'react-icons/fi';
import type { CustomJwtPayload } from '../../types/customJwtPayload';
import { Logo } from './UI';
import type { AuthLinks } from './UI';
import styles from '../../../scss/homehero/HomeHero.module.scss';

interface HeaderProps {
	user: Pick<CustomJwtPayload, '_id' | 'memberNick' | 'memberFullName' | 'memberType'> | null;
	onLogout: () => void;
	authLinks: AuthLinks;
}

export default function Header({ user, onLogout, authLinks }: HeaderProps) {
	const router = useRouter();
	const { t } = useTranslation('common');
	const [menuOpen, setMenuOpen] = useState(false);
	const [accountOpen, setAccountOpen] = useState(false);
	const headerRef = useRef<HTMLElement>(null);
	const accountRef = useRef<HTMLDivElement>(null);
	const accountButtonRef = useRef<HTMLButtonElement>(null);
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const copy = (text: string) => t(text, { defaultValue: text });
	const authenticated = Boolean(user?._id);
	const name = user?.memberFullName || user?.memberNick || '';
	const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
	const role = user?.memberType || '';

	useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [router.asPath, user?._id]);
	useEffect(() => {
		if (!menuOpen && !accountOpen) return;
		const dismiss = (event: PointerEvent) => {
			if (!(event.target instanceof Node)) return;
			if (!headerRef.current?.contains(event.target)) { setMenuOpen(false); setAccountOpen(false); }
			else if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
		};
		const escape = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			if (accountOpen) { setAccountOpen(false); accountButtonRef.current?.focus(); }
			else { setMenuOpen(false); menuButtonRef.current?.focus(); }
		};
		document.addEventListener('pointerdown', dismiss);
		document.addEventListener('keydown', escape);
		return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
	}, [menuOpen, accountOpen]);

	const closeMenus = () => { setMenuOpen(false); setAccountOpen(false); };
	const changeLocale = async (locale: string) => {
		if (!['en', 'kr', 'ru'].includes(locale)) return;
		localStorage.setItem('locale', locale);
		closeMenus();
		await router.push(router.asPath, router.asPath, { locale });
	};
	return (
		<header className={styles.header} ref={headerRef}>
			<div className={`${styles.container} ${styles.navInner}`}>
				<Logo />
				<nav id="homehero-navigation" aria-label={copy('Main navigation')} className={`${styles.navigation} ${menuOpen ? styles.navigationOpen : ''}`}>
					<div className={styles.navPrimary}>
						<Link href="/agent" onClick={closeMenus}>{router.locale === 'en' ? 'Find Pros' : t('Agents')}</Link>
						<Link href="/community?articleCategory=FREE" onClick={closeMenus}>{t('Community')}</Link>
						<Link href="/cs" onClick={closeMenus}>{router.locale === 'en' ? 'Support' : t('CS')}</Link>
					</div>
					<div className={styles.navAccount}>
						{authenticated ? (
							<div ref={accountRef} className={styles.accountWrap}>
								<button ref={accountButtonRef} type="button" className={styles.accountButton} aria-expanded={accountOpen} aria-controls="homehero-account" onClick={() => setAccountOpen(!accountOpen)}>
									<span className={`${styles.avatar} ${role === 'AGENT' ? styles.agentAvatar : ''}`} aria-hidden="true">{initials}</span>
									<span className={styles.accountName}><strong>{name}</strong><small>{role}</small></span>
									<FiChevronDown size={15} aria-hidden="true" />
								</button>
								{accountOpen && <div id="homehero-account" className={styles.accountDropdown}>
									<div className={styles.accountSummary}><span className={`${styles.avatar} ${role === 'AGENT' ? styles.agentAvatar : ''}`} aria-hidden="true">{initials}</span><span><strong>{name}</strong><small>{role}</small></span></div>
									<Link href="/mypage" onClick={closeMenus}><FiUser size={16} aria-hidden="true" />{t('My Page')}</Link>
									{role === 'USER' && <Link href="/mypage?category=myFavorites" onClick={closeMenus}><FiHeart size={16} aria-hidden="true" />{copy('Favorites')}</Link>}
									{role === 'ADMIN' && <Link href="/_admin" onClick={closeMenus}><FiUser size={16} aria-hidden="true" />{copy('Admin panel')}</Link>}
									<button type="button" className={styles.logout} onClick={() => { closeMenus(); onLogout(); }}><FiLogOut size={16} aria-hidden="true" />{copy('Logout')}</button>
								</div>}
							</div>
						) : <>
							<Link href={authLinks.login} shallow onClick={closeMenus} className={styles.login}>{router.locale === 'en' ? 'Log in' : t('Login')}</Link>
							<Link href={authLinks.signup} shallow onClick={closeMenus} className={styles.signup}>{router.locale === 'en' ? 'Sign up' : t('Register')}</Link>
						</>}
						<label className={styles.locale}><FiGlobe size={15} aria-hidden="true" /><select aria-label={copy('Language')} value={router.locale || 'en'} onChange={(event) => void changeLocale(event.target.value)}><option value="en">EN</option><option value="kr">KR</option><option value="ru">RU</option></select></label>
					</div>
				</nav>
				<button ref={menuButtonRef} type="button" className={styles.menuButton} aria-label={copy('Toggle menu')} aria-expanded={menuOpen} aria-controls="homehero-navigation" onClick={() => { setMenuOpen(!menuOpen); setAccountOpen(false); }}>{menuOpen ? <FiX size={24} aria-hidden="true" /> : <FiMenu size={24} aria-hidden="true" />}</button>
			</div>
		</header>
	);
}
