FROM node:20-alpine

# Install dependencies
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

# Copy .npmrc FIRST (before package.json)
COPY .npmrc ./

# Copy package files
COPY package.json package-lock.json* ./

# npm will read .npmrc and skip Puppeteer download
RUN npm install --production

# Copy application
COPY . .

# Runtime environment
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

EXPOSE 10000

CMD ["npm", "start"]