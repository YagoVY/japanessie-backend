// services/puppeteer.js
console.log('[BOOT] puppeteer service loaded');

const puppeteer = require('puppeteer');

let browserSingleton = null;

async function getBrowser() {
  if (browserSingleton && browserSingleton.process() && !browserSingleton.process().killed) {
    return browserSingleton;
  }
  browserSingleton = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--disable-features=IsolateOrigins,site-per-process',
      '--js-flags=--max_old_space_size=128'
    ]
  });
  return browserSingleton;
}

module.exports = { getBrowser };
