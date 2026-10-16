import { MemberType } from '../../enums/member.enum';
import { SupportNoticeCategory, SupportNoticeStatus, SupportRequestStatus } from '../../enums/support.enum';

export interface SupportTranslation {
	title: string;
	content: string;
}

export interface SupportTranslations {
	kr?: SupportTranslation | null;
	ru?: SupportTranslation | null;
}

export interface SupportNotice {
	_id: string;
	noticeCategory: SupportNoticeCategory;
	noticeStatus: SupportNoticeStatus;
	noticeTitle: string;
	noticeContent: string;
	translations?: SupportTranslations | null;
	createdAt: string;
	updatedAt: string;
}

export interface SupportNotices {
	list: SupportNotice[];
	metaCounter: { total: number | null }[];
}

export interface SupportNoticesInquiry {
	page: number;
	limit: number;
	noticeCategory: SupportNoticeCategory;
	text?: string | null;
}

export interface AdminSupportNoticesInquiry extends SupportNoticesInquiry {
	noticeStatus?: SupportNoticeStatus | null;
}

export interface SupportNoticeContentInput {
	noticeTitle: string;
	noticeContent: string;
	noticeStatus: SupportNoticeStatus;
	translations?: SupportTranslations | null;
}

export interface CreateSupportNoticeInput extends SupportNoticeContentInput {
	noticeCategory: SupportNoticeCategory;
}

export interface UpdateSupportNoticeInput extends SupportNoticeContentInput {
	_id: string;
}

export interface SupportRequest {
	_id: string;
	memberId: string;
	subject: string;
	content: string;
	status: SupportRequestStatus;
	reply?: string | null;
	adminId?: string | null;
	repliedAt?: string | null;
	createdAt: string;
	updatedAt: string;
	memberData?: { _id: string; memberNick: string; memberType: MemberType } | null;
}

export interface SupportRequests {
	list: SupportRequest[];
	metaCounter: { total: number | null }[];
}

export interface SupportRequestsInquiry {
	page: number;
	limit: number;
	status?: SupportRequestStatus | null;
}

export interface CreateSupportRequestInput {
	subject: string;
	content: string;
}

export interface ReplySupportRequestInput {
	_id: string;
	reply: string;
}
