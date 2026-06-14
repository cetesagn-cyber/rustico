# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init python3 make g++

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/shared/database ./dist/shared/database

# Expose port
EXPOSE 3001

# Use dumb-init as entrypoint
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "start"]
