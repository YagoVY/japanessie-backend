#!/usr/bin/env node

/**
 * Font Setup Guide Script
 * Helps you set up the required TTF fonts for the project
 */

const fs = require('fs').promises;
const path = require('path');

const FONTS_DIR = path.join(__dirname, '../assets/fonts');

const REQUIRED_FONTS = [
  {
    name: 'Yuji Syuku',
    filename: 'yuji-syuku.ttf',
    downloadUrl: 'https://fonts.google.com/specimen/Yuji+Syuku',
    description: 'Japanese calligraphy-style font'
  },
  {
    name: 'Shippori Antique',
    filename: 'shippori-antique.ttf', 
    downloadUrl: 'https://fonts.google.com/specimen/Shippori+Antique',
    description: 'Japanese antique-style font'
  },
  {
    name: 'Huninn',
    filename: 'huninn.ttf',
    downloadUrl: 'https://fonts.google.com/specimen/Huninn',
    description: 'Japanese handwriting-style font'
  },
  {
    name: 'Rampart One',
    filename: 'rampart-one.ttf',
    downloadUrl: 'https://fonts.google.com/specimen/Rampart+One',
    description: 'Japanese display font'
  },
  {
    name: 'Cherry Bomb One',
    filename: 'cherry-bomb-one.ttf',
    downloadUrl: 'https://fonts.google.com/specimen/Cherry+Bomb+One',
    description: 'Japanese playful font'
  },
  {
    name: 'Noto Sans CJK JP',
    filename: 'NotoSansCJKjp-Regular.ttf',
    downloadUrl: 'https://fonts.google.com/noto/specimen/Noto+Sans+JP',
    description: 'Japanese system font fallback'
  }
];

async function checkFonts() {
  console.log('🔍 Checking font files...\n');
  
  let allPresent = true;
  
  for (const font of REQUIRED_FONTS) {
    const filepath = path.join(FONTS_DIR, font.filename);
    
    try {
      const stats = await fs.stat(filepath);
      if (stats.size > 0) {
        console.log(`✅ ${font.filename} - ${(stats.size / 1024).toFixed(1)} KB`);
      } else {
        console.log(`❌ ${font.filename} - Empty file`);
        allPresent = false;
      }
    } catch {
      console.log(`❌ ${font.filename} - Missing`);
      allPresent = false;
    }
  }
  
  if (allPresent) {
    console.log('\n🎉 All fonts are present and ready!');
    console.log('You can now test the font loading:');
    console.log('  node -e "require(\'./lib/fonts\').testFontRendering()"');
    return true;
  } else {
    console.log('\n📋 Missing fonts detected. Here\'s how to add them:\n');
    
    for (const font of REQUIRED_FONTS) {
      const filepath = path.join(FONTS_DIR, font.filename);
      
      try {
        const stats = await fs.stat(filepath);
        if (stats.size === 0) {
          console.log(`❌ ${font.name} (${font.filename})`);
          console.log(`   Description: ${font.description}`);
          console.log(`   Download: ${font.downloadUrl}`);
          console.log(`   Save as: ${filepath}\n`);
        }
      } catch {
        console.log(`❌ ${font.name} (${font.filename})`);
        console.log(`   Description: ${font.description}`);
        console.log(`   Download: ${font.downloadUrl}`);
        console.log(`   Save as: ${filepath}\n`);
      }
    }
    
    console.log('📝 Instructions:');
    console.log('1. Visit each Google Fonts link above');
    console.log('2. Click "Download family" button');
    console.log('3. Extract the TTF file from the ZIP');
    console.log('4. Rename it to match the filename shown above');
    console.log('5. Place it in the assets/fonts/ directory');
    console.log('6. Run this script again to verify');
    
    return false;
  }
}

async function createFontDirectory() {
  try {
    await fs.mkdir(FONTS_DIR, { recursive: true });
    console.log(`📁 Created fonts directory: ${FONTS_DIR}`);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function main() {
  console.log('🎨 Font Setup Guide for Japanessie v2\n');
  
  await createFontDirectory();
  const allPresent = await checkFonts();
  
  if (!allPresent) {
    console.log('\n🔄 After adding the fonts, run this script again to verify.');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkFonts, REQUIRED_FONTS };
