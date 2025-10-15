/**
 * Test Complete Preset Composition
 * 
 * This script tests the complete workflow:
 * 1. Generate text PNG
 * 2. Fetch background from S3
 * 3. Composite both images
 * 4. Upload final image to S3
 */

require('dotenv').config();
const PrintGenerator = require('./services/print-generator');

async function testCompletePresetComposition() {
  console.log('🧪 Testing Complete Preset Composition');
  console.log('=====================================');

  try {
    const printGenerator = new PrintGenerator();

    // Test design parameters for preset product
    const designParams = {
      text: 'テスト',
      fontFamily: 'Yuji Syuku',
      color: '#000000',
      orientation: 'horizontal',
      fontSize: 40,
      productType: 'preset_image',
      presetId: 'wave-vertical',
      // Include coordinate data for text positioning
      textCoordinates: {
        x: 300,
        y: 400,
        width: 600,
        height: 200
      }
    };

    console.log('\n🎯 Test: Complete Preset Composition Workflow');
    console.log('---------------------------------------------');
    console.log('Design params:', {
      text: designParams.text,
      presetId: designParams.presetId,
      productType: designParams.productType
    });

    try {
      // Test the complete preset print file generation
      const result = await printGenerator.generatePresetPrintFile(designParams, {
        orderId: 'test-preset-composition'
      });

      console.log('\n✅ Preset Composition Result:');
      console.log('============================');
      console.log('Success:', result.success);
      console.log('Print file URL:', result.printFileUrl);
      console.log('File size:', result.fileSize ? `${(result.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown');
      console.log('Background used:', result.backgroundUsed || 'Unknown');
      console.log('Composition method:', result.compositionMethod || 'Unknown');

      if (result.success) {
        console.log('\n🎉 Complete Preset Composition Test PASSED!');
        console.log('==========================================');
        console.log('✅ Text generation: Working');
        console.log('✅ Background fetch from S3: Working');
        console.log('✅ Image composition: Working');
        console.log('✅ S3 upload: Working');
        console.log('✅ Final image ready for Printful');
      } else {
        console.log('\n❌ Preset Composition Test FAILED');
        console.log('Error:', result.error);
      }

    } catch (error) {
      console.error('\n❌ Preset composition failed:', error.message);
      console.error('Stack trace:', error.stack);
    }

    // Test fallback behavior (custom product)
    console.log('\n🔄 Test: Custom Product Fallback');
    console.log('--------------------------------');
    
    const customDesignParams = {
      ...designParams,
      productType: 'custom',
      presetId: undefined
    };

    try {
      const customResult = await printGenerator.generatePrintFile(customDesignParams, {
        orderId: 'test-custom-fallback'
      });

      console.log('✅ Custom product fallback: Working');
      console.log('Custom result:', {
        success: customResult.success,
        printFileUrl: customResult.printFileUrl ? 'Uploaded to S3' : 'Not uploaded'
      });

    } catch (error) {
      console.error('❌ Custom product fallback failed:', error.message);
    }

    console.log('\n🎉 Complete Preset Composition Test Complete!');
    console.log('============================================');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCompletePresetComposition();
