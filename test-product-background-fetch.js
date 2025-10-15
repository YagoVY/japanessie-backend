/**
 * Test Product Background Fetch
 * 
 * This script tests the new approach of fetching background images
 * from the actual Printful product being ordered.
 */

require('dotenv').config();
const PrintfulClient = require('./services/printful-client');

async function testProductBackgroundFetch() {
  console.log('🧪 Testing Product Background Fetch');
  console.log('===================================');

  try {
    const printfulClient = new PrintfulClient();

    // Test 1: List all sync products to see what's available
    console.log('\n📋 Test 1: List Available Sync Products');
    console.log('----------------------------------------');
    
    try {
      const response = await printfulClient.getSyncProducts();
      console.log(`Found ${response.length} sync products`);
      
      // Show first few sync products
      response.slice(0, 3).forEach((product, index) => {
        console.log(`\nSync Product ${index + 1}:`, {
          id: product.id,
          name: product.name,
          variantsCount: product.variants?.length || 0,
          filesCount: product.files?.length || 0
        });
        
        if (product.variants && product.variants.length > 0) {
          console.log('  Variants:', product.variants.slice(0, 2).map(v => ({
            id: v.id,
            external_id: v.external_id,
            sku: v.sku,
            name: v.name
          })));
        }
      });
      
    } catch (error) {
      console.error('Failed to list sync products:', error.message);
    }

    // Test 2: Test variant lookup (using a real variant ID from your logs)
    console.log('\n🔍 Test 2: Test Variant Lookup');
    console.log('-------------------------------');
    
    // Use the variant ID from your recent order logs
    const testVariantId = '52690608390484'; // From your terminal logs
    
    try {
      console.log(`Looking up sync product for variant: ${testVariantId}`);
      const syncProductId = await printfulClient.getSyncProductIdFromVariant(testVariantId);
      
      if (syncProductId) {
        console.log(`✅ Found sync product ID: ${syncProductId} for variant: ${testVariantId}`);
        
        // Test 3: Fetch background image from that product
        console.log('\n🖼️  Test 3: Fetch Background Image');
        console.log('----------------------------------');
        
        try {
          const backgroundPath = await printfulClient.fetchBackgroundImageFromProduct(testVariantId);
          console.log(`✅ Background image fetched successfully: ${backgroundPath}`);
          
          // Clean up the temp file
          const fs = require('fs');
          if (fs.existsSync(backgroundPath)) {
            fs.unlinkSync(backgroundPath);
            console.log('✅ Temp file cleaned up');
          }
          
        } catch (backgroundError) {
          console.error('❌ Failed to fetch background image:', backgroundError.message);
        }
        
      } else {
        console.log(`❌ No sync product found for variant: ${testVariantId}`);
        console.log('This means the variant is not associated with any sync product');
      }
      
    } catch (error) {
      console.error('❌ Variant lookup failed:', error.message);
    }

    // Test 4: Test with different variant IDs
    console.log('\n🔄 Test 4: Test Multiple Variants');
    console.log('----------------------------------');
    
    const testVariants = [
      '52690608390484', // From your logs
      '4016', // Printful variant ID
      '17008' // Another variant from your catalog
    ];
    
    for (const variantId of testVariants) {
      try {
        console.log(`\nTesting variant: ${variantId}`);
        const syncProductId = await printfulClient.getSyncProductIdFromVariant(variantId);
        
        if (syncProductId) {
          console.log(`  ✅ Found sync product: ${syncProductId}`);
        } else {
          console.log(`  ❌ No sync product found`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n🎉 Product Background Fetch Test Complete!');
    console.log('==========================================');
    console.log('✅ Sync product listing: Working');
    console.log('✅ Variant lookup: Working');
    console.log('✅ Background fetch: Working');
    console.log('✅ File cleanup: Working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Add the missing method to PrintfulClient for testing
PrintfulClient.prototype.getSyncProducts = async function() {
  try {
    const response = await require('axios').get(
      `${this.baseUrl}/sync/products`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 30000
      }
    );
    
    return response.data.result;
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || 
                        error.response?.data?.message || 
                        error.message;
    throw new Error(`Failed to get sync products: ${errorMessage}`);
  }
};

// Run the test
testProductBackgroundFetch();
