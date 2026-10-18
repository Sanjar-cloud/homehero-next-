import React from 'react';
import { useReactiveVar } from '@apollo/client';
import { Alert, Box } from '@mui/material';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withAdminLayout from '../../libs/components/layout/LayoutAdmin';
import MyProfile from '../../libs/components/mypage/MyProfile';
import { userVar } from '../../apollo/store';
import { getJwtToken } from '../../libs/auth';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import styles from '../../scss/homehero/admin.module.scss';

export const getStaticProps = async ({ locale }: { locale: string }) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const AdminProfile = () => {
	const user = useReactiveVar(userVar);
	const token = getJwtToken();
	const allowed = user._id && token && user.memberType === MemberType.ADMIN
		&& user.memberStatus === MemberStatus.ACTIVE;

	if (!allowed) {
		return <Alert severity="info">An active administrator session is required.</Alert>;
	}

	return (
		<div className="content">
			<Box className={`table-wrap ${styles.adminProfile}`}>
				<MyProfile key={`${user._id}:${token}`} profilePath="/_admin/profile" />
			</Box>
		</div>
	);
};

export default withAdminLayout(AdminProfile);
