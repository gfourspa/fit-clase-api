# ============================================
# Stage 1: Build Stage (compiles TypeScript)
# ============================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============================================
# Stage 2: Production Stage (runtime only)
# ============================================
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache bash

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Create app directory with proper ownership
WORKDIR /app
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Copy package files
COPY --chown=nestjs:nodejs package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --chown=nestjs:nodejs --from=builder /app/dist ./dist

# Expose port
EXPOSE 4000

# Set environment to production
ENV NODE_ENV=production

# Use non-root user for runtime
CMD ["node", "dist/main"]