# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY . .

# Accept build-time env vars (Next.js inlines NEXT_PUBLIC_* at build time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN pnpm build

# Expose port
EXPOSE 3847

# Start the application (port is set in package.json start script)
CMD ["pnpm", "start"]
