# Multi-stage Docker build for Bismi Chicken Shop POS Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and build TypeScript
COPY src ./src
RUN npm run build

# Production Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860

# Copy built artifacts and dependencies
COPY package*.json ./
COPY prisma ./prisma/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Hugging Face Spaces uses Port 7860
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7860/api/health || exit 1

CMD ["npm", "start"]
