import React from 'react';
import { Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from '@mui/material';
import { ServiceStatus } from '../../../enums/service.enum';
import type { Service } from '../../../types/service/service';
import { formatPrice, ServiceImage } from '../../service/ServiceCard';
import styles from '../../../../scss/homehero/admin.module.scss';

interface ServiceListProps {
	rows: Service[];
	total: number;
	page: number;
	limit: number;
	loading: boolean;
	saving: boolean;
	error: boolean;
	onStatus: (service: Service, status: ServiceStatus) => Promise<void>;
	onPagination: (page: number, limit: number) => void;
}

const ServiceList = ({ rows, total, page, limit, loading, saving, error, onStatus, onPagination }: ServiceListProps) => {
	const visiblePage = Math.min(page - 1, Math.max(0, Math.ceil(total / limit) - 1));

	return (
		<>
			<TableContainer aria-busy={loading}>
				<Table className={styles.serviceTable} aria-label="Services">
					<TableHead>
						<TableRow>
							{['Service', 'Provider', 'Category', 'Location', 'Price', 'Status', 'Created', 'Actions'].map((heading) => (
								<TableCell key={heading}>{heading}</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((service) => (
							<TableRow key={service._id}>
								<TableCell>
									<div className={styles.serviceIdentity}>
										<ServiceImage path={service.serviceImages?.[0]} alt={service.serviceTitle} className={styles.serviceThumbnail} />
										<span>{service.serviceTitle}</span>
									</div>
								</TableCell>
								<TableCell>{service.memberData?.memberNick || 'Provider unavailable'}</TableCell>
								<TableCell>{service.serviceCategory}</TableCell>
								<TableCell>{service.serviceLocation}</TableCell>
								<TableCell>{formatPrice(service.servicePrice)}</TableCell>
								<TableCell>
									<Chip
										size="small"
										label={service.serviceStatus === ServiceStatus.DELETE ? 'Deleted' : service.serviceStatus === ServiceStatus.ACTIVE ? 'Active' : 'Paused'}
										className={styles[`serviceStatus${service.serviceStatus}`]}
									/>
								</TableCell>
								<TableCell>{new Date(service.createdAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</TableCell>
								<TableCell>
									{service.serviceStatus === ServiceStatus.DELETE ? 'Read-only' : (
										<div className={styles.serviceActions}>
											<Button
												size="small" variant="outlined" disabled={saving || loading}
												onClick={() => onStatus(service, service.serviceStatus === ServiceStatus.ACTIVE ? ServiceStatus.PAUSED : ServiceStatus.ACTIVE)}
											>
												{service.serviceStatus === ServiceStatus.ACTIVE ? 'Pause' : 'Reactivate'}
											</Button>
											<Button
												size="small" color="error" disabled={saving || loading}
												onClick={() => onStatus(service, ServiceStatus.DELETE)}
											>
												Delete
											</Button>
										</div>
									)}
								</TableCell>
							</TableRow>
						))}
						{rows.length === 0 && (
							<TableRow>
								<TableCell colSpan={8} align="center">
									{loading ? 'Loading services…' : error ? 'Services are unavailable. Try Refresh.' : 'No services found.'}
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
				rowsPerPageOptions={[10, 20, 50]}
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

export default ServiceList;
