import { Direction } from '../../enums/common.enum';
import { ServiceCategory, ServiceLocation, ServiceStatus } from '../../enums/service.enum';

export interface ServiceInput {
	serviceCategory: ServiceCategory;
	serviceLocation: ServiceLocation;
	// Backend requires 3–100 characters.
	serviceTitle: string;
	// When provided and non-null, 5–500 characters.
	serviceDesc?: string | null;
	// Integer KRW, 0–2147483647; omission or null leaves the price unspecified.
	servicePrice?: number | null;
	// 1–10 non-empty image paths.
	serviceImages: string[];
}

// Integer bounds, 0–2147483647, with start <= end.
export interface PricesRange {
	start: number;
	end: number;
}

// ISO date strings, with start <= end.
export interface PeriodsRange {
	start: string;
	end: string;
}

export interface ServiceSearch {
	memberId?: string | null;
	locationList?: ServiceLocation[] | null;
	categoryList?: ServiceCategory[] | null;
	pricesRange?: PricesRange | null;
	periodsRange?: PeriodsRange | null;
	text?: string | null;
}

export interface OrdinaryInquiry {
	// Integer >= 1.
	page: number;
	// Integer between 1 and 100.
	limit: number;
}

export type ServiceSort = 'createdAt' | 'updatedAt' | 'serviceLikes' | 'serviceViews' | 'serviceRank' | 'servicePrice';

interface ServiceInquiry extends OrdinaryInquiry {
	sort?: ServiceSort | null;
	direction?: Direction | null;
}

export interface ServicesInquiry extends ServiceInquiry {
	search: ServiceSearch;
}

export interface AgentServiceSearch {
	// getAgentServices rejects DELETE; the shared enum also supports admin updates.
	serviceStatus?: ServiceStatus | null;
}

export interface AgentServicesInquiry extends ServiceInquiry {
	search: AgentServiceSearch;
}

export interface AdminServiceSearch extends AgentServiceSearch {
	serviceLocationList?: ServiceLocation[] | null;
}

export interface AllServicesInquiry extends ServiceInquiry {
	search: AdminServiceSearch;
}
