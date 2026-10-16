import { Html, Head, Main, NextScript, DocumentProps } from 'next/document';

export default function Document({ locale = 'en' }: DocumentProps) {
	return (
		<Html lang={locale === 'kr' ? 'ko' : locale}>
			<Head>
				<meta name="robots" content="index,follow" />
				<link rel="icon" type="image/svg+xml" href="/img/logo/favicon.svg?v=homehero-1" />

				{/* SEO */}
				<meta name="keyword" content={'homehero'} />
				<meta
					name={'description'}
					content={
						'HomeHero connects customers with local home service professionals. | ' +
						'HomeHero помогает клиентам находить местных специалистов по бытовым услугам. | ' +
						'HomeHero는 고객과 지역 홈서비스 전문가를 연결하는 플랫폼입니다.'
					}
				/>
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
