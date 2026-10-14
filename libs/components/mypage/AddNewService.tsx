import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { useMutation, useReactiveVar } from '@apollo/client';
import { FiCheck, FiImage, FiPlus, FiX } from 'react-icons/fi';
import { userVar } from '../../../apollo/store';
import { CREATE_SERVICE, UPDATE_SERVICE } from '../../../apollo/user/service.mutation';
import { getJwtToken } from '../../auth';
import { ServiceCategory, ServiceLocation } from '../../enums/service.enum';
import type { Service } from '../../types/service/service';
import type { ServiceInput } from '../../types/service/service.input';
import { Button, Input } from '../homehero/UI';
import { imageUrl } from '../service/ServiceCard';
import { label } from '../service/ServiceFilter';
import styles from '../../../scss/homehero/service-management.module.scss';

interface AddNewServiceProps {
	service?: Service;
	onSaved?: () => Promise<void>;
	onCancel?: () => void;
}

export function validateServiceInput(input: ServiceInput): string {
	if (input.serviceTitle.length < 3 || input.serviceTitle.length > 100) return 'Title must contain 3–100 characters.';
	if (!Object.values(ServiceCategory).includes(input.serviceCategory)) return 'Select a category.';
	if (!Object.values(ServiceLocation).includes(input.serviceLocation)) return 'Select a location.';
	if (input.serviceDesc != null && (input.serviceDesc.length < 5 || input.serviceDesc.length > 500)) {
		return 'Description must contain 5–500 characters or be blank.';
	}
	if (input.servicePrice != null &&
		(!Number.isInteger(input.servicePrice) || input.servicePrice < 0 || input.servicePrice > 2147483647)) {
		return 'Price must be a whole KRW amount from 0 to 2,147,483,647.';
	}
	if (input.serviceImages.length < 1 || input.serviceImages.length > 10 || input.serviceImages.some((path) => !path.trim())) {
		return 'Upload 1–10 service photos.';
	}
	return '';
}

