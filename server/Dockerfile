# Multi-stage Dockerfile for ForgeAI Backend API
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package descriptors & prisma schema
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps

# Copy source code
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma client & compile TypeScript
RUN npx prisma generate
RUN npm run build

# Production Runner stage
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Install OpenSSL for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
