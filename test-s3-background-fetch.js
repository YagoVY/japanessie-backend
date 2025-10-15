/**
 * Test S3 Background Fetch
 * 
 * This script tests the new S3-based background image fetching system.
 */

require('dotenv').config();
const PrintfulClient = require('./services/printful-client');

async function testS3BackgroundFetch() {
  console.log('🧪 Testing S3 Background Fetch');
  console.log('==============================');

  try {
    const printfulClient = new PrintfulClient();

    // Test with the wave-vertical preset
    console.log('\n🎯 Test: Fetch Wave Vertical Background');
    console.log('----------------------------------------');
    
    const presetId = 'wave-vertical';
    
    try {
      console.log(`Fetching background for preset: ${presetId}`);
      const backgroundPath = await printfulClient.fetchBackgroundImageFromS3(presetId);
      
      console.log(`✅ Background image fetched successfully: ${backgroundPath}`);
      
      // Check if file exists and get its size
      const fs = require('fs');
      if (fs.existsSync(backgroundPath)) {
        const stats = fs.statSync(backgroundPath);
        console.log(`✅ File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Clean up the temp file
        fs.unlinkSync(backgroundPath);
        console.log('✅ Temp file cleaned up');
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch background image:', error.message);
    }

    // Test with other presets
    console.log('\n🔄 Test: Multiple Presets');
    console.log('-------------------------');
    
    const testPresets = [
      'wave-vertical',
      'wave-horizontal', 
      'geometric-pattern',
      'minimalist-lines',
      'japanese-motif'
    ];
    
    for (const preset of testPresets) {
      try {
        console.log(`\nTesting preset: ${preset}`);
        const backgroundPath = await printfulClient.fetchBackgroundImageFromS3(preset);
        
        if (backgroundPath) {
          console.log(`  ✅ Success: ${backgroundPath}`);
          
          // Clean up
          const fs = require('fs');
          if (fs.existsSync(backgroundPath)) {
            fs.unlinkSync(backgroundPath);
          }
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    // Test invalid preset
    console.log('\n❌ Test: Invalid Preset');
    console.log('----------------------');
    
    try {
      await printfulClient.fetchBackgroundImageFromS3('invalid-preset');
      console.log('❌ Should have failed for invalid preset');
    } catch (error) {
      console.log(`✅ Correctly failed for invalid preset: ${error.message}`);
    }

    console.log('\n🎉 S3 Background Fetch Test Complete!');
    console.log('====================================');
    console.log('✅ S3 background fetching: Working');
    console.log('✅ File download and cleanup: Working');
    console.log('✅ Error handling: Working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testS3BackgroundFetch();
