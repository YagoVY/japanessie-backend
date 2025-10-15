require('dotenv').config();
const axios = require('axios');

const API = axios.create({
  baseURL: 'https://api.printful.com',
  headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
  timeout: 20000,
});

async function testCatalogVariantResolution() {
  console.log('🧪 Testing catalog variant resolution...');
  
  try {
    // Test if we can get a specific catalog variant
    // Let's try some common variant IDs
    const testVariantIds = [3990245, 3990246, 3990247, 17008];
    
    for (const variantId of testVariantIds) {
      try {
        console.log(`\n🔍 Testing variant ID: ${variantId}`);
        const { data } = await API.get(`/catalog/variants/${variantId}`, {
          validateStatus: () => true,
        });
        
        if (data?.code === 200 && data?.result) {
          console.log(`✅ Found variant ${variantId}:`);
          console.log(`- Name: ${data.result.name || 'N/A'}`);
          console.log(`- Color: ${data.result.color || 'N/A'}`);
          console.log(`- Size: ${data.result.size || 'N/A'}`);
          console.log(`- SKU: ${data.result.sku || 'N/A'}`);
        } else {
          console.log(`❌ Variant ${variantId} not found or error:`, data?.code);
        }
      } catch (error) {
        console.log(`❌ Error testing variant ${variantId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

testCatalogVariantResolution();
