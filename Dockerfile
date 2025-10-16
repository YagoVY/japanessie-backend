FROM node:20-alpine

# Install Chromium and dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# CRITICAL: Install with --ignore-scripts to skip Puppeteer's post-install
RUN npm install --production --ignore-scripts

# Copy application
COPY . .

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

EXPOSE 10000

CMD ["npm", "start"]