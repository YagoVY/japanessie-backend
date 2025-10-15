require('dotenv').config();
const axios = require('axios');

const API = axios.create({
  baseURL: 'https://api.printful.com',
  headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
  timeout: 20000,
});

async function testStoreEndpoints() {
  console.log('🧪 Testing store endpoints...');
  
  const endpoints = [
    '/store/variants',
    '/store/variants?sku=17008_Black',
    '/store/products',
    '/store/products?sku=17008_Black',
    '/sync/variants',
    '/sync/variants?sku=17008_Black',
    '/sync/products',
    '/sync/products?sku=17008_Black'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${endpoint}`);
      const { data } = await API.get(endpoint, {
        validateStatus: () => true,
      });
      
      console.log(`Status: ${data?.code || 'No code'}`);
      if (data?.result) {
        console.log(`Result type: ${Array.isArray(data.result) ? 'Array' : typeof data.result}`);
        if (Array.isArray(data.result)) {
          console.log(`Items: ${data.result.length}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testStoreEndpoints();
