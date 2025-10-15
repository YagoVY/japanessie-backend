require('dotenv').config();
const { printfulClient } = require('./lib/printful/client');

async function debugProductData() {
  console.log('🔍 Debugging product data structure...');
  
  try {
    // Get the first product
    const products = await printfulClient.get('/sync/products');
    console.log('Products:', products.length);
    
    if (products.length > 0) {
      const firstProduct = products[0];
      console.log('First product ID:', firstProduct.id);
      
      // Get the product details
      const productData = await printfulClient.get(`/sync/products/${firstProduct.id}`);
      console.log('Product data structure:', {
        hasVariants: !!productData.variants,
        variantsType: typeof productData.variants,
        variantsLength: Array.isArray(productData.variants) ? productData.variants.length : 'N/A'
      });
      
      if (productData.variants && Array.isArray(productData.variants)) {
        console.log('First few variants:');
        productData.variants.slice(0, 3).forEach((v, i) => {
          console.log(`  ${i + 1}. SKU: ${v.sku}, ID: ${v.id}, Name: ${v.name}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugProductData();
