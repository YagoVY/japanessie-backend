require('dotenv').config();
const axios = require('axios');

const API = axios.create({
  baseURL: 'https://api.printful.com',
  headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
  timeout: 20000,
});

async function testSyncVariants() {
  console.log('🧪 Testing sync variants...');
  
  try {
    // Test the first product
    const { data } = await API.get('/sync/products/392071038', {
      validateStatus: () => true,
    });
    
    console.log('Sync product variants response:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSyncVariants();
