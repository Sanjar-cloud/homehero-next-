import { useState } from 'react';
import Slider from '@mui/material/Slider';
import type { ParsedUrlQuery } from 'querystring';
import { FiStar, FiX } from 'react-icons/fi';
import { Button } from '../homehero/UI';
import { Direction } from '../../enums/common.enum';
import { ServiceCategory, ServiceLocation } from '../../enums/service.enum';
import type { ServicesInquiry } from '../../types/service/service.input';
import styles from '../../../scss/homehero/service.module.scss';

export const MAX_PRICE = 2147483647;
export const categories = Object.values(ServiceCategory);
export const locations = Object.values(ServiceLocation);
export const label = (value: string) => value === 'HVAC' ? 'HVAC' : value.charAt(0) + value.slice(1).toLowerCase();
export const sorts = {
	newest: { title: 'Newest', field: 'createdAt', direction: Direction.DESC },
	mostLiked: { title: 'Most liked', field: 'serviceLikes', direction: Direction.DESC },
	mostViewed: { title: 'Most viewed', field: 'serviceViews', direction: Direction.DESC },
	priceAsc: { title: 'Lowest price', field: 'servicePrice', direction: Direction.ASC },
	priceDesc: { title: 'Highest price', field: 'servicePrice', direction: Direction.DESC },
} as const;
export type SortKey = keyof typeof sorts;
export interface ServiceFilters {
	q: string;
	category: string;
	location: string;
	minPrice: string;
	maxPrice: string;
}
export interface ListingState extends ServiceFilters {
	sort: SortKey;
	page: number;
}
export const emptyFilters: ServiceFilters = { q: '', category: '', location: '', minPrice: '', maxPrice: '' };
export const scalar = (value: string | string[] | undefined) => typeof value === 'string' ? value : '';
export const validPage = (value: string | string[] | undefined) => {
	const text = scalar(value);
	const page = /^\d+$/.test(text) ? Number(text) : 0;
	return Number.isInteger(page) && page >= 1 && page <= MAX_PRICE ? page : 1;
};
export const priceError = (filters: ServiceFilters) => {
	const values = [filters.minPrice, filters.maxPrice];
	if (values.some((value) => value !== '' && (!/^\d+$/.test(value) || Number(value) > MAX_PRICE))) {
		return 'Enter whole KRW amounts between 0 and 2,147,483,647.';
	}
	if (Number(filters.minPrice || 0) > Number(filters.maxPrice || MAX_PRICE)) {
		return 'Maximum price must be at least the minimum price.';
	}
	return '';
};
export function parseListing(query: ParsedUrlQuery): ListingState {
	const filters: ServiceFilters = {
		q: scalar(query.q).trim(),
		category: categories.includes(scalar(query.category) as ServiceCategory) ? scalar(query.category) : '',
		location: locations.includes(scalar(query.location) as ServiceLocation) ? scalar(query.location) : '',
		minPrice: scalar(query.minPrice),
		maxPrice: scalar(query.maxPrice),
	};
	if (priceError(filters)) {
		filters.minPrice = '';
		filters.maxPrice = '';
	}
	const sort = scalar(query.sort);
	return {
		...filters,
		sort: Object.prototype.hasOwnProperty.call(sorts, sort) ? sort as SortKey : 'newest',
		page: validPage(query.page)
	};
}
export function listingQuery(state: ListingState): Record<string, string> {
	const query: Record<string, string> = {};
	for (const key of ['q', 'category', 'location', 'minPrice', 'maxPrice'] as const) if (state[key]) query[key] = state[key];
	if (state.sort !== 'newest') query.sort = state.sort;
	if (state.page !== 1) query.page = String(state.page);
	return query;
}
export function listingInput(state: ListingState): ServicesInquiry {
	const selected = sorts[state.sort];
	return {
		page: state.page,
		limit: 12,
		sort: selected.field,
		direction: selected.direction,
		search: {
			...(state.q ? { text: state.q } : {}),
			...(state.category ? { categoryList: [state.category as ServiceCategory] } : {}),
			...(state.location ? { locationList: [state.location as ServiceLocation] } : {}),
			...(state.minPrice || state.maxPrice ? {
				pricesRange: { start: Number(state.minPrice || 0), end: Number(state.maxPrice || MAX_PRICE) }
			} : {}),
		},
	};
}

