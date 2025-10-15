// Test script to verify catalog dump functionality
require('dotenv').config();

async function testCatalogDump() {
  console.log('🧪 Testing catalog dump functionality...');
  
  // Check if API key is set
  if (!process.env.PRINTFUL_API_KEY) {
    console.error('❌ PRINTFUL_API_KEY not set. Please set it in your .env file.');
    console.log('💡 You can set it temporarily with: $env:PRINTFUL_API_KEY="your_key_here"');
    return;
  }
  
  console.log('✅ PRINTFUL_API_KEY is set');
  
  // Check if search term is set
  const search = process.env.CATALOG_SEARCH || '';
  console.log(`📋 Catalog search term: "${search || 'all products'}"`);
  
  try {
    console.log('🚀 Running catalog dump...');
    const { spawn } = require('child_process');
    
    const child = spawn('node', ['scripts/dump-catalog.js'], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Catalog dump completed successfully!');
        console.log('📁 Check data/printful-catalog.json for the results');
      } else {
        console.error(`❌ Catalog dump failed with exit code ${code}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to run catalog dump:', error.message);
  }
}

testCatalogDump();
