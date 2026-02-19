# Frontend Dockerfile
FROM mcr.microsoft.com/mirror/docker/library/node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY . .

# Build-time environment variables for Next.js public vars
ARG NEXT_PUBLIC_API_URL=http://localhost:8172
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8172
ARG NEXT_PUBLIC_APP_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV

# Build the application
RUN pnpm build

# Expose port
EXPOSE 3847

# Start the application
CMD ["pnpm", "start"]
