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

## HomeHero Service Favorites — Batch 4

`/mypage?category=myFavorites` uses the HomeHero layout and `MyServiceFavorites`; other My Page categories retain their legacy components and layout. The route waits for router readiness before mounting either branch. Guests return through the existing login flow with the complete Favorites URL as the referrer.

Favorites use the existing authenticated `GET_SERVICE_FAVORITES` document with page size 6. The backend derives the owner from authentication and orders saved services by the like record's update time. Pagination uses the URL `page` parameter, preserves the category, and corrects an empty out-of-range last page. Removing a favorite uses `LIKE_TARGET_SERVICE`, prevents duplicate pending actions for the same service, and refetches the list. Cards use the existing grid variant; their optional `saved` prop reflects actual Favorites membership because this response does not populate `meLiked`. Existing card consumers retain their default appearance and behavior.

Private results use `no-cache`, a panel keyed by member ID, current-account guards for asynchronous actions, and per-query `queryDeduplication: false` to prevent identical in-flight page requests from being shared between accounts. Global Apollo configuration and JWT handling are unchanged. The scoped responsive sidebar contains the existing Profile and Favorites destinations; unsupported Figma demo features are not added.

Validation: TypeScript and production build passed. Lint was stopped at the existing ESLint configuration prompt without creating configuration. Guest browser checks passed for Favorites login/referrer behavior on desktop and mobile, login/signup form states, homepage search navigation, listing Clear → Sort, refresh/back/forward, network-error rendering, and invalid Service Detail links. The original legacy My Page component body and ServiceCard rendering were checked against the pre-batch snapshot.

Isolated React/Apollo checks with a mock transport passed for separate account requests, late previous-account responses, absence of private cache entries, logout, empty/error states, and out-of-range page correction. These are not live backend integration tests. During the final browser checks, the backend on port 3007 was unavailable. Live Service data regression, authenticated Favorites rendering and persistence, multi-page pagination, removal, and cross-account verification remain blocked. No database writes or fixtures were used. Authenticated visual comparison against Figma remains unverified.

## HomeHero My Page UI Correction

The default `/mypage` and migrated account categories use `LayoutHomeHero` and the shared `MyPageLayout`. USER navigation is Profile, Favorites, My Reviews, Followings, and Account settings. AGENT navigation is Profile, Add Service, My Services, Followers, and Followings. Roles come from authenticated member state, never demo query parameters. Every menu item is visible and clickable. At the UI-correction checkpoint, Add Service/My Services opened explanatory panels; Batch 5 below replaces those AGENT panels with real frontend integration. At that checkpoint, `/chat` and `category=messages` were UI-only destinations. Batch 6 below integrates `/chat` and redirects the Messages alias. My Reviews does not fabricate rated reviews.

Profile uses real nickname, name, phone, address, role, image, and description. The Figma email/Member-since cells are adapted to supported auth-state fields. Edit profile uses `edit=1`; USER Account settings uses the same editor. Updates allow only editable profile fields and retain the existing update/upload/token-storage sequence. No role/status/password update controls are added. Private drafts and asynchronous actions are guarded by account identity. Existing backend security findings remain separate remediation work.

Batch 4 Favorites query/mutation behavior, page size 6, saved membership, locks, refetch, last-page correction, no-cache requests, per-query deduplication setting, and account guards are preserved inside the shared frame. Followers/Followings use additive minimal GraphQL selections, current-account filters, real records, and existing relationship mutations. Connection cards retain the reference cover/avatar structure with a plain navy cover fallback; Services/Followers/Likes use real counters instead of unsupported jobs or ratings. The default ServiceCard is unchanged. Legacy categories `addProperty`, `myProperties`, `recentlyVisited`, `myArticles`, and `writeArticle` retain their prior branch/components; ADMIN keeps the legacy branch. These are documented legacy visual exceptions, not migrated Service screens.

Header dropdowns match the USER/AGENT item order. Footer uses the reference four-column structure. Browse services and account destinations work; Safety/Contact reveal honest unavailability notices. Newsletter submission sends no request, stores no email, and reports no fake success. Styles remain scoped. The My Page dispatcher waits for client mount/router readiness to prevent mismatched initial server/client layout markup.

Validation: TypeScript and production build passed (82 generated pages). The two additive Follow documents validated against the running backend schema through read-only introspection. Lint was stopped at the existing ESLint setup prompt without creating files. Live AGENT checks passed for Profile/edit/cancel, exact sidebar/dropdown, Add Service/My Services/Messages panels, empty Followers/Followings, and Favorites empty-page correction. Guest checks passed for auth/referrers, homepage real Service data/search, listing Clear → Sort/refresh, Service Detail/gallery/back navigation, and mobile Header behavior. Responsive guest auth checks found no overflow at 390, 1024, and 320 CSS pixels.

