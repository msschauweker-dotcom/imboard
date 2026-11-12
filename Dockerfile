# OFFGRID game server (multiplayer + leaderboards). Works on Fly.io, Railway, any Docker host.
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY tsconfig.json ./
COPY server ./server
COPY src ./src
ENV PORT=3001
EXPOSE 3001
CMD ["npx", "tsx", "server/index.ts"]
