# syntax=docker/dockerfile:1
FROM node:20-slim

# Install deps
WORKDIR /usr/src/app
COPY api/package*.json ./
RUN npm ci --only=production

# Copy source
COPY api/ ./

# Expose and start
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server.js"]
