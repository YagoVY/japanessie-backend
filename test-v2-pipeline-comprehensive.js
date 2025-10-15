#!/usr/bin/env node

/**
 * Comprehensive test script for V2 pipeline
 * Tests all 7 variant resolution tiers and extraction stability
 */

require('dotenv').config();

const { processOrderV2 } = require('./lib/webhooks/orders-create.js');
const { catalogService } = require('./lib/printful/catalog.js');
const { syncService } = require('./lib/printful/sync.js');

// Test data with different scenarios
const testOrders = {
  // Case A: Mapping by SKU
  mappingBySku: {
    id: 1001,
    line_items: [{
      id: 2001,
      sku: '17008_Black_S',
      variant_id: 17008,
      variant_title: 'Black / S',
      properties: [
        { name: '_layout_snapshot_v2', value: JSON.stringify({
          version: 2,
          printArea: { widthIn: 12, heightIn: 16, dpi: 300 },
          origin: 'top-left',
          canvasPx: { w: 600, h: 600 },
          layers: [{
            type: 'text',
            font: {
              family: 'Yuji Syuku',
              sizePt: 24,
              lineHeight: 1.10,
              letterSpacingEm: 0.12,
              vertical: false,
              textOrientation: 'upright',
              hyphenPolicy: 'jp-long-vbar'
            },
            color: '#000000',
            align: { h: 'center', v: 'baseline' },
            textBlocks: [{
              text: 'Test Design',
              xIn: 6,
              yIn: 8,
              anchor: 'center-baseline'
            }]
          }],
          meta: {
            baseFontSizeRequested: 24,
            orientation: 'horizontal'
          }
        }) },
        { name: 'Color', value: 'Black' },
        { name: 'Size', value: 'S' }
      ]
    }],
    shipping_address: {
      first_name: 'John',
      last_name: 'Doe',
      address1: '123 Main St',
      city: 'Anytown',
      province_code: 'CA',
      country_code: 'US',
      zip: '12345'
    },
    email: 'john@example.com'
  },

  // Case B: Cache by variantId from SKU
  cacheByVariantId: {
    id: 1002,
    line_items: [{
      id: 2002,
      sku: '3990245_White_M',
      variant_id: 17009,
      variant_title: 'White / M',
      properties: [
        { name: '_layout_snapshot_v2', value: JSON.stringify({
          version: 2,
          printArea: { widthIn: 12, heightIn: 16, dpi: 300 },
          origin: 'top-left',
          canvasPx: { w: 600, h: 600 },
          layers: [{
            type: 'text',
            font: {
              family: 'Yuji Syuku',
              sizePt: 24,
              lineHeight: 1.10,
              letterSpacingEm: 0.12,
              vertical: false,
              textOrientation: 'upright',
              hyphenPolicy: 'jp-long-vbar'
            },
            color: '#000000',
            align: { h: 'center', v: 'baseline' },
            textBlocks: [{
              text: 'Test Design',
              xIn: 6,
              yIn: 8,
              anchor: 'center-baseline'
            }]
          }],
          meta: {
            baseFontSizeRequested: 24,
            orientation: 'horizontal'
          }
        }) },
        { name: 'Color', value: 'White' },
        { name: 'Size', value: 'M' }
      ]
    }],
    shipping_address: {
      first_name: 'Jane',
      last_name: 'Smith',
      address1: '456 Oak Ave',
      city: 'Somewhere',
      province_code: 'NY',
      country_code: 'US',
      zip: '67890'
    },
    email: 'jane@example.com'
  },

  // Case C: ProductId + color/size (requires PRINTFUL_CATALOG_PRODUCT_ID)
  productColorSize: {
    id: 1003,
    line_items: [{
      id: 2003,
      sku: 'UNKNOWN_SKU_Red_L',
      variant_id: 17010,
      variant_title: 'Red / L',
      properties: [
        { name: '_layout_snapshot_v2', value: JSON.stringify({
          version: 2,
          printArea: { widthIn: 12, heightIn: 16, dpi: 300 },
          origin: 'top-left',
          canvasPx: { w: 600, h: 600 },
          layers: [{
            type: 'text',
            font: {
              family: 'Yuji Syuku',
              sizePt: 24,
              lineHeight: 1.10,
              letterSpacingEm: 0.12,
              vertical: false,
              textOrientation: 'upright',
              hyphenPolicy: 'jp-long-vbar'
            },
            color: '#000000',
            align: { h: 'center', v: 'baseline' },
            textBlocks: [{
              text: 'Test Design',
              xIn: 6,
              yIn: 8,
              anchor: 'center-baseline'
            }]
          }],
          meta: {
            baseFontSizeRequested: 24,
            orientation: 'horizontal'
          }
        }) },
        { name: 'Color', value: 'Red' },
        { name: 'Size', value: 'L' }
      ]
    }],
    shipping_address: {
      first_name: 'Bob',
      last_name: 'Johnson',
      address1: '789 Pine St',
      city: 'Elsewhere',
      province_code: 'TX',
      country_code: 'US',
      zip: '54321'
    },
    email: 'bob@example.com'
  },

  // Case D: Override variant ID
  overrideVariantId: {
    id: 1004,
    line_items: [{
      id: 2004,
      sku: 'OVERRIDE_TEST',
      variant_id: 17011,
      variant_title: 'Blue / XL',
      properties: [
        { name: '_layout_snapshot_v2', value: JSON.stringify({
          version: 2,
          printArea: { widthIn: 12, heightIn: 16, dpi: 300 },
          origin: 'top-left',
          canvasPx: { w: 600, h: 600 },
          layers: [{
            type: 'text',
            font: {
              family: 'Yuji Syuku',
              sizePt: 24,
              lineHeight: 1.10,
              letterSpacingEm: 0.12,
              vertical: false,
              textOrientation: 'upright',
              hyphenPolicy: 'jp-long-vbar'
            },
            color: '#000000',
            align: { h: 'center', v: 'baseline' },
            textBlocks: [{
              text: 'Test Design',
              xIn: 6,
              yIn: 8,
              anchor: 'center-baseline'
            }]
          }],
          meta: {
            baseFontSizeRequested: 24,
            orientation: 'horizontal'
          }
        }) },
        { name: '_pf_catalog_variant_id', value: '3990245' },
        { name: 'Color', value: 'Blue' },
        { name: 'Size', value: 'XL' }
      ]
    }],
    shipping_address: {
      first_name: 'Alice',
      last_name: 'Brown',
      address1: '321 Elm St',
      city: 'Nowhere',
      province_code: 'FL',
      country_code: 'US',
      zip: '98765'
    },
    email: 'alice@example.com'
  },

  // Case E: Sync fallback
  syncFallback: {
    id: 1005,
    line_items: [{
      id: 2005,
      sku: 'SYNC_ONLY_SKU',
      variant_id: 17012,
      variant_title: 'Green / S',
      properties: [
        { name: '_layout_snapshot_v2', value: JSON.stringify({
          version: 2,
          printArea: { widthIn: 12, heightIn: 16, dpi: 300 },
          origin: 'top-left',
          canvasPx: { w: 600, h: 600 },
          layers: [{
            type: 'text',
            font: {
              family: 'Yuji Syuku',
              sizePt: 24,
              lineHeight: 1.10,
              letterSpacingEm: 0.12,
              vertical: false,
              textOrientation: 'upright',
              hyphenPolicy: 'jp-long-vbar'
            },
            color: '#000000',
            align: { h: 'center', v: 'baseline' },
            textBlocks: [{
              text: 'Test Design',
              xIn: 6,
              yIn: 8,
              anchor: 'center-baseline'
            }]
          }],
          meta: {
            baseFontSizeRequested: 24,
            orientation: 'horizontal'
          }
        }) },
        { name: 'Color', value: 'Green' },
        { name: 'Size', value: 'S' }
      ]
    }],
    shipping_address: {
      first_name: 'Charlie',
      last_name: 'Wilson',
      address1: '654 Maple Dr',
      city: 'Anywhere',
      province_code: 'WA',
      country_code: 'US',
      zip: '13579'
    },
    email: 'charlie@example.com'
  },

  // Case F: No snapshot (should show panic log)
  noSnapshot: {
    id: 1006,
    line_items: [{
      id: 2006,
      sku: 'NO_SNAPSHOT_SKU',
      variant_id: 17013,
      variant_title: 'Purple / M',
      properties: [
        { name: 'Color', value: 'Purple' },
        { name: 'Size', value: 'M' }
      ]
    }],
    shipping_address: {
      first_name: 'David',
      last_name: 'Lee',
      address1: '987 Cedar Ln',
      city: 'Somewhere',
      province_code: 'OR',
      country_code: 'US',
      zip: '24680'
    },
    email: 'david@example.com'
  }
};

