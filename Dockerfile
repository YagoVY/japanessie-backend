FROM node:20-alpine

# Install system dependencies including Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

# Copy package.json
COPY package.json ./

# Create .npmrc to skip Puppeteer download during ALL installs
RUN echo "puppeteer_skip_chromium_download=true" > ~/.npmrc && \
    echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> ~/.npmrc

# Install dependencies with environment variable set
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install --production --loglevel verbose

# Copy application files
COPY . .

# Runtime environment
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

EXPOSE 10000

CMD ["npm", "start"]