const axios = require('axios');

// Test the new print generation system
async function testNewSystem() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing New Print Generation System\n');
  
  try {
    // 1. Test renderer health
    console.log('1. Testing renderer health...');
    const healthResponse = await axios.get(`${baseUrl}/print-webhooks/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // 2. Test renderer functionality
    console.log('\n2. Testing renderer functionality...');
    const rendererResponse = await axios.get(`${baseUrl}/print-webhooks/test-renderer`);
    console.log('✅ Renderer test:', rendererResponse.data);
    
    // 3. Test print generation
    console.log('\n3. Testing print generation...');
    const testDesignParams = {
      text: 'テスト',
      fontFamily: 'Yuji Syuku',
      fontSize: 40,
      color: '#000000',
      orientation: 'horizontal'
    };
    
    const printResponse = await axios.post(`${baseUrl}/print-webhooks/test-print`, {
      designParams: testDesignParams
    });
    console.log('✅ Print generation:', printResponse.data);
    
    // 4. Test order processing with new system
    console.log('\n4. Testing order processing...');
    const testOrder = {
      id: 9999999999999,
      name: "#TEST001",
      email: "test@example.com",
      line_items: [{
        id: 9999999999998,
        variant_id: 4016,
        sku: "4016_Black",
        quantity: 1,
        properties: [
          {
            name: "_design_params",
            value: JSON.stringify(testDesignParams)
          },
          {
            name: "Original Text",
            value: "test"
          },
          {
            name: "Japanese Text", 
            value: "テスト"
          },
          {
            name: "Font Style",
            value: "Yuji Syuku"
          },
          {
            name: "Font Color",
            value: "#000000"
          },
          {
            name: "Text Orientation",
            value: "horizontal"
          }
        ]
      }],
      shipping_address: {
        first_name: "Test",
        last_name: "User",
        address1: "123 Test St",
        city: "Test City",
        province_code: "CA",
        country_code: "US",
        zip: "12345",
        phone: "555-1234"
      },
      billing_address: {
        first_name: "Test",
        last_name: "User",
        address1: "123 Test St",
        city: "Test City",
        province_code: "CA",
        country_code: "US",
        zip: "12345"
      }
    };
    
    const orderResponse = await axios.post(`${baseUrl}/print-webhooks/shopify/orders/created`, testOrder, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com'
      }
    });
    console.log('✅ Order processing started:', orderResponse.data);
    
    // 5. Check order status
    console.log('\n5. Checking order status...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const statusResponse = await axios.get(`${baseUrl}/print-webhooks/orders/${testOrder.id}/status`);
    console.log('✅ Order status:', statusResponse.data);
    
    // 6. List recent orders
    console.log('\n6. Listing recent orders...');
    const ordersResponse = await axios.get(`${baseUrl}/print-webhooks/orders`);
    console.log('✅ Recent orders:', ordersResponse.data);
    
    console.log('\n🎉 All tests passed! New system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('Stack trace:', error.response.data.stack);
    }
  }
}

// Run the test
testNewSystem();
