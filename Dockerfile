# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

FROM base AS dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG REACT_APP_API_URL
ARG REACT_APP_API_GRAPHQL_URL
ARG REACT_APP_API_WS
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_API_GRAPHQL_URL=$REACT_APP_API_GRAPHQL_URL \
    REACT_APP_API_WS=$REACT_APP_API_WS
# These are public browser endpoints, never credentials or Docker service names.
RUN node <<'NODE'
const origin = process.env.REACT_APP_API_URL;
const api = new URL(origin);
const ws = new URL(process.env.REACT_APP_API_WS);
if (!['http:', 'https:'].includes(api.protocol) || origin !== api.origin
    || process.env.REACT_APP_API_GRAPHQL_URL !== `${origin}/graphql`
    || ws.protocol !== (api.protocol === 'https:' ? 'wss:' : 'ws:')
    || ws.host !== api.host || ws.pathname !== '/ws'
    || ws.username || ws.password || ws.search || ws.hash) {
    throw new Error('Provide a public origin and matching GraphQL/WebSocket URLs.');
}
NODE
RUN yarn build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package.json /app/yarn.lock ./
COPY --from=build --chown=node:node /app/next.config.js /app/next-i18next.config.js ./
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next ./.next
# Retain the locked dependency tree for the existing next start architecture.
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["yarn", "start", "-H", "0.0.0.0", "-p", "3000"]
