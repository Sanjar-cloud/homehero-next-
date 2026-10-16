import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { FiCheck, FiMapPin, FiPlus } from 'react-icons/fi';
import type { PublicAgent } from '../../../apollo/user/agent.query';
import { GET_SERVICES } from '../../../apollo/user/service.query';
import { Direction } from '../../enums/common.enum';
import { Button } from '../homehero/UI';
import { ServiceImage } from '../service/ServiceCard';
import { label } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/agent.module.scss';

interface AgentCardProps {
	agent: PublicAgent;
	following: boolean;
	pending: boolean;
	followReady: boolean;
	self: boolean;
	onFollow: (agent: PublicAgent) => void;
}

const AgentCard = ({ agent, following, pending, followReady, self, onFollow }: AgentCardProps) => {
	const { t: translate } = useTranslation('common');
	const name = agent.memberFullName || agent.memberNick;
	const detailHref = { pathname: '/agent/detail', query: { agentId: agent._id } };
	const { data, loading, error } = useQuery(GET_SERVICES, {
		variables: {
			input: {
				page: 1,
				limit: 1,
				sort: 'createdAt',
				direction: Direction.DESC,
				search: { memberId: agent._id }
			}
		},
		fetchPolicy: 'no-cache',
		context: { queryDeduplication: false },
	});
	const latest = data?.getServices.list.find((service) => service.memberId === agent._id && service.serviceStatus === 'ACTIVE');
	const total = data?.getServices.metaCounter?.[0]?.total ?? (data?.getServices.metaCounter?.length === 0 ? 0 : undefined);
	const avatar = agent.memberImage?.startsWith('/img/') ? undefined : agent.memberImage;

	return (
		<article className={styles.card}>
			<Link
				href={detailHref}
				className={styles.cover}
				aria-label={translate('View profile of {{name}}', { name })}
			>
				{latest?.serviceImages[0] && <ServiceImage path={latest.serviceImages[0]} alt="" />}
			</Link>
			<div className={styles.cardBody}>
				<Link href={detailHref} aria-label={translate('View profile of {{name}}', { name })}>
					<ServiceImage
						path={avatar}
						alt={name}
						avatar
						className={styles.avatar}
					/>
				</Link>
				<div className={styles.identity}>
					<h2>
						<Link href={detailHref}>{name}</Link>
					</h2>
					{latest && (
						<p>{translate('Latest service:', { nsSeparator: false })} {translate(label(latest.serviceCategory), { defaultValue: label(latest.serviceCategory) })}</p>
					)}
				</div>
				{agent.memberAddress && (
					<p className={styles.location}>
						<FiMapPin size={13} aria-hidden="true" />
						{agent.memberAddress}
					</p>
				)}
				{agent.memberDesc && (
					<p className={styles.bio}>{agent.memberDesc}</p>
				)}
				<div className={styles.stats}>
					<span>
						<strong>{loading ? '…' : error || total == null ? '—' : total}</strong>
						<small>{translate('Services')}</small>
					</span>
					<span>
						<strong>{agent.memberFollowers}</strong>
						<small>{translate('Followers')}</small>
					</span>
				</div>
				{error && (
					<p className={styles.cardNotice}>{translate('Service details unavailable.')}</p>
				)}
				<Button
					variant={following || self ? 'secondary' : 'primary'}
					className={`${styles.follow} ${following ? styles.following : ''}`}
					disabled={pending || !followReady || self}
					onClick={() => onFollow(agent)}
					aria-label={self ? translate('Your profile') : translate(following ? 'Unfollow {{name}}' : 'Follow {{name}}', { name })}
					aria-pressed={following}
				>
					{!self && (following ? <FiCheck size={17} /> : <FiPlus size={17} />)}
					{self ? translate('Your profile') : pending ? translate('Please wait…') : !followReady ? translate('Follow unavailable') : following ? translate('Following') : translate('Follow')}
				</Button>
			</div>
		</article>
	);
};

export default AgentCard;