const AddNewService = ({ service, onSaved, onCancel }: AddNewServiceProps) => {
	const user = useReactiveVar(userVar);
	const memberId = user._id;
	const [title, setTitle] = useState(service?.serviceTitle ?? '');
	const [category, setCategory] = useState(service?.serviceCategory ?? '');
	const [location, setLocation] = useState(service?.serviceLocation ?? '');
	const [description, setDescription] = useState(service?.serviceDesc ?? '');
	const [price, setPrice] = useState(service?.servicePrice == null ? '' : String(service.servicePrice));
	const [images, setImages] = useState<string[]>(service?.serviceImages ?? []);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const lock = useRef(false);
	const mounted = useRef(true);
	const fileInput = useRef<HTMLInputElement>(null);

	/** APOLLO REQUESTS **/
	const [createService] = useMutation(CREATE_SERVICE, { fetchPolicy: 'no-cache' });
	const [updateService] = useMutation(UPDATE_SERVICE, { fetchPolicy: 'no-cache' });
	const isCurrentAgent = () => mounted.current && userVar()._id === memberId && userVar().memberType === 'AGENT';

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	/** HANDLERS **/
	const uploadImages = async (files: File[]) => {
		if (!isCurrentAgent() || lock.current || !files.length) return;
		setError('');
		setSuccess('');
		if (images.length + files.length > 10) {
			setError('You can keep up to 10 photos.');
			return;
		}
		if (files.some((file) => !['image/png', 'image/jpeg', 'image/jpg'].includes(file.type) || file.size > 10000000 || file.size === 0)) {
			setError('Choose PNG or JPG photos up to 10 MB each.');
			return;
		}
		lock.current = true;
		setPending(true);
		try {
			const formData = new FormData();
			formData.append('operations', JSON.stringify({
				query: 'mutation ImagesUploader($files: [Upload!]!, $target: String!) { imagesUploader(files: $files, target: $target) }',
				variables: { files: files.map(() => null), target: 'service' },
			}));
			formData.append('map', JSON.stringify(Object.fromEntries(files.map((_, index) => [String(index), [`variables.files.${index}`]]))));
			files.forEach((file, index) => formData.append(String(index), file));
			const response = await axios.post(`${process.env.REACT_APP_API_GRAPHQL_URL}`, formData, {
				headers: { 'apollo-require-preflight': true, Authorization: `Bearer ${getJwtToken()}` },
			});
			const paths = response.data?.data?.imagesUploader;
			if (response.data?.errors?.length ||
				!Array.isArray(paths) ||
				paths.length !== files.length ||
				paths.some((path) => typeof path !== 'string' || !/^uploads\/service\/[^/]+$/.test(path))) {
				throw new Error('Upload failed');
			}
			if (isCurrentAgent()) setImages((current) => [...current, ...paths]);
		} catch {
			if (isCurrentAgent()) setError('Photos could not be uploaded. Existing photos were kept. Please try again.');
		} finally {
			lock.current = false;
			if (isCurrentAgent()) setPending(false);
		}
	};

	const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isCurrentAgent() || lock.current || (service && service.memberId !== memberId)) return;
		const input: ServiceInput = {
			serviceTitle: title.trim(),
			serviceCategory: category as ServiceCategory,
			serviceLocation: location as ServiceLocation,
			serviceDesc: description.trim() || null,
			servicePrice: price.trim() === '' ? null : Number(price),
			serviceImages: images,
		};
		const validationError = validateServiceInput(input);
		setError(validationError);
		setSuccess('');
		if (validationError) return;
		lock.current = true;
		setPending(true);
		try {
			const result = service
				? await updateService({ variables: { input: { ...input, _id: service._id } } })
				: await createService({ variables: { input } });
			const saved = result.data && ('updateService' in result.data ? result.data.updateService : result.data.createService);
			if (!saved?._id || saved.memberId !== memberId || (service && saved._id !== service._id)) {
				throw new Error('Invalid response');
			}
			if (!isCurrentAgent()) return;
			setSuccess(service ? 'Service updated successfully.' : 'Your service was published successfully.');
			if (!service) {
				setTitle('');
				setCategory('');
				setLocation('');
				setDescription('');
				setPrice('');
				setImages([]);
			}
			try {
				await onSaved?.();
			} catch {
				if (isCurrentAgent()) setError('Service saved, but the list could not refresh. Return to My Services and retry loading.');
			}
		} catch {
			if (isCurrentAgent()) setError('Unable to confirm the save. Check My Services before trying again.');
		} finally {
			lock.current = false;
			if (isCurrentAgent()) setPending(false);
		}
	};

	if (!memberId || user.memberType !== 'AGENT' || (service && service.memberId !== memberId)) {
		return <p role="alert">This destination is for service providers.</p>;
	}

	return (
		<section className={styles.panel} aria-busy={pending}>
			<div className={styles.heading}>
				<h2>{service ? 'Edit service' : 'Add a new service'}</h2>
				<p>Create a detailed listing so customers know exactly how you can help.</p>
			</div>
			{error && (
				<p className={styles.error} role="alert">{error}</p>
			)}
			{success && (
				<p className={styles.success} role="status">
					<FiCheck />
					{success}
				</p>
			)}
			<form className={styles.form} onSubmit={submitHandler}>
				<fieldset disabled={pending}>
					<label>
						Service title
						<Input
							required
							minLength={3}
							maxLength={100}
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="e.g. Same-day plumbing and leak repair"
						/>
					</label>
					<label>Category
						<select
							required
							value={category}
							onChange={(event) => setCategory(event.target.value)}
						>
							<option value="" disabled>Select a category</option>
							{Object.values(ServiceCategory).map((value) => <option key={value} value={value}>{label(value)}</option>)}
						</select>
					</label>
					<label>
						Description
						<textarea
							maxLength={500}
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Describe what is included and what customers can expect…"
						/>
					</label>
					<div>
						<span className={styles.fieldLabel}>Photos</span>
						<div
							className={styles.upload}
							onDragOver={(event) => event.preventDefault()}
							onDrop={(event) => {
								event.preventDefault();
								void uploadImages(Array.from(event.dataTransfer.files));
							}}
						>
							<FiImage size={30} aria-hidden="true" />
							<span>
								<strong>Upload service photos</strong>
								<small>Drag and drop or browse · PNG or JPG up to 10 MB · 1–10 photos</small>
							</span>
							<Button variant="secondary" onClick={() => fileInput.current?.click()}>Browse files</Button>
							<input
								ref={fileInput}
								hidden
								type="file"
								accept="image/png,image/jpeg"
								multiple
								onChange={(event) => {
									void uploadImages(Array.from(event.target.files ?? []));
									event.target.value = '';
								}}
							/>
						</div>
						<div className={styles.photos}>
							{images.map((path, index) => (
								<div key={`${path}:${index}`}>
									<img src={imageUrl(path)} alt={`Service photo ${index + 1}`} />
									<button
										type="button"
										aria-label={`Remove photo ${index + 1}`}
										onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
									>
										<FiX />
									</button>
								</div>
							))}
						</div>
					</div>
					<div className={styles.formGrid}>
						<label>
							Price (KRW, optional)
							<Input
								type="number"
								min={0}
								max={2147483647}
								step={1}
								value={price}
								onChange={(event) => setPrice(event.target.value)}
								placeholder="Leave blank if unspecified"
							/>
						</label>
						<label>Location
							<select
								required
								value={location}
								onChange={(event) => setLocation(event.target.value)}
							>
								<option value="" disabled>Select a location</option>
								{Object.values(ServiceLocation).map((value) => <option key={value} value={value}>{label(value)}</option>)}
							</select>
						</label>
					</div>
					<div className={styles.actions}>
						<p>You can edit or pause this service at any time.</p>
						{onCancel && (
							<Button variant="secondary" onClick={onCancel}>Cancel</Button>
						)}
						<Button type="submit">
							<FiPlus />
							{pending ? 'Please wait…' : service ? 'Save changes' : 'Publish service'}
						</Button>
					</div>
				</fieldset>
			</form>
		</section>
	);
};

export default AddNewService;
