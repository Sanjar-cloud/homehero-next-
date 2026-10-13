import type { GetStaticProps, NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutHomeHero from '../../libs/components/layout/LayoutHomeHero';
import PrivateChat from '../../libs/components/chat/PrivateChat';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});

const MessagesPage: NextPage = () => <PrivateChat />;

export default withLayoutHomeHero(MessagesPage);
