import type { GetStaticProps, NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import MyPageLayout, { MyPageComingSoon } from '../../libs/components/mypage/MyPageLayout';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});

const MessagesPage: NextPage = () => (
	<MyPageLayout category="messages">
		<MyPageComingSoon category="messages" />
	</MyPageLayout>
);

export default withLayoutHomeHero(MessagesPage);
