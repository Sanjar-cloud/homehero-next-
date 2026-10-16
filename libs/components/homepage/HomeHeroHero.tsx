import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiHeart, FiHome, FiSearch, FiSun } from 'react-icons/fi';
import { Button } from '../homehero/UI';
import { ServiceImage } from '../service/ServiceCard';
import { categories, emptyFilters, label, listingQuery, locations } from '../service/ServiceFilter';
import type { Service } from '../../types/service/service';
import styles from '../../../scss/homehero/home.module.scss';

interface HomeHeroHeroProps {
	featuredService?: Service;
	total?: number;
}

const heroImage = 'https://images.unsplash.com/photo-1676210133055-eab6ef033ce3?auto=format&fit=crop&w=900&q=80';

const HomeHeroHero = ({ featuredService, total }: HomeHeroHeroProps) => {
	const { t: translate } = useTranslation('common');
	const router = useRouter();
	const [category, setCategory] = useState('');
	const [location, setLocation] = useState('');
	const [searchError, setSearchError] = useState('');

	/** HANDLERS **/
	const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSearchError('');
		try {
			await router.push({
				pathname: '/service',
				query: listingQuery({ ...emptyFilters, category, location, sort: 'newest', page: 1 }),
			});
		} catch {
			setSearchError('Unable to open services. Please try again.');
		}
	};

	return (
		<section className={styles.hero}>
			<div className={`${styles.heroGlow} ${styles.glowOne}`} aria-hidden="true" />
			<div className={`${styles.heroGlow} ${styles.glowTwo}`} aria-hidden="true" />
			<div className={`${styles.container} ${styles.heroGrid}`}>
				<div className={styles.heroCopy}>
					<span className={styles.trustChip}><FiHome aria-hidden="true" /> {translate('Local home services')}</span>
					<h1>{translate('Find home service pros')} <span>{translate('near you.')}</span></h1>
					<p>{translate('From quick fixes to big projects, explore local services and find the right professional for your home.')}</p>
					<form className={styles.heroSearch} onSubmit={handleSearchSubmit}>
						<label>
							<span>{translate('What do you need?')}</span>
							<select aria-label={translate('Service category')} value={category} onChange={(event) => setCategory(event.target.value)}>
								<option value="">{translate('All services')}</option>
								{categories.map((value) => <option key={value} value={value}>{translate(label(value), { defaultValue: label(value) })}</option>)}
							</select>
						</label>
						<label>
							<span>{translate('Where?')}</span>
							<select aria-label={translate('Service location')} value={location} onChange={(event) => setLocation(event.target.value)}>
								<option value="">{translate('All locations')}</option>
								{locations.map((value) => <option key={value} value={value}>{translate(label(value), { defaultValue: label(value) })}</option>)}
							</select>
						</label>
						<Button type="submit"><FiSearch size={20} aria-hidden="true" /> {translate('Search')}</Button>
					</form>
					{searchError && <p className={styles.error} role="alert">{translate(searchError, { defaultValue: searchError })}</p>}
					<div className={styles.popularLinks}>
						<strong>{translate('Explore:', { nsSeparator: false })}</strong>
						{['PLUMBING', 'CLEANING', 'HVAC'].map((value) => (
							<Link key={value} href={{ pathname: '/service', query: { category: value } }}>{translate(label(value), { defaultValue: label(value) })}</Link>
						))}
					</div>
				</div>
				<div className={styles.heroVisual}>
					<div className={styles.heroPhoto}><ServiceImage path={heroImage} alt="" /></div>
					{featuredService?.memberData && (
						<div className={`${styles.floatingCard} ${styles.featuredProvider}`}>
							<ServiceImage
								path={featuredService.memberData.memberImage}
								alt={featuredService.memberData.memberNick}
								avatar
								className={styles.avatar}
							/>
							<div>
								<strong>{featuredService.memberData.memberNick}</strong>
								<small><FiHeart aria-hidden="true" /> {translate('serviceLikeCount', { count: featuredService.serviceLikes })}</small>
							</div>
						</div>
					)}
					{total !== undefined && (
						<div className={`${styles.floatingCard} ${styles.serviceTotal}`}>
							<span className={styles.totalIcon}><FiHome aria-hidden="true" /></span>
							<div><strong>{total.toLocaleString(router.locale === 'kr' ? 'ko-KR' : router.locale || 'en')}</strong><small>{translate('Services available')}</small></div>
						</div>
					)}
					<FiSun className={styles.doodle} size={36} aria-hidden="true" />
				</div>
			</div>
		</section>
	);
};

export default HomeHeroHero;
