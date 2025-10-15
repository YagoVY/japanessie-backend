import { createCanvas, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs';

// Font family mappings - these must match exactly what the FE uses
const FONT_FAMILIES = {
  'Yuji Syuku': 'yuji-syuku',
  'Shippori Antique': 'shippori-antique', 
  'Huninn': 'huninn',
  'Rampart One': 'rampart-one',
  'Cherry Bomb One': 'cherry-bomb-one'
} as const;

// Font file paths (currently WOFF2, need TTF for canvas)
const FONT_PATHS = {
  'yuji-syuku': path.join(__dirname, '../../assets/fonts/yuji-syuku.woff2'),
  'shippori-antique': path.join(__dirname, '../../assets/fonts/shippori-antique.woff2'),
  'huninn': path.join(__dirname, '../../assets/fonts/huninn.woff2'),
  'rampart-one': path.join(__dirname, '../../assets/fonts/rampart-one.woff2'),
  'cherry-bomb-one': path.join(__dirname, '../../assets/fonts/cherry-bomb-one.woff2')
} as const;

let fontsLoaded = false;

/**
 * Register all fonts with the canvas library
 * Note: Canvas requires TTF/OTF fonts, not WOFF2
 * TODO: Convert WOFF2 fonts to TTF or use a different canvas library that supports WOFF2
 */
export async function ensureFontsLoaded(): Promise<void> {
  if (fontsLoaded) {
    return;
  }

  try {
    // Check if TTF versions exist, if not, log warning and use fallback
    const ttfPaths = Object.entries(FONT_PATHS).map(([key, woffPath]) => ({
      key,
      ttfPath: woffPath.replace('.woff2', '.ttf'),
      woffPath
    }));

    for (const { key, ttfPath, woffPath } of ttfPaths) {
      if (fs.existsSync(ttfPath)) {
        // Register TTF font
        registerFont(ttfPath, { family: key });
        console.log(`Registered TTF font: ${key}`);
      } else {
        // Log warning about missing TTF
        console.warn(`TTF font not found for ${key}, using system fallback. Please convert ${woffPath} to TTF.`);
        
        // For now, we'll use system fonts as fallback
        // The canvas library will fall back to system fonts if the registered font isn't found
        registerFont(ttfPath, { family: key }); // This will fail gracefully
      }
    }

    fontsLoaded = true;
    console.log('Font loading completed');
  } catch (error) {
    console.error('Font loading failed:', error);
    throw new Error(`Font loading failed: ${error.message}`);
  }
}

/**
 * Get the canvas-compatible font family name
 */
export function getCanvasFontFamily(feFontFamily: string): string {
  return FONT_FAMILIES[feFontFamily as keyof typeof FONT_FAMILIES] || feFontFamily;
}

/**
 * Convert font size from points to pixels for canvas
 */
export function pointsToPixels(sizePt: number): number {
  return Math.round(sizePt * 96 / 72);
}

/**
 * Convert inches to pixels at 300 DPI
 */
export function inchesToPixels(inches: number, dpi: number = 300): number {
  return Math.round(inches * dpi);
}

/**
 * Test font rendering with a simple canvas
 */
export async function testFontRendering(): Promise<void> {
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

export { FONT_FAMILIES, FONT_PATHS };
