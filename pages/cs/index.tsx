import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FiHelpCircle, FiMessageSquare, FiVolume2 } from 'react-icons/fi';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import Faq from '../../libs/components/cs/Faq';
import Notice from '../../libs/components/cs/Notice';
import Inquiry from '../../libs/components/cs/Inquiry';
import styles from '../../scss/homehero/support.module.scss';

export const getStaticProps = async ({ locale }: { locale: string }) => ({
	props: { ...(await serverSideTranslations(locale, ['common'])) },
});

const tabs = [
	{ value: 'faq', label: 'Frequently asked questions', icon: FiHelpCircle },
	{ value: 'notice', label: 'Announcements', icon: FiVolume2 },
	{ value: 'inquiry', label: 'My requests', icon: FiMessageSquare },
];

const CS = () => {
	const router = useRouter();
	const { t: translate } = useTranslation('common');
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);
	const tab = tabs.some((item) => item.value === router.query.tab) ? router.query.tab : 'faq';

	return (
		<div className={styles.page}>
			<Head><title>{translate('Support')} | HomeHero</title></Head>
			<section className={styles.hero}>
				<div className={styles.container}>
					<span className={styles.eyebrow}>{translate('HomeHero Support')}</span>
					<h1>{translate('How can we help?')}</h1>
					<p>{translate('Find answers, read platform updates, or ask our team for help.')}</p>
				</div>
			</section>
			<div className={`${styles.container} ${styles.body}`}>
				<nav className={styles.tabs} aria-label={translate('Support sections')}>
					{tabs.map(({ value, label, icon: Icon }) => (
						<Link
							key={value}
							href={{ pathname: '/cs', query: { ...router.query, tab: value }, hash: router.asPath.split('#')[1] }}
							aria-current={tab === value ? 'page' : undefined}
							className={tab === value ? styles.activeTab : ''}
							shallow
							scroll={false}
						>
							<Icon aria-hidden="true" />
							{translate(label)}
						</Link>
					))}
				</nav>
				{mounted && router.isReady && (
					<section className={styles.content} aria-label={translate(tabs.find((item) => item.value === tab)!.label)}>
						{tab === 'faq' && <Faq />}
						{tab === 'notice' && <Notice />}
						{tab === 'inquiry' && <Inquiry />}
					</section>
				)}
			</div>
		</div>
	);
};

export default withLayoutHomeHero(CS);
