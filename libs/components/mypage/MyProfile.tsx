import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient, useMutation, useReactiveVar } from '@apollo/client';
import axios from 'axios';
import { FiEdit3 } from 'react-icons/fi';
import { userVar } from '../../../apollo/store';
import { UPDATE_MEMBER } from '../../../apollo/user/mutation';
import type { MemberUpdate } from '../../types/member/member.update';
import { getJwtToken, updateStorage, updateUserInfo } from '../../auth';
import { sweetMixinSuccessAlert } from '../../sweetAlert';
import { Button, Input } from '../homehero/UI';
import { ServiceImage } from '../service/ServiceCard';
import styles from '../../../scss/homehero/mypage.module.scss';

const MyProfile = () => {
	const router = useRouter();
	const client = useApolloClient();
	const user = useReactiveVar(userVar);
	const [updateData, setUpdateData] = useState<MemberUpdate>({ _id: user._id });
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const mounted = useRef(true);
	const requestLock = useRef(false);
	const editing = router.query.category === 'accountSettings' || router.query.edit === '1';
	const name = user.memberFullName || user.memberNick;

	/** APOLLO REQUESTS **/
	const [updateMember] = useMutation(UPDATE_MEMBER, { fetchPolicy: 'no-cache' });

	/** LIFECYCLES **/
	useEffect(() => {
		setUpdateData({
			_id: user._id,
			memberNick: user.memberNick,
			memberPhone: user.memberPhone,
			memberFullName: user.memberFullName || '',
			memberAddress: user.memberAddress || '',
			memberImage: user.memberImage || '',
			memberDesc: user.memberDesc || '',
		});
		setError('');
	}, [user, editing]);
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);

	/** HANDLERS **/
	const changeEditorHandler = async (open: boolean) => {
		const query = { ...router.query };
		if (open) query.edit = '1';
		else {
			delete query.edit;
			query.category = 'myProfile';
		}
		try {
			await router.push({ pathname: '/mypage', query }, undefined, { shallow: true, scroll: false });
		} catch {
			if (mounted.current) setError('Unable to open the profile. Please try again.');
		}
	};

	const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
		const image = event.target.files?.[0];
		if (!image || requestLock.current || !user._id) return;
		const memberId = user._id;
		const sessionToken = getJwtToken();
		requestLock.current = true;
		setPending(true);
		setError('');

		try {
			if (!['image/jpeg', 'image/png'].includes(image.type)) throw new Error('Invalid image');
			const formData = new FormData();
			formData.append('operations', JSON.stringify({
				query: 'mutation ImageUploader($file: Upload!, $target: String!) { imageUploader(file: $file, target: $target) }',
				variables: { file: null, target: 'member' },
			}));
			formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
			formData.append('0', image);
			const response = await axios.post(`${process.env.REACT_APP_API_GRAPHQL_URL}`, formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					'apollo-require-preflight': true,
					Authorization: `Bearer ${getJwtToken()}`,
				},
			});
			const responseImage = response.data?.data?.imageUploader;
			if (response.data?.errors?.length || typeof responseImage !== 'string' || !responseImage) throw new Error('Upload failed');
			if (!mounted.current || userVar()._id !== memberId || getJwtToken() !== sessionToken) return;
			setUpdateData((current) => ({ ...current, memberImage: responseImage }));
		} catch {
			console.warn('Profile image upload failed');
			if (mounted.current && userVar()._id === memberId && getJwtToken() === sessionToken) setError('Unable to upload image. Choose a JPG or PNG file and try again.');
		} finally {
			requestLock.current = false;
			if (mounted.current && userVar()._id === memberId && getJwtToken() === sessionToken) setPending(false);
		}
	};

	const updateProfileHandler = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (requestLock.current || !user._id || updateData._id !== user._id) return;
		const memberId = user._id;
		let sessionToken = getJwtToken();
		requestLock.current = true;
		setPending(true);
		setError('');

		try {
			// Only editable profile fields enter the mutation; roles and credentials never do.
			const input: MemberUpdate = {
				_id: memberId,
				memberNick: updateData.memberNick,
				memberPhone: updateData.memberPhone,
				memberAddress: updateData.memberAddress,
				memberImage: updateData.memberImage,
				memberDesc: updateData.memberDesc,
			};
			if (updateData.memberFullName) input.memberFullName = updateData.memberFullName;
			else if (user.memberFullName) throw new Error('Full name required');
			const result = await updateMember({ variables: { input } });
			if (!mounted.current || userVar()._id !== memberId || getJwtToken() !== sessionToken) return;
			const profile = result.data?.updateMember;
			if (profile?._id !== memberId) throw new Error('Profile update failed');
			const jwtToken = profile.accessToken;
			if (typeof jwtToken !== 'string' || !jwtToken) throw new Error('Profile update failed');
			updateStorage({ jwtToken });
			updateUserInfo(jwtToken);
			sessionToken = jwtToken;
			// Update existing public profile records without caching the access token.
			for (const __typename of ['Member', 'ServiceProvider']) {
				const id = client.cache.identify({ __typename, _id: memberId });
				if (!id) continue;
				client.cache.modify({
					id,
					fields: {
						memberNick: () => profile.memberNick,
						memberPhone: () => profile.memberPhone,
						memberFullName: () => profile.memberFullName,
						memberImage: () => profile.memberImage,
						memberAddress: () => profile.memberAddress,
						memberDesc: () => profile.memberDesc,
					},
				});
			}
			await sweetMixinSuccessAlert('information updated successfully.');
		} catch {
			console.warn('Profile update failed');
			if (mounted.current && userVar()._id === memberId && getJwtToken() === sessionToken) setError('Unable to update profile. Check your information and try again.');
		} finally {
			requestLock.current = false;
			if (mounted.current && userVar()._id === memberId && getJwtToken() === sessionToken) setPending(false);
		}
	};

	return (
		<section>
			{error && <div className={styles.error} role="alert">{error}</div>}
			{editing ? (
				<>
					<div className={styles.sectionHeading}>
						<h2>{router.query.category === 'accountSettings' ? 'Account settings' : 'Edit profile'}</h2>
						<p>Update your account and contact information.</p>
					</div>
					<form className={styles.form} onSubmit={updateProfileHandler} aria-busy={pending}>
						<div className={styles.upload}>
							<ServiceImage path={updateData.memberImage?.startsWith('/img/') ? undefined : updateData.memberImage} alt={name} avatar className={styles.profileAvatar} />
							<div>
								<label htmlFor="profile-image">Upload Profile Image</label>
								<input id="profile-image" type="file" accept="image/jpeg,image/png" disabled={pending} onChange={uploadImage} />
								<small>JPG, JPEG or PNG. Save changes to update your profile.</small>
							</div>
						</div>
						<div className={styles.formGrid}>
							<label>
								Nickname
								<Input
									value={updateData.memberNick || ''}
									required minLength={3} maxLength={12}
									disabled={pending}
									onChange={(event) => setUpdateData({ ...updateData, memberNick: event.target.value })}
								/>
							</label>
							<label>
								Phone number
								<Input
									value={updateData.memberPhone || ''}
									required
									disabled={pending}
									onChange={(event) => setUpdateData({ ...updateData, memberPhone: event.target.value })}
								/>
							</label>
						</div>
						<label>
								Full name
								<Input
									value={updateData.memberFullName || ''}
									minLength={3} maxLength={100} required={Boolean(user.memberFullName)}
									disabled={pending}
									onChange={(event) => setUpdateData({ ...updateData, memberFullName: event.target.value })}
								/>
							</label>
						<label>
								Address
								<Input
									value={updateData.memberAddress || ''}
									
									disabled={pending}
									onChange={(event) => setUpdateData({ ...updateData, memberAddress: event.target.value })}
								/>
							</label>
						<label>
							About
							<textarea
								value={updateData.memberDesc || ''}
								disabled={pending}
								onChange={(event) => setUpdateData({ ...updateData, memberDesc: event.target.value })}
							/>
						</label>
						<div className={styles.actions}>
							<Button type="submit" disabled={pending || !updateData.memberNick || !updateData.memberPhone}>{pending ? 'Please wait…' : 'Save changes'}</Button>
							<Button variant="secondary" disabled={pending} onClick={() => void changeEditorHandler(false)}>Cancel</Button>
						</div>
					</form>
				</>
			) : (
				<>
					<div className={styles.profileHead}>
						<ServiceImage path={user.memberImage?.startsWith('/img/') ? undefined : user.memberImage} alt={name} avatar className={`${styles.profileAvatar} ${user.memberType === 'AGENT' ? styles.agentAvatar : ''}`} />
						<div><h2>{name}</h2><p>{user.memberType === 'AGENT' ? 'Professional' : 'Customer'}{user.memberAddress ? ` · ${user.memberAddress}` : ''}</p></div>
						<Button variant="secondary" onClick={() => void changeEditorHandler(true)}><FiEdit3 size={16} aria-hidden="true" /> Edit profile</Button>
					</div>
					<div className={styles.profileGrid}>
						<div><span>Nickname</span><strong>{user.memberNick}</strong></div>
						<div><span>Phone number</span><strong>{user.memberPhone || 'Not provided'}</strong></div>
						<div><span>Address</span><strong>{user.memberAddress || 'Not provided'}</strong></div>
						<div><span>Account type</span><strong>{user.memberType}</strong></div>
					</div>
					<div className={styles.about}><h3>About</h3><p>{user.memberDesc || 'No description provided.'}</p></div>
				</>
			)}
		</section>
	);
};

export default MyProfile;
