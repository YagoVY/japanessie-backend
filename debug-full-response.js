require('dotenv').config();
const axios = require('axios');

const API = axios.create({
  baseURL: 'https://api.printful.com',
  headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
  timeout: 20000,
});

async function debugFullResponse() {
  console.log('🔍 Debugging full API response...');
  
  try {
    const { data } = await API.get('/sync/products/392071038', {
      validateStatus: () => true,
    });
    
    console.log('Full response structure:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugFullResponse();
