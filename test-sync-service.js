require('dotenv').config();
const { syncService } = require('./lib/printful/sync');

async function testSyncService() {
  console.log('🧪 Testing sync service...');
  
  try {
    // Test with a real SKU that should exist in your store
    const testSku = '17008_Black';
    console.log(`Testing SKU: ${testSku}`);
    
    const syncVariant = await syncService.resolveSyncVariantBySku(testSku);
    console.log('✅ Sync variant found:', syncVariant);
    
  } catch (error) {
    console.error('❌ Sync service test failed:', error.message);
  }
}

testSyncService();
