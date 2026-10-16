import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FiArrowRight, FiCheck, FiHome, FiTool } from 'react-icons/fi';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import { Button, Input, Logo } from '../../libs/components/homehero/UI';
import { logIn, signUp } from '../../libs/auth';
import { sweetMixinErrorAlert } from '../../libs/sweetAlert';
import styles from '../../scss/homehero/account.module.scss';

export const getStaticProps = async ({ locale }: any) => ({
	props: { ...(await serverSideTranslations(locale, ['common'])) },
});

type SignupRole = 'USER' | 'AGENT';

const Join: NextPage = () => {
	const router = useRouter();
	const { t } = useTranslation('common');
	const copy = (text: string) => t(text, { defaultValue: text });
	const [input, setInput] = useState({ nick: '', password: '', phone: '', type: 'USER' as SignupRole });
	const [loginView, setLoginView] = useState(true);
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [pending, setPending] = useState(false);
	const [passwordError, setPasswordError] = useState(false);
	const submitting = useRef(false);
	const confirmRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!router.isReady) return;
		setLoginView(router.query.view !== 'signup');
		setInput((previous) => ({ ...previous, type: router.query.role === 'AGENT' ? 'AGENT' : 'USER' }));
		setShowPassword(false);
		setPasswordError(false);
	}, [router.isReady, router.query.view, router.query.role]);

	const handleInput = (name: 'nick' | 'password' | 'phone', value: string) => {
		setInput((previous) => ({ ...previous, [name]: value }));
		if (name === 'password') setPasswordError(false);
	};

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (submitting.current) return;
		if (!loginView && input.password !== confirmPassword) {
			setPasswordError(true);
			confirmRef.current?.focus();
			return;
		}
		submitting.current = true;
		setPending(true);
		try {
			if (loginView) await logIn(input.nick, input.password);
			else await signUp(input.nick, input.password, input.phone, input.type);
			await router.push(`${router.query.referrer ?? '/'}`);
		} catch (err: any) {
			await sweetMixinErrorAlert(err.message);
		} finally {
			submitting.current = false;
			setPending(false);
		}
	};

	const switchLink = {
		pathname: '/account/join',
		query: { ...router.query, view: loginView ? 'signup' : 'login' },
	};
	const agent = input.type === 'AGENT';
	const signupBenefits = agent
		? ['Showcase your home services', 'Create your professional profile', 'Join the HomeHero community']
		: ['Discover local home services', 'Save your favorite services', 'Join the HomeHero community'];

	return (
		<div className={`${styles.page} ${loginView ? '' : styles.signup}`}>
			<aside className={`${styles.art} ${loginView ? '' : styles.signupArt}`}>
				<Logo tone="light" className={styles.artLogo} />
				<div>
					<span className={styles.eyebrow}>{copy(!loginView && agent ? 'Grow with HomeHero' : 'Find your home hero')}</span>
					<h1>{copy(loginView ? 'Good help is closer than you think.' : agent ? 'Turn your skills into a thriving business.' : 'Your trusted home team starts here.')}</h1>
					<p>{copy(loginView ? 'Join a community of homeowners and skilled local professionals.' : agent ? 'Showcase your services and connect with people looking for local home professionals.' : 'Discover home services and find local professionals whenever you need help.')}</p>
					{!loginView && <div className={styles.benefits}>{signupBenefits.map((benefit) => <span key={benefit}><FiCheck size={16} aria-hidden="true" />{copy(benefit)}</span>)}</div>}
				</div>
			</aside>
			<div className={`${styles.formWrap} ${loginView ? '' : styles.signupWrap}`}>
				<div className={`${styles.form} ${loginView ? '' : styles.signupForm}`}>
					<div className={styles.mobileLogo}><Logo /></div>
					<h1>{copy(loginView ? 'Welcome back' : 'Create your account')}</h1>
					<p>{copy(loginView ? 'Log in to continue to HomeHero.' : 'Join HomeHero in just a few steps.')}</p>
					{!loginView && (
						<>
							<p className={styles.fieldLabel}>{copy('How will you use HomeHero?')}</p>
							<div className={styles.roles} role="group" aria-label={copy('Account type')}>
								{(['USER', 'AGENT'] as const).map((role) => (
									<button key={role} type="button" disabled={pending} aria-pressed={input.type === role} className={input.type === role ? styles.selected : ''} onClick={() => setInput((previous) => ({ ...previous, type: role }))}>
										{role === 'USER' ? <FiHome size={24} aria-hidden="true" /> : <FiTool size={24} aria-hidden="true" />}
										<strong>{copy(role === 'USER' ? 'User' : 'Agent')}</strong>
										<small>{copy(role === 'USER' ? 'I’m looking for home services' : 'I want to offer services')}</small>
										{input.type === role && <FiCheck className={styles.roleCheck} aria-hidden="true" />}
									</button>
								))}
							</div>
						</>
					)}
					<form onSubmit={submit} aria-busy={pending}>
						<div className={loginView ? undefined : styles.fieldGrid}>
							<label htmlFor="homehero-nickname">
								{copy('Nickname')}
								<Input id="homehero-nickname" name="username" autoComplete="username" value={input.nick} onChange={(event) => handleInput('nick', event.target.value)} placeholder={copy('Enter your nickname')} minLength={3} maxLength={12} required disabled={pending} />
							</label>
							{!loginView && <label htmlFor="homehero-phone">{copy('Phone number')}<Input id="homehero-phone" name="phone" type="tel" autoComplete="tel" value={input.phone} onChange={(event) => handleInput('phone', event.target.value)} placeholder={copy('Enter your phone number')} required disabled={pending} /></label>}
						</div>
						<div className={loginView ? undefined : styles.fieldGrid}>
							<label htmlFor="homehero-password">
								{copy('Password')}
								<Input id="homehero-password" name="password" type={!loginView && showPassword ? 'text' : 'password'} autoComplete={loginView ? 'current-password' : 'new-password'} value={input.password} onChange={(event) => handleInput('password', event.target.value)} placeholder={copy('5–12 characters')} minLength={5} maxLength={12} required disabled={pending} />
							</label>
							{!loginView && <label htmlFor="homehero-confirm-password">{copy('Confirm password')}<Input ref={confirmRef} id="homehero-confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(false); }} placeholder={copy('Repeat password')} minLength={5} maxLength={12} required disabled={pending} aria-invalid={passwordError} aria-describedby={passwordError ? 'homehero-password-error' : undefined} /></label>}
						</div>
						{passwordError && <p id="homehero-password-error" className={styles.error} role="alert">{copy('Passwords do not match.')}</p>}
						{!loginView && <label className={styles.showPassword}><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} disabled={pending} />{copy('Show passwords')}</label>}
						<Button type="submit" className={styles.fullWidth} disabled={pending || !input.nick || !input.password || (!loginView && (!input.phone || !confirmPassword))}>
							{pending ? copy('Please wait…') : loginView ? copy('Log in') : copy(agent ? 'Create Agent account' : 'Create User account')}
							<FiArrowRight size={17} aria-hidden="true" />
						</Button>
					</form>
					<p className={styles.switch}>{copy(loginView ? 'New to HomeHero?' : 'Already have an account?')} <Link href={switchLink} shallow>{loginView ? copy('Create account') : copy('Log in')}</Link></p>
				</div>
			</div>
		</div>
	);
};

export default withLayoutHomeHero(Join);
