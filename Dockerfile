# syntax=docker/dockerfile:1

# 1. Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Cache npm dependencies with BuildKit
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

COPY . .
RUN npm run build

# 2. Production Stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install only production dependencies
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --no-audit --ignore-scripts

# Copy prebuilt artifacts from builder
COPY --from=builder /app/dist ./dist
COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
