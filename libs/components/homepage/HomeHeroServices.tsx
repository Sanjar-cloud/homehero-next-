import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import { Button } from '../homehero/UI';
import ServiceCard from '../service/ServiceCard';
import type { Service } from '../../types/service/service';
import type { SortKey } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/home.module.scss';

interface HomeHeroServicesProps {
	eyebrow: string;
	title: string;
	description: string;
	services: Service[];
	loading: boolean;
	error: boolean;
	sort: SortKey;
	soft?: boolean;
	pendingIds: string[];
	onLike: (id: string) => Promise<void>;
	onRetry: () => void;
}

const HomeHeroServices = (props: HomeHeroServicesProps) => {
	const { eyebrow, title, description, services, loading, error, sort, soft, pendingIds, onLike, onRetry } = props;
	const listingHref = { pathname: '/service', query: sort === 'newest' ? {} : { sort } };
	const returnTo = sort === 'newest' ? '/service' : `/service?sort=${sort}`;

	return (
		<section className={`${styles.section} ${soft ? styles.softSection : ''}`} aria-busy={loading}>
			<div className={styles.container}>
				<div className={styles.sectionHeading}>
					<div>
						<span className={styles.eyebrow}>{eyebrow}</span>
						<h2>{title}</h2>
						<p>{description}</p>
					</div>
					<Link href={listingHref} className={styles.textLink}>Explore all <FiArrowRight aria-hidden="true" /></Link>
				</div>
				{error ? (
					<div className={styles.state} role="alert">
						<h3>Unable to load services</h3>
						<p>Please check your connection and try again.</p>
						<Button variant="secondary" onClick={onRetry}>Retry {title.toLowerCase()}</Button>
					</div>
				) : loading && !services.length ? (
					<div className={styles.state} role="status">Loading services…</div>
				) : (
					<>
						{loading && <p role="status" className={styles.notice}>Updating services…</p>}
						{services.length ? (
							<div className={styles.serviceGrid}>
								{services.map((service) => (
									<ServiceCard
										key={service._id}
										service={service}
										variant="grid"
										detailHref={{ pathname: '/service/detail', query: { id: service._id, returnTo } }}
										pending={pendingIds.includes(service._id)}
										onLike={onLike}
									/>
								))}
							</div>
						) : (
							<div className={styles.state}>
								<h3>No services available yet</h3>
								<p>Check back for new home service listings.</p>
							</div>
						)}
					</>
				)}
			</div>
		</section>
	);
};

export default HomeHeroServices;
