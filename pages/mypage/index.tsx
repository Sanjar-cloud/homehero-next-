import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { NextPage } from 'next';
import { Stack } from '@mui/material';
import useDeviceDetect from '../../libs/hooks/useDeviceDetect';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import MyProperties from '../../libs/components/mypage/MyProperties';
import MyFavorites from '../../libs/components/mypage/MyFavorites';
import RecentlyVisited from '../../libs/components/mypage/RecentlyVisited';
import AddProperty from '../../libs/components/mypage/AddNewProperty';
import MyProfile from '../../libs/components/mypage/MyProfile';
import MyArticles from '../../libs/components/mypage/MyArticles';
import { useMutation, useReactiveVar } from '@apollo/client';
import { userVar } from '../../apollo/store';
import MyMenu from '../../libs/components/mypage/MyMenu';
import WriteArticle from '../../libs/components/mypage/WriteArticle';
import MemberFollowers from '../../libs/components/member/MemberFollowers';
import { Messages } from '../../libs/config';
import { LIKE_TARGET_MEMBER, SUBSCRIBE, UNSUBSCRIBE } from '../../apollo/user/mutation';
import { sweetErrorHandling, sweetMixinErrorAlert, sweetTopSmallSuccessAlert } from '../../libs/sweetAlert';
import MemberFollowings from '../../libs/components/member/MemberFollowings';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import MyServiceFavorites from '../../libs/components/mypage/MyServiceFavorites';
import MyPageLayout, { MyPageComingSoon } from '../../libs/components/mypage/MyPageLayout';
import MyConnections from '../../libs/components/mypage/MyConnections';
import AddNewService from '../../libs/components/mypage/AddNewService';
import MyServices from '../../libs/components/mypage/MyServices';
import styles from '../../scss/homehero/mypage.module.scss';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const MyPage: NextPage = () => {
	const device = useDeviceDetect();
	const user = useReactiveVar(userVar);
	const router = useRouter();
	const category: any = router.query?.category ?? 'myProfile';

	/** APOLLO REQUESTS **/
	const [subscribe] = useMutation(SUBSCRIBE);
	const [unsubscribe] = useMutation(UNSUBSCRIBE);
	const [likeTargetMember] = useMutation(LIKE_TARGET_MEMBER);

	/** LIFECYCLES **/
	useEffect(() => {
		if (!user._id) router.push('/').then();
	}, [user]);

	/** HANDLERS **/
	const subscribeHandler = async (id: string, refetch: any, query: any) => {
		try {
			if (!id) throw new Error(Messages.error1);
			if (!user._id) throw new Error(Messages.error2);

			await subscribe({
				variables: {
					input: id,
				},
			});
			await sweetTopSmallSuccessAlert('Subscribed!', 800);
			await refetch({ input: query });
		} catch (err: any) {
			sweetErrorHandling(err).then();
		}
	};

	const unsubscribeHandler = async (id: string, refetch: any, query: any) => {
		try {
			if (!id) throw new Error(Messages.error1);
			if (!user._id) throw new Error(Messages.error2);

			await unsubscribe({
				variables: {
					input: id,
				},
			});
			await sweetTopSmallSuccessAlert('Unsubscribed!', 800);
			await refetch({ input: query });
		} catch (err: any) {
			sweetErrorHandling(err).then();
		}
	};

	const likeMemberHandler = async (id: string, refetch: any, query: any) => {
		try {
			if (!id) return;
			if (!user._id) throw new Error(Messages.error2);

			await likeTargetMember({
				variables: {
					input: id,
				},
			});
			await sweetTopSmallSuccessAlert('Success!', 800);
			await refetch({ input: query });
		} catch (err: any) {
			console.log('ERROR, likeMemberHandler:', err.message);
			sweetMixinErrorAlert(err.message).then();
		}
	};

	const redirectToMemberPageHandler = async (memberId: string) => {
		try {
			if (memberId === user?._id) await router.push(`/mypage?memberId=${memberId}`);
			else await router.push(`/member?memberId=${memberId}`);
		} catch (error) {
			await sweetErrorHandling(error);
		}
	};

	if (device === 'mobile') {
		return <div>MY PAGE</div>;
	} else {
		return (
			<div id="my-page" style={{ position: 'relative' }}>
				<div className="container">
					<Stack className={'my-page'}>
						<Stack className={'back-frame'}>
							<Stack className={'left-config'}>
								<MyMenu />
							</Stack>
							<Stack className="main-config" mb={'76px'}>
								<Stack className={'list-config'}>
									{category === 'addProperty' && <AddProperty />}
									{category === 'myProperties' && <MyProperties />}
									{category === 'addService' && user.memberType === 'AGENT' && <AddNewService key={user._id} />}
			{category === 'myServices' && user.memberType === 'AGENT' && <MyServices key={user._id} />}
			{category === 'myFavorites' && <MyFavorites />}
									{category === 'recentlyVisited' && <RecentlyVisited />}
									{category === 'myArticles' && <MyArticles />}
									{category === 'writeArticle' && <WriteArticle />}
									{category === 'myProfile' && <MyProfile />}
									{category === 'followers' && (
										<MemberFollowers
											subscribeHandler={subscribeHandler}
											unsubscribeHandler={unsubscribeHandler}
											likeMemberHandler={likeMemberHandler}
											redirectToMemberPageHandler={redirectToMemberPageHandler}
										/>
									)}
									{category === 'followings' && (
										<MemberFollowings
											subscribeHandler={subscribeHandler}
											unsubscribeHandler={unsubscribeHandler}
											likeMemberHandler={likeMemberHandler}
											redirectToMemberPageHandler={redirectToMemberPageHandler}
										/>
									)}
								</Stack>
							</Stack>
						</Stack>
					</Stack>
				</div>
			</div>
		);
	}
};

