FROM node:20-alpine

# Install build dependencies for Sharp + headless Chrome libraries
RUN apk add --no-cache \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++ \
    vips-dev \
    libnss3 \
    libx11 \
    libxcomposite \
    libxdamage \
    libxrandr \
    libxkbcommon \
    libxfixes \
    libatk \
    libatk-bridge \
    libcups \
    libdrm \
    libgbm \
    alsa-lib \
    pango \
    cairo \
    at-spi2-atk \
    gtk+3.0 \
    libxshmfence \
    font-noto-cjk

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (Puppeteer will download its own Chrome)
RUN npm ci --omit=dev

# Copy application
COPY . .

# Runtime environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer

EXPOSE 3000

CMD ["npm", "start"]