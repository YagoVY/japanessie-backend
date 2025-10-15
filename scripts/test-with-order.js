#!/usr/bin/env node

/**
 * Test Renderer with Actual Order Data
 * Tests the renderer with real order data to ensure it works in production
 */

const { renderFromSnapshot } = require('../lib/renderer/printRenderer');
const { ensureFontsLoaded } = require('../lib/fonts');
const fs = require('fs').promises;
const path = require('path');

// Example order data structure (replace with your actual order data)
const createTestOrderSnapshot = () => {
  return {
    version: 2,
    printArea: { 
      widthIn: 12, 
      heightIn: 16, 
      dpi: 300 
    },
    origin: 'top-left',
    canvasPx: { w: 1200, h: 1600 }, // FE canvas size
    layers: [
      {
        type: 'text',
        font: {
          family: 'Yuji Syuku',
          sizePx: 72, // Large text for visibility
          weight: '400',
          lineHeight: 1.1,
          letterSpacingEm: 0.05,
          vertical: false,
          textOrientation: 'upright',
          hyphenPolicy: 'jp-long-vbar'
        },
        color: '#000000',
        align: { h: 'center', v: 'top' },
        textBlocks: [
          {
            text: 'テストテキスト',
            xPx: 600, // Center horizontally
            yPx: 400, // Upper portion
            anchor: 'center-baseline'
          }
        ]
      },
      {
        type: 'text',
        font: {
          family: 'Shippori Antique',
          sizePx: 48,
          weight: '400',
          lineHeight: 1.2,
          letterSpacingEm: 0.1,
          vertical: false,
          textOrientation: 'upright',
          hyphenPolicy: 'jp-long-vbar'
        },
        color: '#333333',
        align: { h: 'center', v: 'top' },
        textBlocks: [
          {
            text: '日本語のテキスト',
            xPx: 600, // Center horizontally
            yPx: 500, // Below first text
            anchor: 'center-baseline'
          }
        ]
      },
      {
        type: 'text',
        font: {
          family: 'Huninn',
          sizePx: 36,
          weight: '400',
          lineHeight: 1.3,
          letterSpacingEm: 0.15,
          vertical: false,
          textOrientation: 'upright',
          hyphenPolicy: 'jp-long-vbar'
        },
        color: '#666666',
        align: { h: 'center', v: 'top' },
        textBlocks: [
          {
            text: '手書き風フォント',
            xPx: 600, // Center horizontally
            yPx: 600, // Below second text
            anchor: 'center-baseline'
          }
        ]
      }
    ],
    meta: {
      canvas: { width: 1200, height: 1600 }, // FE canvas dimensions
      baseFontSizeRequested: 48,
      orientation: 'horizontal',
      orderId: 'test-order-123',
      timestamp: new Date().toISOString()
    }
  };
};

async function testWithOrderData() {
  console.log('🧪 Testing renderer with order data...\n');
  
  try {
    // Ensure fonts are loaded
    await ensureFontsLoaded();
    console.log('✅ Fonts loaded');
    
    // Set debug mode
    process.env.RENDER_PARITY_PROOF = '1';
    process.env.DEBUG_OVERLAY = '1';
    
    // Set print canvas size (example: 4500x5400 for 12x16" at 300 DPI)
    process.env.PRINT_CANVAS_W = '4500';
    process.env.PRINT_CANVAS_H = '5400';
    
    // Create test order snapshot
    const orderSnapshot = createTestOrderSnapshot();
    console.log('📋 Created test order snapshot with 3 text layers');
    
    // Render the order
    console.log('🎨 Rendering order...');
    const pngBuffer = await renderFromSnapshot(orderSnapshot);
    
    // Save output
    const outputDir = path.join(__dirname, '../debug-output');
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `order-test-${timestamp}.png`;
    const filepath = path.join(outputDir, filename);
    
    await fs.writeFile(filepath, pngBuffer);
    
    console.log('✅ Order render completed');
    console.log(`📁 Output saved to: ${filepath}`);
    console.log(`📊 File size: ${(pngBuffer.length / 1024).toFixed(1)} KB`);
    
    // Check if file has content
    if (pngBuffer.length < 1000) {
      console.log('⚠️  Warning: PNG file is very small, may be empty or corrupted');
    } else {
      console.log('✅ PNG file has substantial content');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Order render test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

async function main() {
  console.log('🧪 Order Data Render Test\n');
  
  const success = await testWithOrderData();
  
  if (success) {
    console.log('\n🎉 Order render test passed!');
    console.log('\nNext steps:');
    console.log('1. Check the debug-output/ folder for the generated files');
    console.log('2. Open the PNG files to verify text is visible');
    console.log('3. If text is visible, your renderer is working correctly');
    console.log('4. If text is still invisible, check the debug overlay file');
  } else {
    console.log('\n❌ Order render test failed.');
    console.log('Check the error messages above for debugging information.');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWithOrderData, createTestOrderSnapshot };
