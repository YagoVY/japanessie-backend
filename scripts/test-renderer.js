#!/usr/bin/env node

/**
 * Test Script for Print Renderer
 * Tests the complete rendering pipeline with proper scaling and fonts
 */

const { renderFromSnapshot, generateTestPNG } = require('../lib/renderer/printRenderer');
const { ensureFontsLoaded } = require('../lib/fonts');
const fs = require('fs').promises;
const path = require('path');

async function testFontLoading() {
  console.log('🔤 Testing font loading...');
  
  try {
    await ensureFontsLoaded();
    console.log('✅ Fonts loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Font loading failed:', error.message);
    return false;
  }
}

async function testRenderer() {
  console.log('\n🎨 Testing print renderer...');
  
  try {
    // Set debug mode to generate proof files
    process.env.RENDER_PARITY_PROOF = '1';
    process.env.DEBUG_OVERLAY = '1';
    
    // Set print canvas size (example: 4500x5400 for 12x16" at 300 DPI)
    process.env.PRINT_CANVAS_W = '4500';
    process.env.PRINT_CANVAS_H = '5400';
    
    const pngBuffer = await generateTestPNG();
    
    // Save test output
    const outputDir = path.join(__dirname, '../debug-output');
    await fs.mkdir(outputDir, { recursive: true });
    
    await fs.writeFile(path.join(outputDir, 'test-render.png'), pngBuffer);
    console.log('✅ Test render completed');
    console.log(`📁 Output saved to: ${outputDir}/test-render.png`);
    
    return true;
  } catch (error) {
    console.error('❌ Render test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Print Renderer Test Suite\n');
  
  const fontsOk = await testFontLoading();
  if (!fontsOk) {
    console.log('\n❌ Font test failed. Please add the required TTF files first.');
    console.log('Run: node scripts/setup-fonts.js');
    return;
  }
  
  const renderOk = await testRenderer();
  if (renderOk) {
    console.log('\n🎉 All tests passed! Your renderer is ready.');
    console.log('\nNext steps:');
    console.log('1. Check the debug-output/ folder for proof files');
    console.log('2. Compare proof-preview.png with your frontend preview');
    console.log('3. The print.png should be properly scaled for Printful');
  } else {
    console.log('\n❌ Render test failed. Check the error messages above.');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testFontLoading, testRenderer };
