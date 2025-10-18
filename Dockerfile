# Use specific version tag and latest patch
FROM node:18.19-alpine3.19

# Install system dependencies
RUN apk add --no-cache bash

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Create app directory with proper ownership
WORKDIR /app
RUN chown -R nestjs:nodejs /app

# Copy package files with proper ownership
COPY --chown=nestjs:nodejs package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Switch to non-root user
USER nestjs

# Copy source code with proper ownership
COPY --chown=nestjs:nodejs . .

# Build application
RUN npm run build

# Expose port
EXPOSE 4000

# Use non-root user for runtime
CMD ["npm", "run", "start:prod"]