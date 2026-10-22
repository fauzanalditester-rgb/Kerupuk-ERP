# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
