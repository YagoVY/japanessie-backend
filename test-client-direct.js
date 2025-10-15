require('dotenv').config();
const { printfulClient } = require('./lib/printful/client');

async function testClientDirect() {
  console.log('🔍 Testing client directly...');
  
  try {
    console.log('Testing /sync/products endpoint...');
    const result = await printfulClient.get('/sync/products');
    console.log('Client result:', {
      type: typeof result,
      isArray: Array.isArray(result),
      length: Array.isArray(result) ? result.length : 'N/A'
    });
    
    if (Array.isArray(result) && result.length > 0) {
      console.log('First item:', {
        id: result[0].id,
        name: result[0].name,
        variants: result[0].variants
      });
    }
    
  } catch (error) {
    console.error('❌ Client test failed:', error.message);
  }
}

testClientDirect();
