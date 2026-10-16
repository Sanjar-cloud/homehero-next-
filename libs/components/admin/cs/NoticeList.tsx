import React from 'react';
import { SupportNoticeCategory } from '../../../enums/support.enum';
import { FaqArticlesPanelList } from './FaqList';

export const NoticeList = () => {
	return <FaqArticlesPanelList noticeCategory={SupportNoticeCategory.ANNOUNCEMENT} />;
};
