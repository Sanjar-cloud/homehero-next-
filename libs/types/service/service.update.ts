import { ServiceCategory, ServiceLocation, ServiceStatus } from '../../enums/service.enum';

export interface ServiceUpdate {
	// Valid MongoDB ID.
	_id: string;
	// Omitted fields remain unchanged; enums, title and images reject explicit null.
	serviceCategory?: ServiceCategory;
	serviceStatus?: ServiceStatus;
	serviceLocation?: ServiceLocation;
	// 3–100 characters when provided.
	serviceTitle?: string;
	// 5–500 characters when non-null.
	serviceDesc?: string | null;
	// Integer KRW, 0–2147483647; null clears the price.
	servicePrice?: number | null;
	// 1–10 non-empty image paths when provided.
	serviceImages?: string[];
}
