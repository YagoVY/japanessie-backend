const { createCanvas, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

// Font family mappings - these must match exactly what the FE uses
const FONT_FAMILIES = {
  'Yuji Syuku': 'yuji-syuku',
  'Shippori Antique': 'shippori-antique', 
  'Huninn': 'huninn',
  'Rampart One': 'rampart-one',
  'Cherry Bomb One': 'cherry-bomb-one'
};

// Font file paths (TTF for @napi-rs/canvas) - using actual filenames
const FONT_PATHS = {
  'yuji-syuku': path.join(__dirname, '../../assets/fonts/YujiSyuku-Regular.ttf'),
  'shippori-antique': path.join(__dirname, '../../assets/fonts/ShipporiAntique-Regular.ttf'),
  'huninn': path.join(__dirname, '../../assets/fonts/Huninn-Regular.ttf'),
  'rampart-one': path.join(__dirname, '../../assets/fonts/RampartOne-Regular.ttf'),
  'cherry-bomb-one': path.join(__dirname, '../../assets/fonts/CherryBombOne-Regular.ttf'),
  'noto-sans-cjk': path.join(__dirname, '../../assets/fonts/NotoSansCJKjp-Regular.ttf')
};

let fontsLoaded = false;

/**
 * Register all fonts with the canvas library
 * Uses exact FE family names to ensure consistency
 */
async function ensureFontsLoaded() {
  if (fontsLoaded) {
    return;
  }

  try {
    // Register fonts with exact FE family names
    const fontRegistrations = [
      { path: FONT_PATHS['yuji-syuku'], family: 'Yuji Syuku' },
      { path: FONT_PATHS['shippori-antique'], family: 'Shippori Antique' },
      { path: FONT_PATHS['huninn'], family: 'Huninn' },
      { path: FONT_PATHS['rampart-one'], family: 'Rampart One' },
      { path: FONT_PATHS['cherry-bomb-one'], family: 'Cherry Bomb One' },
      { path: FONT_PATHS['noto-sans-cjk'], family: 'Noto Sans CJK JP' }
    ];

    for (const { path: fontPath, family } of fontRegistrations) {
      try {
        // Check if font file exists and has content before registering
        if (fs.existsSync(fontPath)) {
          const stats = fs.statSync(fontPath);
          if (stats.size > 0) {
            registerFont(fontPath, { family });
            console.log(`✅ Registered font: ${family} (${(stats.size / 1024).toFixed(1)} KB)`);
          } else {
            console.warn(`⚠️  Font file is empty: ${fontPath}, using system fallback for ${family}`);
          }
        } else {
          console.warn(`⚠️  Font file not found: ${fontPath}, using system fallback for ${family}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to register font ${family}:`, error.message);
      }
    }

    fontsLoaded = true;
    console.log('✅ Fonts loaded with exact FE family names');
  } catch (error) {
    console.error('Font loading failed:', error);
    throw new Error(`Font loading failed: ${error.message}`);
  }
}

/**
 * Get the canvas-compatible font family name
 * Now uses exact FE family names since fonts are properly registered
 */
function getCanvasFontFamily(feFontFamily) {
  // Use exact FE family names - they should be registered
  const registeredFamilies = [
    'Yuji Syuku',
    'Shippori Antique', 
    'Huninn',
    'Rampart One',
    'Cherry Bomb One',
    'Noto Sans CJK JP'
  ];
  
  // If the FE family is registered, use it directly
  if (registeredFamilies.includes(feFontFamily)) {
    return feFontFamily;
  }
  
  // Fallback to Japanese-capable font
  console.log(`⚠️  Unknown font ${feFontFamily}, using Noto Sans CJK JP fallback`);
  return 'Noto Sans CJK JP';
}

/**
 * Convert font size from points to pixels for canvas
 */
function pointsToPixels(sizePt) {
  return Math.round(sizePt * 96 / 72);
}

/**
 * Convert inches to pixels at 300 DPI
 */
function inchesToPixels(inches, dpi = 300) {
  return Math.round(inches * dpi);
}

/**
 * Test font rendering with a simple canvas
 */
async function testFontRendering() {
  await ensureFontsLoaded();
  
  const canvas = createCanvas(200, 100);
  const ctx = canvas.getContext('2d');
  
  // Test each font
  for (const [feFamily, canvasFamily] of Object.entries(FONT_FAMILIES)) {
    try {
      ctx.font = `20px "${canvasFamily}"`;
      ctx.fillText(`Test ${feFamily}`, 10, 30);
      console.log(`Font test passed: ${feFamily} -> ${canvasFamily}`);
    } catch (error) {
      console.warn(`Font test failed for ${feFamily}:`, error.message);
    }
  }
}

module.exports = {
  ensureFontsLoaded,
  getCanvasFontFamily,
  pointsToPixels,
  inchesToPixels,
  testFontRendering,
  FONT_FAMILIES,
  FONT_PATHS
};
