require('dotenv').config();
const axios = require('axios');

// Script to get your real Printful catalog variants
async function getRealCatalog() {
  const apiKey = process.env.PRINTFUL_API_KEY;
  
  if (!apiKey) {
    console.error('❌ PRINTFUL_API_KEY not set. Please set it in your environment.');
    console.log('💡 You can set it temporarily with: $env:PRINTFUL_API_KEY="your_key_here"');
    return;
  }

  try {
    console.log('🔍 Fetching your real Printful catalog...');
    
    // Get all products first
    const productsResponse = await axios.get('https://api.printful.com/products', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const products = productsResponse.data.result;
    console.log(`📦 Found ${products.length} products in your catalog`);

    // Find t-shirt products
    const tshirtProducts = products.filter(p => 
      p.name && p.name.toLowerCase().includes('t-shirt') || 
      p.name && p.name.toLowerCase().includes('tshirt') ||
      p.name && p.name.toLowerCase().includes('tee') ||
      p.name && p.name.toLowerCase().includes('shirt')
    );

    console.log(`👕 Found ${tshirtProducts.length} t-shirt products`);

    // Get variants for each t-shirt product
    const allVariants = [];
    
    for (const product of tshirtProducts) {
      console.log(`\n📋 Product: ${product.name} (ID: ${product.id})`);
      
      try {
        const variantsResponse = await axios.get(`https://api.printful.com/products/${product.id}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        const variants = variantsResponse.data.result.variants || [];
        console.log(`   Variants: ${variants.length}`);
        
        // Show all variants
        variants.forEach(variant => {
          console.log(`   - ID: ${variant.id}, SKU: ${variant.sku || 'N/A'}, Size: ${variant.size}, Color: ${variant.color}`);
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
    fs.writeFileSync('real-printful-catalog.json', JSON.stringify(allVariants, null, 2));
    console.log('💾 Saved catalog to real-printful-catalog.json');
    
    // Show some example SKUs for testing
    console.log('\n🧪 Example SKUs from your catalog:');
    allVariants.slice(0, 10).forEach(variant => {
      if (variant.sku) {
        console.log(`   ${variant.sku} (${variant.productName} - ${variant.size} ${variant.color})`);
      } else {
        console.log(`   ID: ${variant.id} (${variant.productName} - ${variant.size} ${variant.color}) - No SKU`);
      }
    });

    // Show variants without SKUs (these might be the ones you were using before)
    const variantsWithoutSku = allVariants.filter(v => !v.sku);
    if (variantsWithoutSku.length > 0) {
      console.log('\n⚠️  Variants without SKUs (these might be your old sync variants):');
      variantsWithoutSku.slice(0, 5).forEach(variant => {
        console.log(`   ID: ${variant.id} (${variant.productName} - ${variant.size} ${variant.color})`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to fetch catalog:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 Check your PRINTFUL_API_KEY - it might be invalid or expired');
    }
  }
}

getRealCatalog();
