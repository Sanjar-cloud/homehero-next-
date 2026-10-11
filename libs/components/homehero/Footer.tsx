import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { Logo } from './UI';
import type { AuthLinks } from './UI';
import styles from '../../../scss/homehero/HomeHero.module.scss';

export default function Footer({ authLinks }: { authLinks: AuthLinks }) {
	const { t } = useTranslation('common');
	const copy = (text: string) => t(text, { defaultValue: text });
	return (
		<footer className={styles.footer}>
			<div className={`${styles.container} ${styles.footerGrid}`}>
				<div><Logo tone="light" /><p>{copy('Local help for every corner of your home.')}</p></div>
				<div><strong>{copy('Explore')}</strong><Link href="/agent">{copy('Find Pros')}</Link><Link href={authLinks.agentSignup} shallow>{copy('Join as Agent')}</Link><Link href={authLinks.login} shallow>{copy('Your account')}</Link></div>
				<div><strong>{copy('Support')}</strong><Link href="/cs?tab=faq">{copy('Help center')}</Link><Link href="/cs?tab=inquiry">{copy('Contact')}</Link><Link href="/cs?tab=notice">{copy('Notices')}</Link></div>
			</div>
			<div className={`${styles.container} ${styles.copyright}`}>© 2026 HomeHero. {copy('Find your home hero.')}</div>
		</footer>
	);
}