interface ServiceFilterProps {
	values: ServiceFilters;
	onChange: (values: ServiceFilters) => void;
	onApply: () => void;
	onClear: () => void;
	onClose?: () => void;
	error?: string;
}
export default function ServiceFilter({ values, onChange, onApply, onClear, onClose, error }: ServiceFilterProps) {
	const [minimumRating, setMinimumRating] = useState('4.5');
	const sliderMax = Math.min(MAX_PRICE, Math.max(1000000, Number(values.minPrice || 0) + 1, Number(values.maxPrice || 0) + 1));
	const lower = Number(values.minPrice || 0);
	const upper = Number(values.maxPrice || sliderMax);
	const krw = (value: number) => `₩${new Intl.NumberFormat('en-US').format(value)}`;

	return (
		<aside className={styles.filters}>
			<div className={styles.filterTitle}>
				<h2>Filters</h2>
				{onClose && (
					<button
						type="button"
						aria-label="Close filters"
						onClick={onClose}
					>
						<FiX size={22} />
					</button>
				)}
			</div>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					onApply();
				}}
			>
				<label className={styles.filterGroup}>Category<select value={values.category} onChange={(event) => onChange({ ...values, category: event.target.value })}>
						<option value="">All services</option>
						{categories.map((value) => <option key={value} value={value}>{label(value)}</option>)}
					</select></label>
				<label className={styles.filterGroup}>Location<select value={values.location} onChange={(event) => onChange({ ...values, location: event.target.value })}>
						<option value="">All locations</option>
						{locations.map((value) => <option key={value} value={value}>{label(value)}</option>)}
					</select></label>
				<div className={styles.filterGroup}>
					<strong id="service-price-range">Price range (KRW)</strong>
					<Slider
						className={styles.priceSlider}
						min={lower}
						max={sliderMax}
						step={1}
						value={upper}
						aria-label="Maximum price (KRW)"
						getAriaValueText={(value) => value === sliderMax && !values.maxPrice ? 'No maximum' : krw(value)}
						onChange={(_, value) => {
							if (typeof value !== 'number') return;
							onChange({ ...values, maxPrice: value === sliderMax ? '' : String(value) });
						}}
					/>
					<div className={styles.rangeValues}>
						<span>{krw(lower)}</span>
						<span>{values.maxPrice ? krw(upper) : 'No maximum'}</span>
					</div>
				</div>
				<div className={styles.filterGroup}>
					<strong>Minimum rating</strong>
					<div className={styles.ratingOptions}>
						{['4.5', '4', '3'].map((rating) => (
							<button
								type="button"
								key={rating}
								aria-pressed={minimumRating === rating}
								className={minimumRating === rating ? styles.ratingActive : ''}
								onClick={() => setMinimumRating(minimumRating === rating ? '' : rating)}
							>
								<FiStar
									size={14}
									fill="currentColor"
									aria-hidden="true"
								/> {rating}+
							</button>
						))}
					</div>
				</div>
				{error && (
					<p role="alert" className={styles.error}>{error}</p>
				)}
				<Button type="submit" className={styles.fullWidth}>Apply filters</Button>
				<button
					type="button"
					className={styles.clear}
					onClick={() => {
						setMinimumRating('');
						onClear();
					}}
				>
					Clear all filters
				</button>
			</form>
		</aside>
	);
}

export function ServicePagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
	if (totalPages <= 1) return null;
	const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages])).filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
	return (
		<nav className={styles.pagination} aria-label="Pagination">
			<button
				type="button"
				aria-label="Previous page"
				disabled={page <= 1}
				onClick={() => onChange(page - 1)}
			>
				‹
			</button>
			{pages.map((value, index) => <span key={value}>
				{index > 0 && value - pages[index - 1] > 1 && (
					<span className={styles.ellipsis}>…</span>
				)}
				<button
					type="button"
					aria-label={`Page ${value}`}
					aria-current={page === value ? 'page' : undefined}
					className={page === value ? styles.currentPage : ''}
					onClick={() => onChange(value)}
				>
					{value}
				</button>
			</span>)}
			<button
				type="button"
				aria-label="Next page"
				disabled={page >= totalPages}
				onClick={() => onChange(page + 1)}
			>
				›
			</button>
		</nav>
	);
}
