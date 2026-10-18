import React from 'react';
import Link from 'next/link';
import { Avatar, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from '@mui/material';
import type { BoardArticle } from '../../../types/board-article/board-article';
import { BoardArticleStatus } from '../../../enums/board-article.enum';
import { communityCategories } from '../../community/CommunityPostCard';
import { imageUrl, initials, ServiceImage } from '../../service/ServiceCard';
import styles from '../../../../scss/homehero/admin.module.scss';

export type AdminArticle = Pick<BoardArticle,
	'_id' | 'articleTitle' | 'articleCategory' | 'articleStatus' | 'articleImage'
	| 'articleViews' | 'articleLikes' | 'memberId'
> & {
	createdAt: string;
	memberData?: Pick<NonNullable<BoardArticle['memberData']>, '_id' | 'memberNick' | 'memberImage'> | null;
};

interface CommunityArticleListProps {
	articles: AdminArticle[];
	total: number;
	page: number;
	limit: number;
	loading: boolean;
	saving: boolean;
	error: boolean;
	onDelete: (article: AdminArticle, permanent: boolean) => Promise<void>;
	onPagination: (page: number, limit: number) => void;
}

const CommunityArticleList = ({
	articles, total, page, limit, loading, saving, error, onDelete, onPagination,
}: CommunityArticleListProps) => {
	const visiblePage = Math.min(page - 1, Math.max(0, Math.ceil(total / limit) - 1));

	return (
		<>
			<TableContainer aria-busy={loading}>
				<Table className={styles.communityTable} aria-label="Community posts">
					<TableHead>
						<TableRow>
							{['Post', 'Category', 'Author', 'Views', 'Likes', 'Created', 'Status', 'Actions'].map((heading) => (
								<TableCell key={heading}>{heading}</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{articles.map((article) => {
							const author = article.memberData?._id === article.memberId ? article.memberData : null;
							const active = article.articleStatus === BoardArticleStatus.ACTIVE;
							return (
								<TableRow key={article._id}>
									<TableCell>
										<div className={styles.communityPost}>
											<ServiceImage path={article.articleImage || undefined} alt={article.articleTitle} className={styles.communityThumbnail} />
											<div>
												{active ? (
													<Link href={{ pathname: '/community/detail', query: { articleCategory: article.articleCategory, id: article._id } }}>
														<strong>{article.articleTitle}</strong>
													</Link>
												) : <strong>{article.articleTitle}</strong>}
												<small>{article._id}</small>
											</div>
										</div>
									</TableCell>
									<TableCell>{communityCategories[article.articleCategory]}</TableCell>
									<TableCell>
										{author ? (
											<Link href={`/member?memberId=${author._id}`} className={styles.communityAuthor}>
												<Avatar src={imageUrl(author.memberImage)} alt={author.memberNick}>
													{initials(author.memberNick)}
												</Avatar>
												<span>{author.memberNick}</span>
											</Link>
										) : 'Author unavailable'}
									</TableCell>
									<TableCell>{article.articleViews}</TableCell>
									<TableCell>{article.articleLikes}</TableCell>
									<TableCell>{new Date(article.createdAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</TableCell>
									<TableCell>
										<Chip
											size="small"
											label={active ? 'Active' : 'Deleted'}
											className={active ? styles.communityActive : styles.communityDeleted}
										/>
									</TableCell>
									<TableCell>
										<Button
											variant="outlined"
											size="small"
											color={active ? 'primary' : 'error'}
											disabled={loading || saving}
											onClick={() => onDelete(article, !active)}
										>
											{active ? 'Soft Delete' : 'Permanently remove'}
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
						{articles.length === 0 && (
							<TableRow>
								<TableCell colSpan={8} align="center">
									{loading ? 'Loading posts…' : error ? 'Posts are unavailable. Try Refresh.' : 'No posts found.'}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div"
				count={total}
				page={visiblePage}
				rowsPerPage={limit}
				rowsPerPageOptions={[10, 20, 40, 60]}
				onPageChange={(_, nextPage) => {
					if (!loading && !saving) onPagination(nextPage + 1, limit);
				}}
				onRowsPerPageChange={(event) => {
					if (!loading && !saving) onPagination(1, Number(event.target.value));
				}}
				SelectProps={{ disabled: loading || saving }}
				backIconButtonProps={{ disabled: loading || saving || visiblePage === 0 }}
				nextIconButtonProps={{ disabled: loading || saving || (visiblePage + 1) * limit >= total }}
			/>
		</>
	);
};

export default CommunityArticleList;
