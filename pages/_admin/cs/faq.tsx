import React from 'react';
import type { NextPage } from 'next';
import { Box } from '@mui/material';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import { FaqArticlesPanelList } from '../../../libs/components/admin/cs/FaqList';

const FaqListPage: NextPage = () => {
	return (
		<div className="content">
			<Box component="div" className="table-wrap" sx={{ p: { xs: 2, md: 3 } }}>
				<FaqArticlesPanelList />
			</Box>
		</div>
	);
};

export default withAdminLayout(FaqListPage);
