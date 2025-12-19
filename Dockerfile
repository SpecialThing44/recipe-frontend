# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json ./
COPY yarn.lock ./

# Install dependencies
RUN corepack enable && yarn install --frozen-lockfile

# Copy source files
COPY . .

# Build the application for production
RUN yarn build

# Production stage
FROM nginx:alpine

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from build stage
COPY --from=build /app/dist/recipe-frontend/browser /usr/share/nginx/html

# Copy environment template
COPY src/env.template.js /usr/share/nginx/html/env.template.js

# Copy and make entrypoint script executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Set default environment variables
ENV AUTH_AUTHORITY=https://auth.spencers.cc/application/o/cooking-app-dev/
ENV AUTH_WELLKNOWN_ENDPOINT=https://auth.spencers.cc/application/o/cooking-app-dev/.well-known/openid-configuration
ENV API_BASE_URL=http://localhost:9000
ENV AUTH_CLIENT_ID=CrlaWqtWtKXSt8vYM6o9caiVGaLx2FxegYbOohOe

# Expose port 80
EXPOSE 80

# Use custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
