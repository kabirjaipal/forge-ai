# Multi-stage Dockerfile for ForgeAI Backend API
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma client & compile TypeScript
RUN npx prisma generate
RUN npm run build

# Production Runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["node", "dist/index.js"]
