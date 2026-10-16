import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import Editor from '@toast-ui/editor';
import { useMutation } from '@apollo/client';
import { FiImage, FiX } from 'react-icons/fi';
import '@toast-ui/editor/dist/toastui-editor.css';
import { CREATE_BOARD_ARTICLE, UPDATE_BOARD_ARTICLE } from '../../../apollo/user/mutation';
import type { CommunityArticle } from '../../../apollo/user/community.query';
import { userVar } from '../../../apollo/store';
import { getJwtToken } from '../../auth';
import { BoardArticleCategory } from '../../enums/board-article.enum';
import { Button, Input } from '../homehero/UI';
import { imageUrl, ServiceImage } from '../service/ServiceCard';
import { communityCategories } from './CommunityPostCard';
import styles from '../../../scss/homehero/community.module.scss';

interface TuiEditorProps {
	article?: CommunityArticle;
	memberId: string;
	token: string;
}

export function validateArticle(title: string, content: string, text: string, category: string): string {
	if (!Object.values(BoardArticleCategory).includes(category as BoardArticleCategory)) {
		return 'Select a category.';
	}
	if (title.trim().length < 3 || title.trim().length > 50) {
		return 'Title must contain 3–50 characters.';
	}
	if (!text.trim() || content.trim().length < 3 || content.trim().length > 250) {
		return 'Content must contain 3–250 characters, including formatting. Please shorten the text or formatting.';
	}
	return '';
}

