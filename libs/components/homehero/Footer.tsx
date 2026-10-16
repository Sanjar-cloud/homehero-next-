import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { FiSearch } from 'react-icons/fi';
import { Button, Input, Logo } from './UI';
import type { AuthLinks } from './UI';
import styles from '../../../scss/homehero/HomeHero.module.scss';

export default function Footer({ authLinks }: { authLinks: AuthLinks }) {
	const { t: translate } = useTranslation('common');
	const [notice, setNotice] = useState('');
	const copy = (text: string) => translate(text, { defaultValue: text });

	return (
		<footer className={styles.footer}>
			<div className={`${styles.container} ${styles.footerGrid}`}>
				<div>
					<Logo tone="light" />
					<p>{copy('Trusted local help for every corner of your home.')}</p>
				</div>
				<div>
					<strong>{copy('Explore')}</strong>
					<Link href="/service">{copy('Browse services')}</Link>
					<Link href={authLinks.agentSignup} shallow>{copy('Join as Agent')}</Link>
					<Link href="/mypage">{copy('Your account')}</Link>
				</div>
				<div>
					<strong>{copy('Support')}</strong>
					<Link href="/cs?tab=faq">{copy('Help center')}</Link>
					<button type="button" className={styles.footerLink} onClick={() => setNotice('Safety information is not available yet.')}>{copy('Safety')}</button>
					<button type="button" className={styles.footerLink} onClick={() => setNotice('The contact channel is not available yet.')}>{copy('Contact')}</button>
				</div>
				<div>
					<strong>{copy('Stay in the loop')}</strong>
					<p>{copy('Tips and trusted pros, in your inbox.')}</p>
					<form className={styles.footerInput} onSubmit={(event) => {
						event.preventDefault();
						setNotice('Newsletter subscription is not available yet. Your email has not been submitted or saved.');
					}}>
						<Input type="email" placeholder={translate('Email address')} aria-label={translate('Newsletter email address')} />
						<Button type="submit" aria-label={translate('Subscribe')}><FiSearch size={18} aria-hidden="true" /></Button>
					</form>
				</div>
			</div>
			{notice && <p className={`${styles.container} ${styles.footerNotice}`} role="status">{copy(notice)}</p>}
			<div className={`${styles.container} ${styles.copyright}`}>{translate('© 2026 HomeHero.')} {copy('Find your home hero.')}</div>
		</footer>
	);
}
