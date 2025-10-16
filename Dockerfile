FROM node:20-alpine

# Install build dependencies for Sharp (but not Chromium)
RUN apk add --no-cache \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++ \
    vips-dev

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (Puppeteer will download its own Chrome)
RUN npm install --production

# Copy application
COPY . .

# Runtime environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer

EXPOSE 3000

CMD ["npm", "start"]