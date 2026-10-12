import Link from 'next/link';
import { FiArrowRight, FiDroplet, FiGrid, FiHome, FiTool, FiWind, FiZap } from 'react-icons/fi';
import { ServiceCategory } from '../../enums/service.enum';
import { categories, label } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/home.module.scss';

const categoryIcons = {
	[ServiceCategory.PLUMBING]: { icon: FiTool, color: styles.blue },
	[ServiceCategory.ELECTRICAL]: { icon: FiZap, color: styles.yellow },
	[ServiceCategory.CLEANING]: { icon: FiDroplet, color: styles.green },
	[ServiceCategory.HVAC]: { icon: FiWind, color: styles.cyan },
	[ServiceCategory.HANDYMAN]: { icon: FiHome, color: styles.orange },
	[ServiceCategory.OTHER]: { icon: FiGrid, color: styles.purple },
};

const HomeHeroCategories = () => (
	<section className={styles.section}>
		<div className={styles.container}>
			<div className={styles.sectionHeading}>
				<div>
					<span className={styles.eyebrow}>Browse by category</span>
					<h2>What can we help with?</h2>
					<p>Explore home services for tasks big and small.</p>
				</div>
				<Link href="/service" className={styles.textLink}>View all services <FiArrowRight aria-hidden="true" /></Link>
			</div>
			<div className={styles.categoryGrid}>
				{categories.map((category) => {
					const { icon: Icon, color } = categoryIcons[category];
					return (
						<Link key={category} href={{ pathname: '/service', query: { category } }} className={styles.categoryCard}>
							<span className={`${styles.categoryIcon} ${color}`}><Icon aria-hidden="true" /></span>
							<strong>{label(category)}</strong>
							<span>Explore services</span>
							<FiArrowRight className={styles.categoryArrow} aria-hidden="true" />
						</Link>
					);
				})}
			</div>
		</div>
	</section>
);

export default HomeHeroCategories;
