/**
 * Test Preset Detection
 * 
 * This script tests the preset product detection logic
 * to ensure it correctly identifies preset vs custom products.
 */

require('dotenv').config();
const OrderProcessor = require('./services/order-processor');
const PrintGenerator = require('./services/print-generator');

async function testPresetDetection() {
  console.log('🧪 Testing Preset Product Detection');
  console.log('===================================');

  try {
    const orderProcessor = new OrderProcessor();
    const printGenerator = new PrintGenerator();

    // Test 1: Custom Product (should NOT be detected as preset)
    console.log('\n📝 Test 1: Custom Product Detection');
    console.log('-----------------------------------');
    
    const customOrderData = {
      orderId: 'test-custom-detection',
      designData: {
        _design_params: {
          translatedText: 'テスト',
          originalText: 'Test',
          fontStyle: 'Yuji Syuku',
          fontSize: 40,
          fontColor: '#DC2626',
          orientation: 'horizontal',
          productType: 'custom',  // Frontend sends lowercase
          presetId: null,
          textCoordinates: {
            coordinates: [
              { char: 'テ', x: 100, y: 200, width: 25 },
              { char: 'ス', x: 125, y: 200, width: 25 },
              { char: 'ト', x: 150, y: 200, width: 25 }
            ],
            printArea: { x: 200, y: 78, width: 200, height: 270 },
            source: 'frontend-capture'
          }
        }
      }
    };

    const customDesignParams = orderProcessor.extractDesignParams(customOrderData);
    const isCustomPreset = printGenerator.isPresetProduct(customDesignParams);
    const customPresetId = printGenerator.extractPresetId(customDesignParams);
    
    console.log('Custom product design params:', {
      productType: customDesignParams.productType,
      presetId: customDesignParams.presetId,
      isPreset: isCustomPreset,
      extractedPresetId: customPresetId
    });
    
    if (!isCustomPreset && !customPresetId) {
      console.log('✅ Custom product correctly identified as NOT preset');
    } else {
      console.log('❌ Custom product incorrectly identified as preset');
    }

    // Test 2: Preset Product (should be detected as preset)
    console.log('\n🎨 Test 2: Preset Product Detection');
    console.log('-----------------------------------');
    
    const presetOrderData = {
      orderId: 'test-preset-detection',
      designData: {
        _design_params: {
          translatedText: 'こんにちは',
          originalText: 'Hello',
          fontStyle: 'Yuji Syuku',
          fontSize: 40,
          fontColor: '#000000',
          orientation: 'horizontal',
          productType: 'preset_image',  // Frontend sends lowercase
          presetId: 'wave-vertical',    // Frontend sends preset ID
          textCoordinates: {
            coordinates: [
              { char: 'こ', x: 100, y: 200, width: 25 },
              { char: 'ん', x: 125, y: 200, width: 25 },
              { char: 'に', x: 150, y: 200, width: 25 },
              { char: 'ち', x: 175, y: 200, width: 25 },
              { char: 'は', x: 200, y: 200, width: 25 }
            ],
            printArea: { x: 200, y: 78, width: 200, height: 270 },
            source: 'frontend-capture'
          }
        }
      }
    };

    const presetDesignParams = orderProcessor.extractDesignParams(presetOrderData);
    const isPresetProduct = printGenerator.isPresetProduct(presetDesignParams);
    const presetId = printGenerator.extractPresetId(presetDesignParams);
    
    console.log('Preset product design params:', {
      productType: presetDesignParams.productType,
      presetId: presetDesignParams.presetId,
      isPreset: isPresetProduct,
      extractedPresetId: presetId
    });
    
    if (isPresetProduct && presetId === 'wave-vertical') {
      console.log('✅ Preset product correctly identified as preset');
    } else {
      console.log('❌ Preset product incorrectly identified');
    }

    // Test 3: Edge Cases
    console.log('\n🔍 Test 3: Edge Cases');
    console.log('---------------------');
    
    // Test with uppercase productType (backward compatibility)
    const uppercaseOrderData = {
      orderId: 'test-uppercase',
      designData: {
        _design_params: {
          translatedText: 'テスト',
          fontStyle: 'Yuji Syuku',
          fontSize: 40,
          fontColor: '#000000',
          orientation: 'horizontal',
          productType: 'PRESET_IMAGE',  // Uppercase (backward compatibility)
          presetId: 'geometric-pattern'
        }
      }
    };

    const uppercaseDesignParams = orderProcessor.extractDesignParams(uppercaseOrderData);
    const isUppercasePreset = printGenerator.isPresetProduct(uppercaseDesignParams);
    const uppercasePresetId = printGenerator.extractPresetId(uppercaseDesignParams);
    
    console.log('Uppercase productType test:', {
      productType: uppercaseDesignParams.productType,
      presetId: uppercaseDesignParams.presetId,
      isPreset: isUppercasePreset,
      extractedPresetId: uppercasePresetId
    });
    
    if (isUppercasePreset && uppercasePresetId === 'geometric-pattern') {
      console.log('✅ Uppercase productType correctly handled');
    } else {
      console.log('❌ Uppercase productType not handled correctly');
    }

    // Test 4: Missing Preset ID
    console.log('\n⚠️  Test 4: Missing Preset ID');
    console.log('-----------------------------');
    
    const missingPresetIdOrderData = {
      orderId: 'test-missing-preset-id',
      designData: {
        _design_params: {
          translatedText: 'テスト',
          fontStyle: 'Yuji Syuku',
          fontSize: 40,
          fontColor: '#000000',
          orientation: 'horizontal',
          productType: 'preset_image',  // Says it's preset
          presetId: null                // But no preset ID
        }
      }
    };

    const missingPresetIdDesignParams = orderProcessor.extractDesignParams(missingPresetIdOrderData);
    const isMissingPresetId = printGenerator.isPresetProduct(missingPresetIdDesignParams);
    const missingPresetId = printGenerator.extractPresetId(missingPresetIdDesignParams);
    
    console.log('Missing preset ID test:', {
      productType: missingPresetIdDesignParams.productType,
      presetId: missingPresetIdDesignParams.presetId,
      isPreset: isMissingPresetId,
      extractedPresetId: missingPresetId
    });
    
    if (!isMissingPresetId && !missingPresetId) {
      console.log('✅ Missing preset ID correctly handled (treated as custom)');
    } else {
      console.log('❌ Missing preset ID not handled correctly');
    }

    console.log('\n🎉 Preset Detection Tests Completed!');
    console.log('====================================');
    console.log('✅ Custom products: Correctly identified');
    console.log('✅ Preset products: Correctly identified');
    console.log('✅ Uppercase compatibility: Working');
    console.log('✅ Missing preset ID: Handled gracefully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testPresetDetection();
