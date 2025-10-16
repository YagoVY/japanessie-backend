FROM node:20-alpine

# Install build dependencies for Sharp + Chromium
RUN apk add --no-cache \
    chromium \
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

# Install dependencies WITH scripts (for Sharp), but tell Puppeteer to skip download
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    npm install --production

# Copy application
COPY . .

# Set Puppeteer environment
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

EXPOSE 10000

CMD ["npm", "start"]