Isolated React/Apollo checks passed separately for USER and AGENT menus, clickable destinations, profile payload allowlisting/failure reporting/draft reset/cancel-reopen, and preserved Favorites late-response/cache/logout/pagination isolation. They do not establish live USER integration or JWT algorithm correctness. Live profile/upload/follow/like mutations and persisted Favorites removal were not executed because database writes were prohibited.

Visual acceptance remains incomplete: the reference Make preview was accessible, and computed typography exposed an excess-bold mismatch that was corrected. Frontend review screenshots were captured, but Chrome viewport control did not produce matching reference/frontend viewport sizes; the standalone reference preview URL was blocked. Full side-by-side desktop/tablet/mobile Figma parity is therefore BLOCKED. No real USER browser session was available. Existing Browserslist, react-i18next, and shared-layout font stylesheet warnings remain; no dependency/configuration changes were made.

## Batch 5 — AGENT Service Management

`category=addService` and `category=myServices` now mount provider-only Service panels inside the approved My Page frame. The shared Header, Footer, sidebar, Profile, Favorites, Followers/Followings, auth and legacy categories are unchanged. Existing CREATE_SERVICE, GET_AGENT_SERVICES and UPDATE_SERVICE documents/types are reused without contract changes.

Creation and inline editing use backend title/description limits, existing category/location enums, optional integer KRW price (blank clears it), and 1–10 photos. Authenticated multipart imagesUploader uses a dynamic file map and fixed target `service`. PNG/JPG images are limited to 10 MB each in the UI. Partial/error upload responses preserve existing photos. Removed previews do not delete stored files; orphan-file cleanup has no integrated backend API.

My Services uses owned ACTIVE/PAUSED records, page size 6, createdAt DESC, URL pagination and last-page correction. PAUSED edits use owned query rows rather than the ACTIVE-only public detail query. Pause/reactivate/confirmed soft-delete use UPDATE_SERVICE; no permanent-delete or restore action is added. Figma form/table styling is scoped; unsupported price modes, districts and Calls/Messages statistics are replaced by supported fields and Views/Likes/Comments. The mobile table scrolls horizontally inside the panel.

Private queries/mutations use no-cache; query deduplication is disabled per request. Account-keyed panels, ownership checks, action locks and mounted/current-account guards protect against duplicate actions and late query/mutation/upload responses. Successful saves are confirmed from returned records; a failed refresh is reported separately. Ambiguous save failures advise checking My Services before retrying.

Validation: `yarn tsc --noEmit --incremental false` and `yarn build` passed (82 generated pages). Lint was not run because no ESLint configuration exists; no setup files were created. Existing Browserslist and react-i18next build warnings remain. Isolated React/Apollo/JSDOM tests passed for validation bounds, nullable/zero price, create/edit payload allowlisting, PAUSED editing, status/confirmation payloads, pagination/last-page correction, empty Apollo cache, foreign-record filtering, USER rejection, partial multipart uploads and late/overlapping account responses. All mutations/uploads in these tests used local stub transports, not the database or filesystem uploader. Read-only browser regression checks passed for USER provider-route denial at 1440×900 and 390×844 without page overflow, populated Favorites, empty Followings, real homepage data and Listing Clear → Sort URL state. Followers/Followings current-ID filter contracts were rechecked without rewriting them.

Live AGENT management and full Figma screenshot comparison are BLOCKED because the available browser session is USER. Live create/upload/update/status tests were not run: database/file writes require separate approval. The running backend working directory is `/Users/sanjarbekkarimov/Desktop/homehero`, and `uploads/service` is missing. With separate approval, provision it as the backend runtime user using `mkdir -p /Users/sanjarbekkarimov/Desktop/homehero/uploads/service`; do not use uploads/property or grant world-write permissions. No directory was provisioned by Batch 5.

## Batch 6 — Private USER–AGENT Messaging

`/chat` now uses the existing HomeHero Header/Footer with its own scoped Figma conversation sidebar, thread, history and composer. New typed documents reuse the verified startConversation/getConversations/getMessages/sendMessage contract. No backend, dependencies, auth algorithms, Apollo configuration or legacy Chat files change. ADMIN/inactive users are excluded; guests return through login with the complete chat referrer.

Header Messages opens existing conversations. A USER entry at `/chat?agentId=<id>&serviceId=<optional-id>` shows real ACTIVE Services owned by that AGENT; without a Service context it presents the approved Service picker. Conversation creation/reuse occurs only after an explicit Start conversation action. The returned participant IDs are checked before navigation to `/chat?conversationId=<id>`. AGENT accounts reply to existing conversations but cannot initiate them. The selected Service context can be removed before sending; only USER sends may carry serviceId.

Private GraphQL operations use no-cache and disabled query deduplication. Conversation pages contain 20 records; history pages contain 30. Deep-linked metadata is resolved through the authenticated paginated list, since no getConversation-by-ID API exists. Loaded history pages reconcile offset shifts and merge by message ID while preserving scroll position. Text is trimmed/limited to 1–2000 characters and rendered as text. Drafts clear only after a verified persisted response; uncertain failures retain the draft and advise checking history before retrying. There is no automatic send retry or optimistic success.

