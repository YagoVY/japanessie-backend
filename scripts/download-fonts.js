#!/usr/bin/env node

/**
 * Font Download Script
 * Downloads TTF versions of required fonts for node-canvas compatibility
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { createWriteStream } = require('fs');

const FONTS_DIR = path.join(__dirname, '../assets/fonts');

// Google Fonts TTF URLs (these are direct download links)
const FONT_URLS = {
  'yuji-syuku.ttf': 'https://fonts.gstatic.com/s/yujisyuku/v1/7cHrv4kjGoGqM7E3b8s6ynSfnx9dA.woff2',
  'shippori-antique.ttf': 'https://fonts.gstatic.com/s/shipporiantique/v1/rax-Hi7fGdPjY4V-E4yJ9xzSlOf8sjA-5s.woff2',
  'huninn.ttf': 'https://fonts.gstatic.com/s/huninn/v1/2h3p7iGsp2ZWoWeRzD7BTQ.woff2',
  'rampart-one.ttf': 'https://fonts.gstatic.com/s/rampartone/v1/KFyC_ANNEe79Dz-EhiA40uFyKzGB.woff2',
  'cherry-bomb-one.ttf': 'https://fonts.gstatic.com/s/cherrybombone/v1/50lIB1OPmniF4JNMg1WQ_LZJF3V3F3c.woff2',
  'NotoSansCJKjp-Regular.ttf': 'https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansCJK-Regular.otf'
};

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath).catch(() => {}); // Delete partial file
        reject(err);
      });
    }).on('error', reject);
  });
}

async function ensureDirectoryExists(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

async function downloadFonts() {
  console.log('🎨 Downloading TTF fonts for node-canvas compatibility...\n');
  
  await ensureDirectoryExists(FONTS_DIR);
  
  const downloads = Object.entries(FONT_URLS).map(async ([filename, url]) => {
    const filepath = path.join(FONTS_DIR, filename);
    
    try {
      // Check if file already exists
      await fs.access(filepath);
      console.log(`✅ ${filename} already exists`);
      return;
    } catch {
      // File doesn't exist, download it
    }
    
    try {
      console.log(`⬇️  Downloading ${filename}...`);
      await downloadFile(url, filepath);
      console.log(`✅ Downloaded ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to download ${filename}:`, error.message);
      
      // For Google Fonts, try alternative approach
      if (filename !== 'NotoSansCJKjp-Regular.ttf') {
        console.log(`🔄 Trying alternative download for ${filename}...`);
        try {
          // Use a different approach for Google Fonts
          const altUrl = url.replace('.woff2', '.ttf');
          await downloadFile(altUrl, filepath);
          console.log(`✅ Downloaded ${filename} (alternative)`);
        } catch (altError) {
          console.error(`❌ Alternative download also failed for ${filename}`);
        }
      }
    }
  });
  
  await Promise.all(downloads);
  
  console.log('\n🎉 Font download process completed!');
  console.log('\nNext steps:');
  console.log('1. Verify all TTF files are in assets/fonts/');
  console.log('2. Run the font test: node -e "require(\'./lib/fonts\').testFontRendering()"');
  console.log('3. Test the print renderer with proper fonts');
}

// Run if called directly
if (require.main === module) {
  downloadFonts().catch(console.error);
}

module.exports = { downloadFonts, FONT_URLS };
