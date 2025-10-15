const axios = require('axios');

// Test with a real order format that matches what Shopify sends
const realOrderTest = {
  id: 7055999999999,
  name: "#1001",
  email: "test@example.com",
  line_items: [
    {
      id: 17499999999999,
      variant_id: 4016,
      sku: "4016_Black",
      quantity: 1,
      properties: [
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
        },
        {
          name: "Font Size",
          value: "medium"
        }
      ]
    }
  ],
  shipping_address: {
    first_name: "Test",
    last_name: "User",
    address1: "123 Test St",
    city: "Los Angeles",
    province_code: "CA",
    country_code: "US",
    zip: "90210",
    phone: "555-1234"
  },
  billing_address: {
    first_name: "Test",
    last_name: "User",
    address1: "123 Test St",
    city: "Los Angeles",
    province_code: "CA",
    country_code: "US",
    zip: "90210"
  }
};

async function testRealWebhook() {
  try {
    console.log('🧪 Testing real webhook with order:', realOrderTest.id);
    
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', realOrderTest, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com'
      }
    });
    
    console.log('✅ Webhook response:', response.data);
    
    // Wait a bit for processing
    console.log('⏳ Waiting for order processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check order status
    const statusResponse = await axios.get(`http://localhost:3000/print-webhooks/orders/${realOrderTest.id}/status`);
    console.log('✅ Order status:', statusResponse.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('Stack trace:', error.response.data.stack);
    }
  }
}

testRealWebhook();
