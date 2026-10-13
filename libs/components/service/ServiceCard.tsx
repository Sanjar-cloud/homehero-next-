import { useState } from 'react';
import type { UrlObject } from 'url';
import Link from 'next/link';
import { FiArrowRight, FiEye, FiHeart, FiImage, FiMapPin, FiMessageCircle } from 'react-icons/fi';
import type { Service } from '../../types/service/service';
import { REACT_APP_API_URL } from '../../config';
import { label } from './ServiceFilter';
import styles from '../../../scss/homehero/service.module.scss';

export const formatPrice = (price: number | null) => price == null ? 'Price not specified' : `₩${new Intl.NumberFormat('en-US').format(price)}`;
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
export function imageUrl(path?: string): string {
	if (!path) return '';
	if (/^https?:\/\//i.test(path)) return path;
	if (/^[a-z]+:/i.test(path) || path.startsWith('//')) return '';
	const base = REACT_APP_API_URL && REACT_APP_API_URL !== 'undefined' ? REACT_APP_API_URL.replace(/\/$/, '') : '';
	return `${base}/${path.replace(/^\/+/, '')}`;
}
export function ServiceImage({ path, alt, className = '', avatar = false }: { path?: string; alt: string; className?: string; avatar?: boolean }) {
	const src = imageUrl(path);
	const [failedSrc, setFailedSrc] = useState('');
	return src && src !== failedSrc ? <img className={className} src={src} alt={alt} onError={() => setFailedSrc(src)} />
		: <span role="img" aria-label={avatar ? alt : 'Image unavailable'} className={`${styles.imagePlaceholder} ${className}`}>{avatar ? initials(alt) || '?' : <FiImage size={30} aria-hidden="true" />}</span>;
}

interface ServiceCardProps {
	service: Service;
	detailHref: UrlObject;
	pending: boolean;
	onLike: (id: string) => Promise<void>;
	variant?: 'listing' | 'grid';
	saved?: boolean;
}
export default function ServiceCard({ service, detailHref, pending, onLike, variant = 'listing', saved }: ServiceCardProps) {
	const liked = saved ?? (service.meLiked?.some((item) => item.myFavorite) ?? false);
	return <article className={variant === 'grid' ? `${styles.card} ${styles.gridCard}` : styles.card}>
		<div className={styles.cardImage}>
			<Link href={detailHref} aria-label={`View ${service.serviceTitle}`}><ServiceImage path={service.serviceImages[0]} alt={service.serviceTitle} /></Link>
			<button type="button" className={`${styles.heart} ${liked ? styles.saved : ''}`} disabled={pending} aria-pressed={liked} aria-label={liked ? 'Remove from favorites' : 'Save service'} onClick={() => void onLike(service._id)}><FiHeart size={18} fill={liked ? 'currentColor' : 'none'} /></button>
			<span className={styles.category}>{label(service.serviceCategory)}</span>
		</div>
		<div className={styles.cardContent}>
			<div className={styles.stats}><span><FiHeart /> {service.serviceLikes}</span><span><FiEye /> {service.serviceViews}</span><span><FiMessageCircle /> {service.serviceComments}</span></div>
			<h2><Link href={detailHref}>{service.serviceTitle}</Link></h2>
			<p className={styles.providerLine}><ServiceImage path={service.memberData?.memberImage} alt={service.memberData?.memberNick || 'Provider unavailable'} className={styles.avatar} avatar /><strong>{service.memberData?.memberNick || 'Provider unavailable'}</strong></p>
			<p className={styles.location}><FiMapPin size={14} />{label(service.serviceLocation)}</p>
			<div className={styles.cardBottom}><strong>{formatPrice(service.servicePrice)}</strong><Link href={detailHref} className={styles.detailLink}>View details <FiArrowRight size={16} /></Link></div>
		</div>
	</article>;
}
