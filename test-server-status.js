const axios = require('axios');

async function testServerStatus() {
  console.log('🔍 Testing server status...');
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Server is running:', healthResponse.data);
    
    // Test webhook endpoint with minimal data
    const testOrder = {
      id: 123,
      line_items: [
        {
          id: 456,
          sku: '3990245_473',
          properties: [
            { name: '_layout_snapshot_v2', value: JSON.stringify({ canvas: { width: 12, height: 16, dpi: 300 }, elements: [] }) }
          ]
        }
      ]
    };
    
    const webhookResponse = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', testOrder, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com'
      }
    });
    
    console.log('✅ Webhook response:', webhookResponse.data);
    
  } catch (error) {
    console.error('❌ Server test failed:', error.response?.data || error.message);
  }
}

testServerStatus();
