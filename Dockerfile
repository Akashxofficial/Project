# Development Dockerfile for TaniOS Platform
FROM node:20-alpine

WORKDIR /app

# Copy dependency catalogs
COPY package*.json ./

# Install standard dependencies
RUN npm install

# Copy application resources
COPY . .

# Expose Vite dev port (5173) and local proxy backend port (3001)
EXPOSE 5173 3001

# Concurrently run local dev serverless backend proxy and hot-reloading React client
CMD ["npm", "run", "dev:all"]
