import React from 'react';
import type { NextPage } from 'next';
import { Box } from '@mui/material';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import { NoticeList } from '../../../libs/components/admin/cs/NoticeList';

const NoticeListPage: NextPage = () => {
	return (
		<div className="content">
			<Box component="div" className="table-wrap" sx={{ p: { xs: 2, md: 3 } }}>
				<NoticeList />
			</Box>
		</div>
	);
};

export default withAdminLayout(NoticeListPage);
