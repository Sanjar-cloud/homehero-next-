import { ServiceCategory, ServiceLocation, ServiceStatus } from '../../enums/service.enum';

export interface MeLiked {
	memberId: string;
	likeRefId: string;
	myFavorite: boolean;
}

export interface TotalCounter {
	total: number | null;
}

export interface ServiceProvider {
	_id: string;
	memberNick: string;
	memberImage: string;
	memberDesc: string | null;
	memberServices: number;
}

// These output shapes assume all listed fields are selected in GraphQL.
export interface Service {
	_id: string;
	serviceCategory: ServiceCategory;
	serviceStatus: ServiceStatus;
	serviceLocation: ServiceLocation;
	serviceTitle: string;
	serviceDesc: string | null;
	servicePrice: number | null;
	serviceImages: string[];
	serviceViews: number;
	serviceLikes: number;
	serviceComments: number;
	serviceRank: number;
	memberId: string;
	// GraphQL DateTime values use ISO date strings on the frontend.
	deletedAt: string | null;
	createdAt: string;
	updatedAt: string;
	memberData: ServiceProvider | null;
	meLiked: MeLiked[] | null;
}

export interface Services {
	list: Service[];
	metaCounter: TotalCounter[] | null;
}
