FROM node:20-alpine AS base
WORKDIR /app

# Copy root workspace files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all dependencies from root
RUN npm install

# 1. Build Client
FROM base AS client-builder
COPY client/ ./client/
RUN npm run build --workspace=client

# 2. Build Server
FROM base AS server-builder
COPY server/ ./server/
RUN npm run build --workspace=server

# 3. Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Only need production dependencies for the server
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install --omit=dev --workspace=server

# Copy built files
COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./public

# Use the PORT env var
ENV PORT=3000
EXPOSE ${PORT}

CMD ["node", "dist/index.js"]
