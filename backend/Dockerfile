# ==========================================
# SchoolSync Backend Production Container
# ==========================================
FROM node:20-alpine

# Install system utilities needed for health checks
RUN apk add --no-cache curl wget

WORKDIR /app

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=5000

# Copy package manifests
COPY package.json package-lock.json* ./

# Install all required production dependencies
RUN npm ci || npm install

# Copy source code and configuration
COPY tsconfig.json ./
COPY src ./src

# Create uploads directory and set permissions for node user
RUN mkdir -p /app/uploads/avatars && chown -R node:node /app

# Switch to non-root user for container security
USER node

# Expose backend HTTP port
EXPOSE 5000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

# Start production server
CMD ["npm", "start"]
