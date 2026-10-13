import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FiChevronDown, FiGlobe, FiHeart, FiLogOut, FiMenu, FiMessageCircle, FiShield, FiTool, FiUser, FiX } from 'react-icons/fi';
import type { CustomJwtPayload } from '../../types/customJwtPayload';
import { Logo } from './UI';
import { ServiceImage } from '../service/ServiceCard';
import type { AuthLinks } from './UI';
import styles from '../../../scss/homehero/HomeHero.module.scss';

interface HeaderProps {
	user: Pick<CustomJwtPayload, '_id' | 'memberNick' | 'memberFullName' | 'memberType' | 'memberImage'> | null;
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
	const role = user?.memberType || '';
	const section = router.pathname.split('/')[1];
	const activeLink = (route: string) => section === route ? styles.navActive : '';
	const avatar = user?.memberImage?.startsWith('/img/') ? undefined : user?.memberImage;

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
						<Link href="/service" className={activeLink('service')} aria-current={section === 'service' ? 'page' : undefined} onClick={closeMenus}>{copy('Services')}</Link>
						<Link href="/agent" className={activeLink('agent')} aria-current={section === 'agent' ? 'page' : undefined} onClick={closeMenus}>{router.locale === 'en' ? 'Find Pros' : t('Agents')}</Link>
						<Link href="/community?articleCategory=FREE" className={activeLink('community')} aria-current={section === 'community' ? 'page' : undefined} onClick={closeMenus}>{t('Community')}</Link>
						<Link href="/cs" className={activeLink('cs')} aria-current={section === 'cs' ? 'page' : undefined} onClick={closeMenus}>{router.locale === 'en' ? 'Support' : t('CS')}</Link>
					</div>
					<div className={styles.navAccount}>
						{authenticated ? (
							<div ref={accountRef} className={styles.accountWrap}>
								<button ref={accountButtonRef} type="button" className={styles.accountButton} aria-expanded={accountOpen} aria-controls="homehero-account" onClick={() => setAccountOpen(!accountOpen)}>
									<ServiceImage path={avatar} alt={name} avatar className={`${styles.avatar} ${role === 'AGENT' ? styles.agentAvatar : ''}`} />
									<span className={styles.accountName}><strong>{name}</strong><small>{role}</small></span>
									<FiChevronDown size={15} aria-hidden="true" />
								</button>
								{accountOpen && (
									<div id="homehero-account" className={styles.accountDropdown}>
										<div className={styles.accountSummary}>
											<ServiceImage path={avatar} alt={name} avatar className={`${styles.avatar} ${role === 'AGENT' ? styles.agentAvatar : ''}`} />
											<span><strong>{name}</strong><small>{role}</small></span>
										</div>
										<Link href="/mypage" onClick={closeMenus}>
											<FiUser size={16} aria-hidden="true" />{t('My Page')}
										</Link>
										{role === 'USER' && (
											<Link href="/mypage?category=myFavorites" onClick={closeMenus}>
												<FiHeart size={16} aria-hidden="true" />{copy('Favorites')}
											</Link>
										)}
										{role === 'AGENT' && (
											<>
												<Link href="/mypage?category=addService" onClick={closeMenus}>
													<FiTool size={16} aria-hidden="true" />{copy('Add Service')}
												</Link>
												<Link href="/mypage?category=myServices" onClick={closeMenus}>
													<FiShield size={16} aria-hidden="true" />{copy('My Services')}
												</Link>
											</>
										)}
										{(role === 'USER' || role === 'AGENT') && (
											<Link href="/chat" onClick={closeMenus}>
												<FiMessageCircle size={16} aria-hidden="true" />{copy('Messages')}
											</Link>
										)}
										{role === 'ADMIN' && (
											<Link href="/_admin" onClick={closeMenus}><FiUser size={16} aria-hidden="true" />{copy('Admin panel')}</Link>
										)}
										<button type="button" className={styles.logout} onClick={() => { closeMenus(); onLogout(); }}>
											<FiLogOut size={16} aria-hidden="true" />{copy('Logout')}
										</button>
									</div>
								)}
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
