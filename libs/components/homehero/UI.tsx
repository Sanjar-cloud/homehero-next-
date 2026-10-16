import { useTranslation } from 'next-i18next';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import type { UrlObject } from 'url';
import Link from 'next/link';
import { FiHome, FiStar } from 'react-icons/fi';
import styles from '../../../scss/homehero/HomeHero.module.scss';

export interface AuthLinks {
	login: UrlObject;
	signup: UrlObject;
	agentSignup: UrlObject;
}

export function Logo({ tone = 'dark', className = '' }: { tone?: 'dark' | 'light'; className?: string }) {
	const { t: translate } = useTranslation('common');
	return (
		<Link href="/" className={`${styles.logo} ${tone === 'light' ? styles.logoLight : ''} ${className}`} aria-label={translate('HomeHero home')}>
			<span className={styles.logoMark} aria-hidden="true"><FiHome size={19} strokeWidth={2.5} /><FiStar size={9} fill="currentColor" /></span>
			<span>Home<span className={styles.logoAccent}>Hero</span></span>
		</Link>
	);
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
	const variants = { primary: styles.primary, secondary: styles.secondary, ghost: styles.ghost };
	return <button {...props} type={type} className={`${styles.button} ${variants[variant]} ${className}`} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...props }, ref) {
	return <input {...props} ref={ref} className={`${styles.input} ${className}`} />;
});
