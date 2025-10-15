require('dotenv').config();
const axios = require('axios');

const API = axios.create({
  baseURL: 'https://api.printful.com',
  headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
  timeout: 20000,
});

async function debugCatalogVariant() {
  console.log('🔍 Debugging catalog variant response structure...');
  
  try {
    const { data } = await API.get('/catalog/variants/3990245', {
      validateStatus: () => true,
    });
    
    console.log('Full catalog variant response:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

debugCatalogVariant();
