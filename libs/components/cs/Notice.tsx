import React from 'react';
import Faq from './Faq';
import { SupportNoticeCategory } from '../../enums/support.enum';

const Notice = () => {
	return <Faq category={SupportNoticeCategory.ANNOUNCEMENT} />;
};

export default Notice;
