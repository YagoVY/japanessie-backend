const axios = require('axios');

// Test to check which pipeline is being used
const testOrder = {
  id: 7055999999993, // Fresh order ID
  name: "#1007",
  email: "test@example.com",
  line_items: [
    {
      id: 17499999999993, // Fresh line item ID
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

async function testPipelineCheck() {
  try {
    console.log('🧪 Testing which pipeline is being used...');
    console.log('📋 Order ID:', testOrder.id);
    console.log('📋 Line Item ID:', testOrder.line_items[0].id);
    console.log('📋 SKU:', testOrder.line_items[0].sku);
    
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', testOrder, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'pipeline-check-test.myshopify.com'
      }
    });
    
    console.log('✅ Pipeline check response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Pipeline check failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testPipelineCheck();
