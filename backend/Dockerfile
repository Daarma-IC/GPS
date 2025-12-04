# Backend Dockerfile for GPS Fall Detection System
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose ports
# 3001 for HTTP API
# 8080 for WebSocket
EXPOSE 3001 8080

# Start the server
CMD ["node", "server.js"]
