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
					<span className={styles.trustChip}><FiHome aria-hidden="true" /> Local home services</span>
					<h1>Find home service pros <span>near you.</span></h1>
					<p>From quick fixes to big projects, explore local services and find the right professional for your home.</p>
					<form className={styles.heroSearch} onSubmit={handleSearchSubmit}>
						<label>
							<span>What do you need?</span>
							<select aria-label="Service category" value={category} onChange={(event) => setCategory(event.target.value)}>
								<option value="">All services</option>
								{categories.map((value) => <option key={value} value={value}>{label(value)}</option>)}
							</select>
						</label>
						<label>
							<span>Where?</span>
							<select aria-label="Service location" value={location} onChange={(event) => setLocation(event.target.value)}>
								<option value="">All locations</option>
								{locations.map((value) => <option key={value} value={value}>{label(value)}</option>)}
							</select>
						</label>
						<Button type="submit"><FiSearch size={20} aria-hidden="true" /> Search</Button>
					</form>
					{searchError && <p className={styles.error} role="alert">{searchError}</p>}
					<div className={styles.popularLinks}>
						<strong>Explore:</strong>
						{['PLUMBING', 'CLEANING', 'HVAC'].map((value) => (
							<Link key={value} href={{ pathname: '/service', query: { category: value } }}>{label(value)}</Link>
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
								<small><FiHeart aria-hidden="true" /> {featuredService.serviceLikes} service likes</small>
							</div>
						</div>
					)}
					{total !== undefined && (
						<div className={`${styles.floatingCard} ${styles.serviceTotal}`}>
							<span className={styles.totalIcon}><FiHome aria-hidden="true" /></span>
							<div><strong>{total.toLocaleString('en-US')}</strong><small>Services available</small></div>
						</div>
					)}
					<FiSun className={styles.doodle} size={36} aria-hidden="true" />
				</div>
			</div>
		</section>
	);
};

export default HomeHeroHero;
