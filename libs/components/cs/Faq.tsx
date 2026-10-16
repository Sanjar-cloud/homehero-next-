import React, { useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import { GET_SUPPORT_NOTICES } from '../../../apollo/user/support.query';
import { SupportNoticeCategory } from '../../enums/support.enum';
import { Button, Input } from '../homehero/UI';
import { ServicePagination } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/support.module.scss';

// FAQ and announcements share the same public content contract and locale fallback.
const Faq = ({ category = SupportNoticeCategory.FAQ }: { category?: SupportNoticeCategory }) => {
	const router = useRouter();
	const { t: translate } = useTranslation('common');
	const searchInput = useRef<HTMLInputElement>(null);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState('');
	const [text, setText] = useState('');
	const [refreshing, setRefreshing] = useState(false);
	const isFaq = category === SupportNoticeCategory.FAQ;
	const limit = 10;
	const { data, loading, error, refetch } = useQuery(GET_SUPPORT_NOTICES, {
		variables: { input: { page, limit, noticeCategory: category, text } },
		fetchPolicy: 'no-cache',
		notifyOnNetworkStatusChange: true,
	});
	const result = !loading && !error ? data?.getSupportNotices : undefined;
	const total = result?.metaCounter[0]?.total ?? 0;
	const locale = router.locale === 'kr' ? 'ko-KR' : router.locale === 'ru' ? 'ru-RU' : 'en-GB';

	/** HANDLERS **/
	const searchHandler = (event: React.FormEvent) => {
		event.preventDefault();
		setPage(1);
		setText(search.trim());
	};

	const clearSearchHandler = () => {
		setSearch('');
		setText('');
		setPage(1);
		searchInput.current?.focus();
	};

	const refreshHandler = async () => {
		if (refreshing) return;
		setRefreshing(true);
		try {
			await refetch();
		} catch {
			// Apollo's error state provides the translated retry message below.
		} finally {
			setRefreshing(false);
		}
	};

	return (
		<>
			<div className={styles.heading}>
				<div>
					<h2>{translate(isFaq ? 'Frequently asked questions' : 'Announcements')}</h2>
					<p>{translate(isFaq ? 'Helpful answers from the HomeHero team.' : 'The latest published updates from HomeHero.')}</p>
				</div>
				<Button variant="secondary" onClick={refreshHandler} disabled={loading || refreshing}>{translate('Refresh')}</Button>
			</div>
			<form className={styles.search} onSubmit={searchHandler}>
				<FiSearch aria-hidden="true" />
				<Input
					ref={searchInput}
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					maxLength={100}
					aria-label={translate('Search support content')}
					placeholder={translate('Search support content')}
				/>
				{(search || text) && (
					<button
						type="button"
						className={styles.clearSearch}
						aria-label={translate('Clear search')}
						title={translate('Clear search')}
						onClick={clearSearchHandler}
					>
						<FiX aria-hidden="true" />
					</button>
				)}
				<Button type="submit">{translate('Search')}</Button>
			</form>
			{loading && <p className={styles.state} role="status">{translate('Loading support content…')}</p>}
			{error && <p className={styles.error} role="alert">{translate('Support content could not be loaded. Please try Refresh.')}</p>}
			{result && !result.list.length && <p className={styles.state}>{translate('No published content found.')}</p>}
			<div className={styles.list}>
				{result?.list.map((notice) => {
					const translated = router.locale === 'kr' ? notice.translations?.kr : router.locale === 'ru' ? notice.translations?.ru : null;
					const title = translated?.title || notice.noticeTitle;
					const content = translated?.content || notice.noticeContent;
					return (
						<details key={notice._id} className={styles.notice}>
							<summary>
								<span>
									{!isFaq && <time dateTime={notice.createdAt}>{new Date(notice.createdAt).toLocaleDateString(locale)}</time>}
									<strong>{title}</strong>
								</span>
								<FiChevronDown aria-hidden="true" />
							</summary>
							<p className={styles.text}>{content}</p>
						</details>
					);
				})}
			</div>
			{result && <ServicePagination page={page} totalPages={Math.ceil(total / limit)} onChange={setPage} />}
		</>
	);
};

export default Faq;
