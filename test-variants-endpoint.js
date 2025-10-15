require('dotenv').config();
const axios = require('axios');

const API = axios.create({
  baseURL: 'https://api.printful.com',
  headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
  timeout: 20000,
});

async function testVariantsEndpoint() {
  console.log('🧪 Testing variants endpoint...');
  
  try {
    // Test if there's a separate variants endpoint
    const { data } = await API.get('/catalog/products/12/variants', {
      validateStatus: () => true,
    });
    
    console.log('Variants endpoint response:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.log('Variants endpoint failed, trying alternative...');
    
    try {
      // Try the sync variants endpoint (legacy)
      const { data } = await API.get('/sync/products/12', {
        validateStatus: () => true,
      });
      
      console.log('Sync products endpoint response:');
      console.log(JSON.stringify(data, null, 2));
      
    } catch (error2) {
      console.log('Sync products also failed, trying products endpoint...');
      
      try {
        // Try the regular products endpoint
        const { data } = await API.get('/products/12', {
          validateStatus: () => true,
        });
        
        console.log('Products endpoint response:');
        console.log(JSON.stringify(data, null, 2));
        
      } catch (error3) {
        console.error('All endpoints failed:', error3.message);
      }
    }
  }
}

testVariantsEndpoint();
