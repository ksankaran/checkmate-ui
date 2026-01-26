FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY --chown=node:node . .

# Build the app
RUN npm run build

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start with entrypoint that injects runtime config
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
