const axios = require('axios');

async function testEnvVars() {
  console.log('🔍 Testing environment variables...');
  
  try {
    // Test the test endpoint to see what environment variables are set
    const response = await axios.post('http://localhost:3000/webhooks/test/order', {
      test: 'env'
    });
    
    console.log('✅ Environment test response:', response.data);
    
  } catch (error) {
    console.error('❌ Environment test failed:', error.response?.data || error.message);
  }
}

testEnvVars();
