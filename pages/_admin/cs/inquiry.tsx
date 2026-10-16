import React from 'react';
import type { NextPage } from 'next';
import { Box } from '@mui/material';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import { InquiryList } from '../../../libs/components/admin/cs/InquiryList';

const InquiryListPage: NextPage = () => {
	return (
		<div className="content">
			<Box component="div" className="table-wrap" sx={{ p: { xs: 2, md: 3 } }}>
				<InquiryList />
			</Box>
		</div>
	);
};

export default withAdminLayout(InquiryListPage);
