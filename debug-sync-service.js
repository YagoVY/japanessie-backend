require('dotenv').config();
const { syncService } = require('./lib/printful/sync');

async function debugSyncService() {
  console.log('🔍 Debugging sync service...');
  
  try {
    console.log('Testing direct API call...');
    const res = await syncService.client.get('/sync/products');
    console.log('Direct API response:', {
      code: res?.code,
      resultType: Array.isArray(res?.result) ? 'Array' : typeof res?.result,
      resultLength: Array.isArray(res?.result) ? res.result.length : 'N/A'
    });
    
    if (res?.result && Array.isArray(res.result)) {
      console.log('First product:', {
        id: res.result[0]?.id,
        name: res.result[0]?.name,
        variants: res.result[0]?.variants
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugSyncService();
