FROM node:22-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
COPY server.ts ./server.ts
COPY server ./server

RUN npm run check

RUN npm prune --omit=dev

FROM node:22-slim AS runtime

ENV NODE_ENV=production \
    PORT=4020

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./server.ts
COPY --from=build /app/server ./server
COPY package.json ./
COPY scripts ./scripts

RUN mkdir -p /app/data/uploads \
  && chown -R node:node /app/data

USER node

EXPOSE 4020

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
