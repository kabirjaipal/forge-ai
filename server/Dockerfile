# Multi-stage Dockerfile for ForgeAI Backend API
FROM node:20-slim AS builder

WORKDIR /app

# 1. Install system dependencies (Cached unless base image changes)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# 2. Install npm packages (Cached unless package.json or package-lock.json changes)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 3. Copy Prisma schema & generate client (Cached unless prisma/ schema changes)
COPY prisma ./prisma/
RUN npx prisma generate

# 4. Copy TypeScript configuration & application source code
COPY tsconfig.json ./
COPY src ./src/

# 5. Compile TypeScript to dist/
RUN npx tsc

# Production Runner stage
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Install runtime system dependencies
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
