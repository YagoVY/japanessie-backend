require('dotenv').config();
const { printfulClient } = require('./lib/printful/client');

async function debugClientResponse() {
  console.log('🔍 Debugging client response structure...');
  
  try {
    const result = await printfulClient.get('/sync/products/392071038');
    console.log('Client result structure:', {
      type: typeof result,
      keys: Object.keys(result || {}),
      hasVariants: !!result?.variants,
      variantsType: typeof result?.variants,
      variantsLength: Array.isArray(result?.variants) ? result.variants.length : 'N/A'
    });
    
    if (result?.variants && Array.isArray(result.variants)) {
      console.log('First variant:', {
        id: result.variants[0]?.id,
        sku: result.variants[0]?.sku,
        name: result.variants[0]?.name
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugClientResponse();
