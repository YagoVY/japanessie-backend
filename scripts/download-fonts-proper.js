#!/usr/bin/env node

/**
 * Proper Font Download Script
 * Downloads TTF versions from Google Fonts API
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const FONTS_DIR = path.join(__dirname, '../assets/fonts');

// Google Fonts API URLs for TTF downloads
const FONT_DOWNLOADS = [
  {
    name: 'Yuji Syuku',
    filename: 'yuji-syuku.ttf',
    url: 'https://fonts.gstatic.com/s/yujisyuku/v1/7cHrv4kjGoGqM7E3b8s6ynSfnx9dA.ttf'
  },
  {
    name: 'Shippori Antique', 
    filename: 'shippori-antique.ttf',
    url: 'https://fonts.gstatic.com/s/shipporiantique/v1/rax-Hi7fGdPjY4V-E4yJ9xzSlOf8sjA-5s.ttf'
  },
  {
    name: 'Huninn',
    filename: 'huninn.ttf', 
    url: 'https://fonts.gstatic.com/s/huninn/v1/2h3p7iGsp2ZWoWeRzD7BTQ.ttf'
  },
  {
    name: 'Rampart One',
    filename: 'rampart-one.ttf',
    url: 'https://fonts.gstatic.com/s/rampartone/v1/KFyC_ANNEe79Dz-EhiA40uFyKzGB.ttf'
  },
  {
    name: 'Cherry Bomb One',
    filename: 'cherry-bomb-one.ttf',
    url: 'https://fonts.gstatic.com/s/cherrybombone/v1/50lIB1OPmniF4JNMg1WQ_LZJF3V3F3c.ttf'
  },
  {
    name: 'Noto Sans CJK JP',
    filename: 'NotoSansCJKjp-Regular.ttf',
    url: 'https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansCJK-Regular.otf'
  }
];

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirects
        downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
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
  console.log('🎨 Downloading TTF fonts from Google Fonts...\n');
  
  await ensureDirectoryExists(FONTS_DIR);
  
  for (const font of FONT_DOWNLOADS) {
    const filepath = path.join(FONTS_DIR, font.filename);
    
    try {
      // Check if file already exists and has content
      const stats = await fs.stat(filepath);
      if (stats.size > 0) {
        console.log(`✅ ${font.filename} already exists (${stats.size} bytes)`);
        continue;
      }
    } catch {
      // File doesn't exist, download it
    }
    
    try {
      console.log(`⬇️  Downloading ${font.name}...`);
      await downloadFile(font.url, filepath);
      
      // Verify the file was downloaded
      const stats = await fs.stat(filepath);
      if (stats.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      console.log(`✅ Downloaded ${font.filename} (${stats.size} bytes)`);
    } catch (error) {
      console.error(`❌ Failed to download ${font.filename}:`, error.message);
      
      // Try alternative approach for some fonts
      if (font.name === 'Noto Sans CJK JP') {
        console.log(`🔄 Trying alternative Noto Sans download...`);
        try {
          const altUrl = 'https://github.com/googlefonts/noto-cjk/raw/main/Sans/TTF/Japanese/NotoSansCJK-Regular.ttf';
          await downloadFile(altUrl, filepath);
          const stats = await fs.stat(filepath);
          if (stats.size > 0) {
            console.log(`✅ Downloaded ${font.filename} (alternative, ${stats.size} bytes)`);
          } else {
            throw new Error('Alternative download also empty');
          }
        } catch (altError) {
          console.error(`❌ Alternative download also failed for ${font.filename}`);
        }
      }
    }
  }
  
  console.log('\n🎉 Font download process completed!');
  console.log('\nVerifying font files...');
  
  // Verify all fonts
  for (const font of FONT_DOWNLOADS) {
    const filepath = path.join(FONTS_DIR, font.filename);
    try {
      const stats = await fs.stat(filepath);
      if (stats.size > 0) {
        console.log(`✅ ${font.filename}: ${stats.size} bytes`);
      } else {
        console.log(`❌ ${font.filename}: Empty file`);
      }
    } catch {
      console.log(`❌ ${font.filename}: Missing`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  downloadFonts().catch(console.error);
}

module.exports = { downloadFonts };
