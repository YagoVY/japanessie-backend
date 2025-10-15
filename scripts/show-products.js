require('dotenv').config();
const axios = require('axios');

// Script to show what products you have in your Printful catalog
async function showProducts() {
  try {
    console.log('🔍 Fetching your Printful products...');
    
    const productsResponse = await axios.get('https://api.printful.com/products', {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`
      }
    });

    const products = productsResponse.data.result;
    console.log(`📦 Found ${products.length} products in your catalog`);

    // Show first 20 products
    console.log('\n📋 First 20 products:');
    products.slice(0, 20).forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (ID: ${product.id})`);
    });

    // Look for products that might be t-shirts
    const possibleTshirts = products.filter(p => 
      p.name && (
        p.name.toLowerCase().includes('t-shirt') || 
        p.name.toLowerCase().includes('tshirt') ||
        p.name.toLowerCase().includes('tee') ||
        p.name.toLowerCase().includes('shirt') ||
        p.name.toLowerCase().includes('apparel') ||
        p.name.toLowerCase().includes('clothing') ||
        p.name.toLowerCase().includes('garment')
      )
    );

    if (possibleTshirts.length > 0) {
      console.log(`\n👕 Found ${possibleTshirts.length} possible t-shirt/apparel products:`);
      possibleTshirts.forEach(product => {
        console.log(`   - ${product.name} (ID: ${product.id})`);
      });
    } else {
      console.log('\n⚠️  No obvious t-shirt products found. Let me check a few products for variants...');
      
      // Check first 3 products for variants
      for (const product of products.slice(0, 3)) {
        console.log(`\n📋 Checking product: ${product.name} (ID: ${product.id})`);
        
        try {
          const variantsResponse = await axios.get(`https://api.printful.com/products/${product.id}`, {
            headers: {
              'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`
            }
          });

          const variants = variantsResponse.data.result.variants || [];
          console.log(`   Variants: ${variants.length}`);
          
          if (variants.length > 0) {
            console.log(`   First few variants:`);
            variants.slice(0, 3).forEach(variant => {
              console.log(`     - ID: ${variant.id}, SKU: ${variant.sku || 'N/A'}, Size: ${variant.size}, Color: ${variant.color}`);
            });
          }
        } catch (error) {
          console.log(`   ❌ Failed to get variants: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Failed to fetch products:', error.response?.data || error.message);
  }
}

showProducts();
