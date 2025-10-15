const axios = require('axios');

async function testRoute() {
  try {
    console.log('🔍 Testing if server is running updated code...');
    
    // Test the root endpoint
    const rootResponse = await axios.get('http://localhost:3000/');
    console.log('✅ Root endpoint:', rootResponse.data);
    
    // Test a simple POST to the webhook endpoint
    console.log('🧪 Testing POST to webhook endpoint...');
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', {
      test: 'data'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Webhook POST response:', response.data);
    
  } catch (error) {
    console.error('❌ Route test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testRoute();
