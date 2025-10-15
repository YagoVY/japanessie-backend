const axios = require('axios');

// Script to check your Printful setup and get catalog variants
async function checkPrintfulSetup() {
  console.log('🔍 Checking your Printful setup...');
  
  // Check environment variables
  const apiKey = process.env.PRINTFUL_API_KEY;
  console.log(`PRINTFUL_API_KEY: ${apiKey ? '✅ Set' : '❌ Not set'}`);
  
  if (!apiKey) {
    console.log('\n💡 To set your API key temporarily, run:');
    console.log('   $env:PRINTFUL_API_KEY="your_actual_api_key_here"');
    console.log('\n💡 Or create a .env file with:');
    console.log('   PRINTFUL_API_KEY=your_actual_api_key_here');
    return;
  }

  try {
    console.log('\n🔍 Testing API connection...');
    
    // Test API connection
    const testResponse = await axios.get('https://api.printful.com/products', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      params: {
        limit: 5
      }
    });

    console.log('✅ API connection successful!');
    console.log(`📦 Found ${testResponse.data.result.length} products (showing first 5)`);

    // Get all products
    console.log('\n🔍 Fetching all products...');
    const productsResponse = await axios.get('https://api.printful.com/products', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const products = productsResponse.data.result;
    console.log(`📦 Total products in catalog: ${products.length}`);

    // Find t-shirt products
    const tshirtProducts = products.filter(p => 
      p.name.toLowerCase().includes('t-shirt') || 
      p.name.toLowerCase().includes('tshirt') ||
      p.name.toLowerCase().includes('tee') ||
      p.name.toLowerCase().includes('shirt')
    );

    console.log(`👕 T-shirt products found: ${tshirtProducts.length}`);

    if (tshirtProducts.length === 0) {
      console.log('\n⚠️  No t-shirt products found. Showing all products:');
      products.slice(0, 10).forEach(product => {
        console.log(`   - ${product.name} (ID: ${product.id})`);
      });
      return;
    }

    // Get variants for t-shirt products
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
        
        // Show first 5 variants
        variants.slice(0, 5).forEach(variant => {
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
        
        if (variants.length > 5) {
          console.log(`   ... and ${variants.length - 5} more variants`);
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to get variants for product ${product.id}:`, error.message);
      }
    }

    console.log(`\n✅ Found ${allVariants.length} total variants`);
    
    // Save to file for reference
    const fs = require('fs');
    fs.writeFileSync('real-printful-catalog.json', JSON.stringify(allVariants, null, 2));
    console.log('💾 Saved catalog to real-printful-catalog.json');
    
    // Show example SKUs for testing
    console.log('\n🧪 Example SKUs for testing:');
    allVariants.slice(0, 5).forEach(variant => {
      if (variant.sku) {
        console.log(`   ${variant.sku} (${variant.productName} - ${variant.size} ${variant.color})`);
      } else {
        console.log(`   ID: ${variant.id} (${variant.productName} - ${variant.size} ${variant.color}) - No SKU`);
      }
    });

    // Check for variants without SKUs
    const variantsWithoutSku = allVariants.filter(v => !v.sku);
    if (variantsWithoutSku.length > 0) {
      console.log('\n⚠️  Variants without SKUs (these might be your old sync variants):');
      variantsWithoutSku.slice(0, 3).forEach(variant => {
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

checkPrintfulSetup();
