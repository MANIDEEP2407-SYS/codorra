FROM node:18-slim

# Install system dependencies needed for compiling better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package configuration
COPY package*.json ./

# Install dependencies (including building better-sqlite3)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Expose port (configured via environment, default 3001)
EXPOSE 3001

CMD ["npm", "start"]
