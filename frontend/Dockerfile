FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port 3000 (React dev server default)
EXPOSE 3000

# Start the development server
CMD ["npm", "start"]
