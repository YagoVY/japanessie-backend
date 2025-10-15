const axios = require('axios');

// Script to get real Printful catalog variants
async function getPrintfulCatalog() {
  const apiKey = process.env.PRINTFUL_API_KEY;
  
  if (!apiKey) {
    console.error('❌ PRINTFUL_API_KEY not set. Please set it in your environment.');
    return;
  }

  try {
    console.log('🔍 Fetching Printful catalog variants...');
    
    // Get all products first
    const productsResponse = await axios.get('https://api.printful.com/products', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const products = productsResponse.data.result;
    console.log(`📦 Found ${products.length} products in catalog`);

    // Find t-shirt products
    const tshirtProducts = products.filter(p => 
      p.name.toLowerCase().includes('t-shirt') || 
      p.name.toLowerCase().includes('tshirt') ||
      p.name.toLowerCase().includes('tee')
    );

    console.log(`👕 Found ${tshirtProducts.length} t-shirt products`);

    // Get variants for each t-shirt product
    const allVariants = [];
    
    for (const product of tshirtProducts.slice(0, 3)) { // Limit to first 3 products
      console.log(`\n📋 Product: ${product.name} (ID: ${product.id})`);
      
      try {
        const variantsResponse = await axios.get(`https://api.printful.com/products/${product.id}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        const variants = variantsResponse.data.result.variants || [];
        console.log(`   Variants: ${variants.length}`);
        
        // Show first 5 variants as examples
        variants.slice(0, 5).forEach(variant => {
          console.log(`   - ID: ${variant.id}, SKU: ${variant.sku}, Size: ${variant.size}, Color: ${variant.color}`);
          allVariants.push({
            id: variant.id,
            sku: variant.sku,
            name: variant.name,
            size: variant.size,
            color: variant.color,
            productName: product.name
          });
        });
        
      } catch (error) {
        console.error(`   ❌ Failed to get variants for product ${product.id}:`, error.message);
      }
    }

    console.log(`\n✅ Found ${allVariants.length} total variants`);
    
    // Save to file for reference
    const fs = require('fs');
    fs.writeFileSync('printful-catalog.json', JSON.stringify(allVariants, null, 2));
    console.log('💾 Saved catalog to printful-catalog.json');
    
    // Show some example SKUs for testing
    console.log('\n🧪 Example SKUs for testing:');
    allVariants.slice(0, 5).forEach(variant => {
      if (variant.sku) {
        console.log(`   ${variant.sku} (${variant.productName} - ${variant.size} ${variant.color})`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch catalog:', error.response?.data || error.message);
  }
}

getPrintfulCatalog();
