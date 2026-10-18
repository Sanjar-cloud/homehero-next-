import React from 'react';
import Link from 'next/link';
import { Avatar, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField } from '@mui/material';
import type { Member } from '../../../types/member/member';
import { MemberStatus, MemberType } from '../../../enums/member.enum';
import { imageUrl, initials } from '../../service/ServiceCard';
import styles from '../../../../scss/homehero/admin.module.scss';

export type AdminMember = Pick<Member,
	'_id' | 'memberNick' | 'memberImage' | 'memberFullName' | 'memberPhone'
	| 'memberType' | 'memberStatus' | 'memberWarnings' | 'memberBlocks' | 'createdAt'
>;

interface MemberPanelListProps {
	members: AdminMember[];
	currentMemberId: string;
	total: number;
	page: number;
	limit: number;
	loading: boolean;
	saving: boolean;
	error: boolean;
	onUpdate: (member: AdminMember, field: 'memberType' | 'memberStatus', value: MemberType | MemberStatus) => Promise<void>;
	onPagination: (page: number, limit: number) => void;
}

export const MemberPanelList = ({
	members, currentMemberId, total, page, limit, loading, saving, error, onUpdate, onPagination,
}: MemberPanelListProps) => {
	const visiblePage = Math.min(page - 1, Math.max(0, Math.ceil(total / limit) - 1));

	return (
		<>
			<TableContainer aria-busy={loading}>
				<Table className={styles.usersTable} aria-label="Members">
					<TableHead>
						<TableRow>
							{['Member', 'Full name', 'Phone', 'Role', 'Status', 'Warnings', 'Blocks', 'Joined'].map((heading) => (
								<TableCell key={heading}>{heading}</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{members.map((member) => {
							const ownAccount = member._id === currentMemberId;
							return (
								<TableRow key={member._id}>
									<TableCell>
										<div className={styles.usersIdentity}>
											<Avatar src={imageUrl(member.memberImage)} alt={member.memberNick}>
												{initials(member.memberNick)}
											</Avatar>
											<div>
												<Link href={`/member?memberId=${member._id}`}>
													<strong>{member.memberNick}{ownAccount ? ' (you)' : ''}</strong>
												</Link>
												<small>{member._id}</small>
											</div>
										</div>
									</TableCell>
									<TableCell>{member.memberFullName || 'Not provided'}</TableCell>
									<TableCell>{member.memberPhone || 'Not provided'}</TableCell>
									<TableCell>
										<TextField
											select
											size="small"
											value={member.memberType}
											disabled={loading || saving || ownAccount}
											SelectProps={{ inputProps: { 'aria-label': `Role for ${member.memberNick}` } }}
											onChange={(event) => onUpdate(member, 'memberType', event.target.value as MemberType)}
										>
											{Object.values(MemberType).map((type) => (
												<MenuItem key={type} value={type}>{type}</MenuItem>
											))}
										</TextField>
									</TableCell>
									<TableCell>
										<TextField
											select
											size="small"
											value={member.memberStatus}
											disabled={loading || saving || ownAccount}
											className={styles[`usersStatus${member.memberStatus}`]}
											SelectProps={{ inputProps: { 'aria-label': `Status for ${member.memberNick}` } }}
											onChange={(event) => onUpdate(member, 'memberStatus', event.target.value as MemberStatus)}
										>
											<MenuItem value={MemberStatus.ACTIVE}>Active</MenuItem>
											<MenuItem value={MemberStatus.BLOCK}>Blocked</MenuItem>
											<MenuItem value={MemberStatus.DELETE}>Deleted</MenuItem>
										</TextField>
									</TableCell>
									<TableCell>{member.memberWarnings}</TableCell>
									<TableCell>{member.memberBlocks}</TableCell>
									<TableCell>{new Date(member.createdAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</TableCell>
								</TableRow>
							);
						})}
						{members.length === 0 && (
							<TableRow>
								<TableCell colSpan={8} align="center">
									{loading ? 'Loading members…' : error ? 'Members are unavailable. Try Refresh.' : 'No members found.'}
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
