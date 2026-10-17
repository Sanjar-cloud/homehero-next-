import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';

const PropertyListPage = () => {
	const router = useRouter();

	useEffect(() => {
		if (!router.isReady) return;
		const hash = router.asPath.includes('#') ? router.asPath.slice(router.asPath.indexOf('#')) : '';
		void router.replace({
			pathname: '/_admin/services',
			query: router.query,
			hash,
		}, undefined, { locale: router.locale });
	}, [router.isReady, router]);

	return <p role="status">Opening Services…</p>;
};

export default withAdminLayout(PropertyListPage);
