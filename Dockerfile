# Use Debian (glibc) so Puppeteer's bundled Chromium works
FROM node:20-bookworm-slim

# System libs Chrome needs + CJK fonts for Japanese rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libx11-6 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 \
    libxkbcommon0 libxfixes3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libgbm1 libasound2 libpangocairo-1.0-0 libpango-1.0-0 \
    libcairo2 libatspi2.0-0 libgtk-3-0 libxshmfence1 fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./

# Let Puppeteer download its matched Chromium (no postinstall hacks)
ENV PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

RUN npm ci --omit=dev

COPY . .
EXPOSE 3000
CMD ["node","server.js"]