const LegacyMyPage = withLayoutBasic(MyPage);
const HomeHeroMyPage: NextPage = () => {
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const category = typeof router.query.category === 'string' ? router.query.category : 'myProfile';
	const isServiceCategory = ['addService', 'myServices'].includes(category);

	useEffect(() => {
		if (router.isReady && category === 'messages') {
			const query = { ...router.query };
			delete query.category;
			void router.replace({ pathname: '/chat', query }).catch(() => {
				void sweetMixinErrorAlert('Unable to open Messages. Please try again.');
			});
		}
	}, [router.isReady, category]);

	useEffect(() => {
		if (!router.isReady || category !== 'myReviews') return;
		void router.replace('/mypage?category=myProfile').catch(() => {
			void sweetMixinErrorAlert('Unable to open Profile. Please try again.');
		});
	}, [router.isReady, category]);

	if (category === 'messages') return <div className={styles.state} role="status">Opening Messages…</div>;
	if (category === 'myReviews') return <div className={styles.state} role="status">Opening Profile…</div>;

	return (
		<MyPageLayout category={category}>
			{(category === 'myProfile' || category === 'accountSettings') && <MyProfile />}
			{category === 'addService' && user.memberType === 'AGENT' && <AddNewService key={user._id} />}
			{category === 'myServices' && user.memberType === 'AGENT' && <MyServices key={user._id} />}
			{category === 'myFavorites' && <MyServiceFavorites />}
			{category === 'myArticles' && <MyArticles embedded />}
			{(category === 'followers' || category === 'followings') && <MyConnections category={category} />}
			{((isServiceCategory && user.memberType !== 'AGENT') || !['myProfile', 'accountSettings', 'myFavorites', 'myArticles', 'followers', 'followings', 'addService', 'myServices'].includes(category)) && (
				<MyPageComingSoon category={category} />
			)}
		</MyPageLayout>
	);
};
const HomeHeroMyPageRoute = withLayoutHomeHero(HomeHeroMyPage);
const legacyCategories = ['addProperty', 'myProperties', 'recentlyVisited'];

const CommunityMyPage = () => {
	return <WriteArticle />;
};
const CommunityMyPageRoute = withLayoutHomeHero(CommunityMyPage);

const MyPageRoute: NextPage = (props) => {
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const [clientReady, setClientReady] = useState(false);

	useEffect(() => { setClientReady(true); }, []);

	// Keep the initial server/client markup identical before selecting a layout.
	if (!clientReady || !router.isReady) {
		return <div className={styles.state} role="status">Loading My Page…</div>;
	}
	if (user.memberType === 'ADMIN' || (typeof router.query.category === 'string' && legacyCategories.includes(router.query.category))) {
		return <LegacyMyPage {...props} />;
	}
	if (router.query.category === 'writeArticle') {
		return <CommunityMyPageRoute {...props} />;
	}
	return <HomeHeroMyPageRoute {...props} />;
};

export default MyPageRoute;