async function testVariantResolutionTiers() {
  console.log('\n🧪 Testing Variant Resolution Tiers...\n');

  // Test Tier 2: Mapping by SKU
  console.log('Tier 2: Mapping by SKU');
  try {
    const result = await catalogService.resolveByMappingSku('17008_Black_S');
    console.log(`✅ Mapping by SKU: 17008_Black_S → ${result}`);
  } catch (error) {
    console.log(`❌ Mapping by SKU failed: ${error.message}`);
  }

  // Test Tier 3: Cache by variantId
  console.log('\nTier 3: Cache by variantId');
  try {
    const result = await catalogService.resolveByCacheVariantId('3990245_White_M');
    console.log(`✅ Cache by variantId: 3990245_White_M → ${result}`);
  } catch (error) {
    console.log(`❌ Cache by variantId failed: ${error.message}`);
  }

  // Test Tier 4: Product + color/size
  console.log('\nTier 4: Product + color/size');
  try {
    const ctx = { productId: process.env.PRINTFUL_CATALOG_PRODUCT_ID, color: 'red', size: 'L' };
    const result = await catalogService.resolveByProductColorSize(ctx);
    console.log(`✅ Product + color/size: ${ctx.productId} ${ctx.color}/${ctx.size} → ${result}`);
  } catch (error) {
    console.log(`❌ Product + color/size failed: ${error.message}`);
  }

  // Test Tier 5: Mapping by Shopify variant ID
  console.log('\nTier 5: Mapping by Shopify variant ID');
  try {
    const result = await catalogService.resolveByMappingShopifyVariantId('17008');
    console.log(`✅ Mapping by Shopify variant ID: 17008 → ${result}`);
  } catch (error) {
    console.log(`❌ Mapping by Shopify variant ID failed: ${error.message}`);
  }

  // Test Tier 6: Product options
  console.log('\nTier 6: Product options');
  try {
    const ctx = { productHandle: 'TEE/G64000', color: 'black', size: 'S' };
    const result = await catalogService.resolveByProductOptions(ctx);
    console.log(`✅ Product options: ${ctx.productHandle} ${ctx.color}/${ctx.size} → ${result}`);
  } catch (error) {
    console.log(`❌ Product options failed: ${error.message}`);
  }

  // Test Tier 7: Sync fallback
  console.log('\nTier 7: Sync fallback');
  try {
    const result = await syncService.resolveSyncVariantBySku('SYNC_ONLY_SKU');
    console.log(`✅ Sync fallback: SYNC_ONLY_SKU → ${result.id}`);
  } catch (error) {
    console.log(`❌ Sync fallback failed: ${error.message}`);
  }
}

async function testExtractionStability() {
  console.log('\n🧪 Testing Extraction Stability...\n');

  for (const [testName, order] of Object.entries(testOrders)) {
    console.log(`\n--- Testing ${testName} ---`);
    try {
      const processedItems = await processOrderV2(order);
      console.log(`✅ ${testName}: Processed ${processedItems.length} items`);
      if (processedItems.length > 0) {
        console.log(`   First item: ${JSON.stringify(processedItems[0], null, 2)}`);
      }
    } catch (error) {
      console.log(`❌ ${testName} failed: ${error.message}`);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting V2 Pipeline Comprehensive Tests\n');
  console.log(`Environment: PRINT_RENDERER_V2=${process.env.PRINT_RENDERER_V2}`);
  console.log(`Catalog Product ID: ${process.env.PRINTFUL_CATALOG_PRODUCT_ID}`);
  console.log(`API Key: ${process.env.PRINTFUL_API_KEY ? 'Set' : 'Not set'}`);

  try {
    await testVariantResolutionTiers();
    await testExtractionStability();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testOrders, testVariantResolutionTiers, testExtractionStability };
