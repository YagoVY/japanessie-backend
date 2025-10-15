require('dotenv').config();
const { syncService } = require('./lib/printful/sync');

async function testSyncServiceReal() {
  console.log('🧪 Testing sync service with real SKU...');
  
  try {
    // Test with a real SKU from your sync products
    const testSku = '3990245_473'; // White / S from the sync data
    console.log(`Testing SKU: ${testSku}`);
    
    const syncVariant = await syncService.resolveSyncVariantBySku(testSku);
    console.log('✅ Sync variant found:', {
      id: syncVariant.id,
      sku: syncVariant.sku,
      name: syncVariant.name,
      color: syncVariant.color,
      size: syncVariant.size
    });
    
  } catch (error) {
    console.error('❌ Sync service test failed:', error.message);
  }
}

testSyncServiceReal();