A dedicated native socket uses the existing backend origin plus `/ws`, sends `{event:"authenticate",data:{token}}` as its first frame, verifies connection:ready.memberId, and handles message:new only after authentication. It never enters socketVar or the legacy Apollo subscription protocol. Transient reconnection uses 1/2/4/8/15-second backoff; access close 1008 stops retries and clears private state. Account/token/thread guards, storage-event remounting, action locks and effect cleanup prevent stale responses, cross-account rendering and duplicate sends. Reconnect/foreground/manual refresh reconcile persisted data.

Service Listing's listing variant now has Message and provider links with actual owner/Service IDs. Existing image/title/View details destinations and returnTo remain unchanged; Homepage/Favorites grid variants keep their previous actions and saved-state behavior. Service Detail provider links to Agent Detail with context; legacy Agent Detail receives only a Message Agent entry link. Its Property content, mobile placeholder and layout remain Batch 7 work. `category=messages` redirects to `/chat`. No Call, presence, unread counts, receipts, attachments, booking or payment controls are added. Conversation search is explicitly limited to the loaded page.

Validation and limitations: `yarn tsc --noEmit --incremental false` and `yarn build` passed (82 generated pages). Lint was not run because no ESLint configuration exists; no configuration was created. Existing Browserslist/react-i18next build warnings remain. The four GraphQL documents passed read-only validation against the running backend schema. Isolated React/Apollo/JSDOM/native-socket tests passed for payloads, no auto-create, explicit USER initiation/AGENT rejection, text limits, no-cache, deduplication, older-history pagination/reconciliation, reconnect/access denial, cleanup, account switching, failed-send draft retention, listing destinations and unchanged grid behavior. These tests use local transports and write no database records. Live AGENT checks confirmed a real empty conversation list and native Realtime connected status. Listing Message links carried the correct IDs and opened the AGENT initiation restriction without mutation.

Desktop reference/frontend screenshots were inspected at 1440×900; shell width 1180, sidebar 330, shell height 680 and heading weight 400 match the reference. Container/shadow/heading differences were corrected. Responsive captures at 390×844 had no page overflow; an additional frontend capture matched the reference preview's measured 391×845 viewport (the Figma custom-size control rounds its dimensions). The 88px mobile rail and layout were inspected. Populated thread/composer and two-account live send/delivery tests remain BLOCKED without separate database-write authorization and both authenticated sessions; empty real UI is not claimed as full populated Figma parity. Previously identified backend login logging and development/production isolation findings require rechecking before live write tests; remediation remains a separate scope.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Batch 7.1 — Find Pros

`/agent` uses the HomeHero shared layout and Figma-inspired professional cards. Public AGENT data comes from the existing `getAgents` API; minimal additive documents select no credentials or tokens. Nickname search, supported sorting and pagination preserve the existing `?input=<JSON>` route format. New searches and sorts reset pagination, while refresh and browser history restore URL state.

Each card uses the latest ACTIVE Service's first image as its cover and labels its category as “Latest service”, rather than claiming a provider specialty. Service totals come from the public Service query and Followers counts from Member data. Missing covers use a neutral background; unavailable counts are not reported as zero. No ratings, verification, Jobs Done or mock reviews are shown.

Follow/Unfollow reuses `subscribe` and `unsubscribe`. Authenticated following IDs are loaded with pagination before enabling mutations; responses must match the current account and target. Viewer state is reset on account/session changes, all queries use no-cache and request deduplication is disabled. Guest Follow opens login with the listing referrer. Cards link to `/agent/detail?agentId=<actual-id>`; that page's visual migration remains Batch 7.2. Header, messaging and legacy shared cards are unchanged.

## Batch 7.3B — Agent Reviews frontend

Agent Detail Reviews uses the existing `getAgentReviews` and `createAgentReview` backend contracts, independently of Service Comments. Real author identity/avatar, creation date, text and total are displayed with six reviews per page. `tab=reviews` restores the selected tab after login, refresh and browser navigation while retaining Agent/Service query context. Only authenticated ACTIVE USER accounts may open the inline review form; the backend remains responsible for current database authorization.

The form submits trimmed text (1–2000 characters) and agentId only. It prevents overlapping submissions, preserves the draft when creation is not confirmed and never automatically retries mutations. After a verified response, the draft is cleared and the list is refreshed to page 1; a refresh failure is reported separately from creation success. Multiple reviews per USER–AGENT pair remain allowed. Account/Agent changes discard the previous panel's private state and late responses.

Rating/stat distribution panels are explicitly labeled UI previews with neutral values, not calculated or real customer statistics. No rating input, verification badges or booking claims are introduced. Follow, Message, Services and Service Comments are unchanged. Validation uses mock transport; live review creation and screenshot parity require separate verification.
