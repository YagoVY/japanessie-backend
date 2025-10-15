// Test the catalog service directly
const { catalogService } = require('./lib/printful/catalog');

async function testCatalogService() {
  console.log('🧪 Testing catalog service directly...');
  
  try {
    // Test with legacy SKU that should map to catalog variant
    console.log('Testing legacy SKU: 17008_Black');
    const result = await catalogService.resolveCatalogVariantIdBySku('17008_Black', {
      shopifyVariantId: 17008,
      shopifyProductId: 12345,
      optionColor: 'Black',
      optionSize: 'S'
    });
    console.log('✅ Catalog service result:', result);
  } catch (error) {
    console.error('❌ Catalog service error:', error.message);
  }
}

testCatalogService();
