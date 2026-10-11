import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
	return (
		<Html lang="en">
			<Head>
				<meta name="robots" content="index,follow" />
				<link rel="icon" type="image/png" href="/img/logo/favicon.svg" />

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