const TuiEditor = ({ article, memberId, token }: TuiEditorProps) => {
	const { t: translate } = useTranslation('common');
	const router = useRouter();
	const [category, setCategory] = useState(article?.articleCategory || '');
	const [title, setTitle] = useState(article?.articleTitle || '');
	const [image, setImage] = useState(article?.articleImage || '');
	const [contentLength, setContentLength] = useState(article?.articleContent.length || 0);
	const [pending, setPending] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uncertain, setUncertain] = useState(false);
	const [savedId, setSavedId] = useState('');
	const [error, setError] = useState('');
	const editorRef = useRef<Editor | null>(null);
	const editorElement = useRef<HTMLDivElement>(null);
	const fileInput = useRef<HTMLInputElement>(null);
	const mounted = useRef(false);
	const lock = useRef(false);
	const uploadController = useRef<AbortController | null>(null);
	const disabled = pending || uploading || uncertain || !!savedId;
	const currentAccount = () => mounted.current && userVar()._id === memberId && (getJwtToken() || '') === token;

	/** APOLLO REQUESTS **/
	const [createBoardArticle] = useMutation(CREATE_BOARD_ARTICLE, { fetchPolicy: 'no-cache' });
	const [updateBoardArticle] = useMutation(UPDATE_BOARD_ARTICLE, { fetchPolicy: 'no-cache' });

	/** HANDLERS **/
	const uploadImageHandler = async (file: File | undefined) => {
		if (!file || !currentAccount() || lock.current || disabled) return;
		setError('');
		if (
			!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type) ||
			!/\.(png|jpe?g)$/i.test(file.name) ||
			file.size === 0 ||
			file.size > 10000000
		) {
			setError('Choose a PNG or JPG image up to 10 MB.');
			return;
		}
		lock.current = true;
		setUploading(true);
		const controller = new AbortController();
		uploadController.current = controller;
		try {
			const formData = new FormData();
			formData.append('operations', JSON.stringify({
				query: 'mutation ImageUploader($file: Upload!, $target: String!) { imageUploader(file: $file, target: $target) }',
				variables: { file: null, target: 'article' },
			}));
			formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
			formData.append('0', file);
			const response = await axios.post(`${process.env.REACT_APP_API_GRAPHQL_URL}`, formData, {
				headers: { 'apollo-require-preflight': true, Authorization: `Bearer ${token}` },
				signal: controller.signal,
			});
			if (!currentAccount()) return;
			const path = response.data?.data?.imageUploader;
			if (response.data?.errors?.length || typeof path !== 'string' || !/^uploads\/article\/[\w-]+\.(png|jpe?g)$/i.test(path)) {
				throw new Error('Upload not confirmed');
			}
			setImage(path);
		} catch {
			if (currentAccount()) setError('Unable to upload the image. Your previous image is kept; please try again.');
		} finally {
			lock.current = false;
			if (currentAccount()) setUploading(false);
		}
	};

	const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!currentAccount() || lock.current || disabled) return;
		if (article && (article.memberId !== memberId || article.articleStatus !== 'ACTIVE')) return;
		const editor = editorRef.current;
		if (!editor) {
			setError('The editor is still loading. Please try again.');
			return;
		}
		const articleTitle = title.trim();
		const articleContent = editor.getHTML().trim();
		const validation = validateArticle(articleTitle, articleContent, editor.getMarkdown(), category);
		setContentLength(articleContent.length);
		if (validation) {
			setError(validation);
			return;
		}
		lock.current = true;
		setPending(true);
		setError('');
		try {
			const input = { articleTitle, articleContent, articleImage: image };
			const response = article
				? await updateBoardArticle({ variables: { input: { _id: article._id, ...input } } })
				: await createBoardArticle({ variables: { input: { articleCategory: category, ...input } } });
			if (!currentAccount()) return;
			const saved = article ? response.data?.updateBoardArticle : response.data?.createBoardArticle;
			if (
				!saved?._id ||
				(article && saved._id !== article._id) ||
				saved.memberId !== memberId ||
				saved.articleStatus !== 'ACTIVE' ||
				saved.articleCategory !== category ||
				saved.articleTitle !== articleTitle ||
				saved.articleContent !== articleContent ||
				(saved.articleImage || '') !== image
			) {
				throw new Error('Post not confirmed');
			}
			setSavedId(saved._id);
			try {
				await router.push('/mypage?category=myArticles');
			} catch {
				if (currentAccount()) setError('Your post was saved, but My Posts could not open. Use the links below.');
			}
		} catch {
			if (currentAccount()) {
				setUncertain(true);
				setError('Unable to confirm the save. Your draft is kept. Check My Posts before trying again; the request will not be retried automatically.');
			}
		} finally {
			lock.current = false;
			if (currentAccount()) setPending(false);
		}
	};

	const contentChangeHandler = () => {
		if (currentAccount()) setContentLength(editorRef.current?.getHTML().trim().length || 0);
	};

	/** LIFECYCLES **/
	useEffect(() => {
		mounted.current = true;
		if (!editorElement.current) return;
		// Own the instance lifecycle: the legacy React wrapper does not destroy it in Strict Mode.
		const editor = new Editor({
			el: editorElement.current,
			initialValue: article?.articleContent || '',
			initialEditType: 'wysiwyg',
			height: '160px',
			autofocus: false,
			hideModeSwitch: true,
			toolbarItems: [],
			usageStatistics: false,
			placeholder: translate('Share your question, experience, or advice...'),
			events: { change: contentChangeHandler },
			hooks: { addImageBlobHook: () => false },
		});
		editorRef.current = editor;
		setContentLength(editor.getHTML().trim().length);
		return () => {
			mounted.current = false;
			uploadController.current?.abort();
			editorRef.current = null;
			editor.destroy();
		};
	}, []);

	useEffect(() => {
		editorRef.current?.setPlaceholder(translate('Share your question, experience, or advice...'));
	}, [translate]);

	return (
		<form className={styles.postForm} onSubmit={submitHandler} noValidate>
			<label htmlFor="post-category">
				{translate('Category')}
				<select
					id="post-category"
					value={category}
					disabled={disabled || !!article}
					onChange={(event) => setCategory(event.target.value)}
				>
					<option value="" disabled>
						{translate('Select a category')}
					</option>
					{Object.values(BoardArticleCategory).map((value) => (
						<option value={value} key={value}>
							{translate(communityCategories[value])}
						</option>
					))}
				</select>
				{article && <small>{translate('A published post\'s category cannot be changed.')}</small>}
			</label>
			<label htmlFor="post-title">
				{translate('Title')}
				<Input
					id="post-title"
					value={title}
					maxLength={50}
					disabled={disabled}
					placeholder={translate('What would you like to discuss?')}
					onChange={(event) => setTitle(event.target.value)}
				/>
				<small>{title.length}/50</small>
			</label>
			<div className={styles.contentField}>
				<label id="post-content-label">{translate('Content')}</label>
				<div
					className={styles.richEditor}
					role="group"
					aria-labelledby="post-content-label"
					aria-disabled={disabled}
					onKeyDownCapture={(event) => {
						if (disabled && event.key !== 'Tab') event.preventDefault();
					}}
					onPasteCapture={(event) => {
						if (disabled) event.preventDefault();
					}}
				>
					<div ref={editorElement} />
				</div>
				<small className={contentLength > 250 ? styles.limitError : ''}>{contentLength}{translate('/250 characters, including formatting.')}</small>
			</div>
			<div className={styles.contentField}>
				<span className={styles.fieldLabel}>{translate('Optional image')}</span>
				<div className={styles.uploadBox}>
					<FiImage size={24} aria-hidden="true" />
					<span>
						<strong>{translate('Add an image')}</strong>
						<small>{translate('PNG or JPG, up to 10 MB')}</small>
					</span>
					<Button variant="secondary" disabled={disabled} onClick={() => fileInput.current?.click()}>{uploading ? translate('Uploading…') : translate('Browse')}</Button>
					<input
						ref={fileInput}
						type="file"
						accept="image/png,image/jpeg"
						aria-label={translate('Upload post image')}
						className={styles.hiddenInput}
						disabled={disabled}
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = '';
							void uploadImageHandler(file);
						}}
					/>
				</div>
				{imageUrl(image) && (
					<div className={styles.coverPreview}>
						<ServiceImage path={image} alt={translate('Post cover preview')} />
						<Button variant="secondary" disabled={disabled} onClick={() => setImage('')} aria-label={translate('Remove cover image')}><FiX size={16} /> {translate('Remove')}</Button>
					</div>
				)}
			</div>
			{error && <div className={styles.detailError} role="alert"><p>{translate(error, { defaultValue: error })}</p></div>}
			{savedId && <p className={styles.notice} role="status">{article ? translate('Post updated.') : translate('Post published.')}</p>}
			{(uncertain || savedId) && <Link className={styles.textLink} href="/mypage?category=myArticles">{translate('Check My Posts')}</Link>}
			{savedId && <Link className={styles.textLink} href={{ pathname: '/community/detail', query: { articleCategory: category, id: savedId } }}>{translate('View saved post')}</Link>}
			<div className={styles.formActions}>
				<Link className={styles.textLink} href={article ? '/mypage?category=myArticles' : '/community'}>{translate('Cancel')}</Link>
				<Button type="submit" disabled={disabled}>{pending ? translate('Saving…') : article ? translate('Save Changes') : translate('Publish Post')}</Button>
			</div>
		</form>
	);
};

export default TuiEditor;
