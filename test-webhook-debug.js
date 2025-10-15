const axios = require('axios');

async function testWebhookDebug() {
  console.log('🔍 Testing webhook with debug info...');
  
  const testOrder = {
    id: 123,
    line_items: [
      {
        id: 456,
        sku: '3990245_473',
        variant_title: 'White / S',
        properties: [
          { name: 'Color', value: 'White' },
          { name: 'Size', value: 'S' },
          { name: '_layout_snapshot_v2', value: JSON.stringify({
            canvas: {
              width: 12,
              height: 16,
              dpi: 300
            },
            elements: [
              {
                id: 'text-1',
                type: 'text',
                content: 'テスト',
                fontFamily: 'Yuji Syuku',
                fontSize: 24,
                color: '#000000',
                x: 6,
                y: 8,
                width: 4,
                height: 1
              }
            ]
          })}
        ]
      }
    ],
    shipping_address: {
      first_name: 'Test',
      last_name: 'User',
      address1: '123 Test St',
      city: 'Test City',
      province_code: 'CA',
      country_code: 'US',
      zip: '12345'
    },
    email: 'test@example.com'
  };

  try {
    console.log('📋 Sending test order with:');
    console.log('- Order ID:', testOrder.id);
    console.log('- Line Item ID:', testOrder.line_items[0].id);
    console.log('- SKU:', testOrder.line_items[0].sku);
    console.log('- Has _layout_snapshot_v2:', !!testOrder.line_items[0].properties.find(p => p.name === '_layout_snapshot_v2'));
    
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', testOrder, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com'
      }
    });
    
    console.log('✅ Webhook response:', response.data);
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error.response?.data || error.message);
  }
}

testWebhookDebug();