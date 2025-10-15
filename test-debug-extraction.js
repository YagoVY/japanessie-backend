const axios = require('axios');

// Test to debug the design data extraction
const debugOrder = {
  id: 7055999999994, // Fresh order ID
  name: "#1006",
  email: "test@example.com",
  line_items: [
    {
      id: 17499999999994, // Fresh line item ID
      variant_id: 17008, // Real Printful variant ID
      sku: "17008_Black", // Real SKU format
      quantity: 1,
      properties: [
        {
          name: "_layout_snapshot_v2",
          value: JSON.stringify({
            version: 2,
            printArea: { widthIn: 12, heightIn: 16, dpi: 300 },
            origin: 'top-left',
            canvasPx: { w: 600, h: 600 },
            layers: [
              {
                type: 'text',
                font: {
                  family: 'Cherry Bomb One',
                  sizePt: 24,
                  lineHeight: 1.1,
                  letterSpacingEm: 0.12,
                  vertical: false,
                  textOrientation: 'upright',
                  hyphenPolicy: 'jp-long-vbar'
                },
                color: '#DC2626',
                align: { h: 'center', v: 'baseline' },
                textBlocks: [
                  {
                    text: 'テスト',
                    xIn: 6,
                    yIn: 8,
                    anchor: 'center-baseline'
                  }
                ]
              }
            ],
            meta: {
              baseFontSizeRequested: 24,
              orientation: 'horizontal'
            }
          })
        }
      ]
    }
  ]
};

async function testDebugExtraction() {
  try {
    console.log('🧪 Testing design data extraction with minimal data...');
    console.log('📋 Order ID:', debugOrder.id);
    console.log('📋 Line Item ID:', debugOrder.line_items[0].id);
    console.log('📋 SKU:', debugOrder.line_items[0].sku);
    console.log('📋 Properties count:', debugOrder.line_items[0].properties.length);
    console.log('📋 Has _layout_snapshot_v2:', debugOrder.line_items[0].properties.some(p => p.name === '_layout_snapshot_v2'));
    
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', debugOrder, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'debug-extraction-test.myshopify.com'
      }
    });
    
    console.log('✅ Debug extraction test response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Debug extraction test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testDebugExtraction();
