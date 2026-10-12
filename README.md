This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## HomeHero Homepage — Batch 3

The `/` page uses the existing HomeHero layout, authentication initialization, and Apollo Service documents. Popular services use `GET_SERVICES` with page 1, limit 4, and `serviceLikes DESC`; newest services use page 1, limit 8, and `createdAt DESC`. Both use an empty search object. Hero search and category links use the existing `/service` URL filters. Favorites use `LIKE_TARGET_SERVICE`, a shared per-service request lock, and refetch both sections after a successful mutation.

The Figma Make homepage is adapted with six backend categories, Korean locations, optional KRW prices, public provider data, and real service counters. Ratings, verification badges, testimonials, availability, booking, and calls are intentionally omitted. The hero photograph is a decorative external Unsplash asset from the Figma reference, not a provider profile photo. Homepage copy is English; existing locale switching remains available. The optional `ServiceCard` grid variant keeps the default listing behavior and styles unchanged. Detail back links continue to use `/service`; browser Back returns to the homepage.

Validation: TypeScript and production build passed. Guest browser checks passed for homepage search, category navigation, favorite login referrer, AGENT signup entry, login/signup form states, Service Detail/gallery navigation, listing filters, Clear → Sort, refresh/back/forward, and desktop/tablet/mobile layouts. EN/KR/RU locale route switching also passed. Default listing card dimensions and styles matched the pre-change baseline. Loading, empty, and error section rendering passed in isolated checks using installed React/TypeScript tools. Lint was stopped at the ESLint configuration prompt without creating configuration.

Authenticated login/logout, role-specific runtime behavior, persisted likes/comments, and multi-page pagination remain unverified in this batch; no credentials, database fixtures, or database writes were used. Live homepage empty-data/network-error recovery and a screenshot-to-screenshot comparison against a running Figma reference were not performed. Visual checks used the extracted Figma JSX/CSS as the reference. Existing build warnings include outdated Browserslist data and react-i18next initialization; no dependency or configuration changes were made.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
