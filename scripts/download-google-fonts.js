#!/usr/bin/env node

/**
 * Download Google Fonts as TTF files
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '../assets/fonts');

// Google Fonts direct download URLs (TTF format)
const FONT_DOWNLOADS = {
  'yuji-syuku.ttf': 'https://github.com/google/fonts/raw/main/ofl/yujisyuku/YujiSyuku-Regular.ttf',
  'shippori-antique.ttf': 'https://github.com/google/fonts/raw/main/ofl/shipporiantique/ShipporiAntique-Regular.ttf',
  'huninn.ttf': 'https://github.com/google/fonts/raw/main/ofl/huninn/Huninn-Regular.ttf',
  'rampart-one.ttf': 'https://github.com/google/fonts/raw/main/ofl/rampartone/RampartOne-Regular.ttf',
  'cherry-bomb-one.ttf': 'https://github.com/google/fonts/raw/main/ofl/cherrybombone/CherryBombOne-Regular.ttf',
  'NotoSansCJKjp-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/notosansjapanese/NotoSansJP-Regular.ttf'
};

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
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
        fs.unlink(filepath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', reject);
  });
}

async function downloadFonts() {
  console.log('🎨 Downloading Google Fonts TTF files...\n');
  
  // Ensure directory exists
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
  }
  
  for (const [filename, url] of Object.entries(FONT_DOWNLOADS)) {
    const filepath = path.join(FONTS_DIR, filename);
    
    try {
      // Check if file already exists and has content
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        if (stats.size > 0) {
          console.log(`✅ ${filename} already exists (${(stats.size / 1024).toFixed(1)} KB)`);
          continue;
        }
      }
      
      console.log(`⬇️  Downloading ${filename}...`);
      await downloadFile(url, filepath);
      
      // Verify download
      const stats = fs.statSync(filepath);
      if (stats.size > 0) {
        console.log(`✅ Downloaded ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
      } else {
        console.log(`❌ ${filename} is empty after download`);
      }
    } catch (error) {
      console.error(`❌ Failed to download ${filename}:`, error.message);
    }
  }
  
  console.log('\n🎉 Font download completed!');
}

// Run if called directly
if (require.main === module) {
  downloadFonts().catch(console.error);
}

module.exports = { downloadFonts };
