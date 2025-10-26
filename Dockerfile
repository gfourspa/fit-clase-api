# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache bash

# Copy package files
COPY package*.json ./

# Install ALL dependencies (needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove development dependencies after build
RUN npm prune --omit=dev

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership to nestjs user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4000

# Set environment to production
ENV NODE_ENV=production

# Start the application using the compiled JavaScript
CMD ["node", "dist/main.js"]