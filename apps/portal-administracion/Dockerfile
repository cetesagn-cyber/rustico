# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build with Vite
RUN npm run build

# Production stage - use nginx for serving SPA
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Copy built app from builder
COPY --from=builder /app/dist .

# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
