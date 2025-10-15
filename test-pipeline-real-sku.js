const axios = require('axios');

async function testPipelineRealSku() {
  console.log('🧪 Testing pipeline with real sync SKU...');
  
  const orderData = {
    id: 7055999999990,
    line_items: [
      {
        id: 17499999999990,
        sku: '3990245_473', // Real SKU from sync products
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
    console.log('📋 Order ID:', orderData.id);
    console.log('📋 Line Item ID:', orderData.line_items[0].id);
    console.log('📋 SKU:', orderData.line_items[0].sku);
    console.log('📋 Variant Title:', orderData.line_items[0].variant_title);

    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', orderData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com'
      }
    });

    console.log('✅ Pipeline test response:');
    console.log(response.data);

  } catch (error) {
    console.error('❌ Pipeline test failed:', error.response?.data || error.message);
  }
}

testPipelineRealSku();
