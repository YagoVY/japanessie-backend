#!/usr/bin/env node

/**
 * Test script for V2 webhook endpoint
 * Sends a real order payload to test the complete pipeline
 */

require('dotenv').config();

const testOrder = {
  id: 999999,
  line_items: [{
    id: 888888,
    sku: '17008_Black_S',
    variant_id: 17008,
    variant_title: 'Black / S',
    properties: [
      { 
        name: '_layout_snapshot_v2', 
        value: JSON.stringify({
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
        })
      },
      { name: 'Color', value: 'Black' },
      { name: 'Size', value: 'S' }
    ]
  }],
  shipping_address: {
    first_name: 'Test',
    last_name: 'User',
    address1: '123 Test Street',
    city: 'Test City',
    province_code: 'CA',
    country_code: 'US',
    zip: '12345'
  },
  email: 'test@example.com'
};

async function testWebhook() {
  console.log('🧪 Testing V2 Webhook Endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:3000/webhooks/shopify/orders/created', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com'
      },
      body: JSON.stringify(testOrder)
    });

    const result = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, result);
    
    if (response.status === 200) {
      console.log('\n✅ Webhook test successful!');
    } else {
      console.log('\n❌ Webhook test failed!');
    }
    
  } catch (error) {
    console.error('❌ Webhook test error:', error.message);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testWebhook();
}

module.exports = { testWebhook, testOrder };
