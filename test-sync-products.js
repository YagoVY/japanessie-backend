require('dotenv').config();
const axios = require('axios');

const API = axios.create({
  baseURL: 'https://api.printful.com',
  headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
  timeout: 20000,
});

async function testSyncProducts() {
  console.log('🧪 Testing sync products...');
  
  try {
    const { data } = await API.get('/sync/products', {
      validateStatus: () => true,
    });
    
    console.log('Sync products response:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSyncProducts();
