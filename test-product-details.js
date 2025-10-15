require('dotenv').config();
const axios = require('axios');

const API = axios.create({
  baseURL: 'https://api.printful.com',
  headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
  timeout: 20000,
});

async function testProductDetails() {
  console.log('🧪 Testing product details for Gildan 64000...');
  
  try {
    // Test the Gildan 64000 product (ID: 12)
    const { data } = await API.get('/catalog/products/12', {
      validateStatus: () => true,
    });
    
    console.log('Response status:', data?.code);
    console.log('Response structure:', Object.keys(data || {}));
    
    if (data?.result) {
      const product = data.result;
      console.log('\n📋 Product details:');
      console.log(`- ID: ${product.id}`);
      console.log(`- Name: ${product.display_name}`);
      console.log(`- Variants count: ${product.variants?.length || 0}`);
      
      if (product.variants && product.variants.length > 0) {
        console.log('\n🎨 Sample variants:');
        product.variants.slice(0, 5).forEach(v => {
          console.log(`- Variant ID: ${v.id}, Color: ${v.color}, Size: ${v.size}`);
        });
      }
    } else {
      console.log('❌ No result in response:', data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testProductDetails();
