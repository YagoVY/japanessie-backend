const axios = require('axios');

// Test with the exact same format as the working order from the logs
const workingOrderTest = {
  id: 7055999999998, // Fresh order ID
  name: "#1002",
  email: "test@example.com",
  line_items: [
    {
      id: 17499999999998, // Fresh line item ID
      variant_id: 4016, // Real Printful variant ID
      sku: "4016_Black", // Real SKU format
      quantity: 1,
      properties: [
        {
          name: "Original Text",
          value: "test text"
        },
        {
          name: "Japanese Text", 
          value: "テストテキスト"
        },
        {
          name: "Font Size",
          value: "medium"
        },
        {
          name: "Font Color",
          value: "#DC2626"
        },
        {
          name: "Font Style",
          value: "Cherry Bomb One"
        },
        {
          name: "Text Orientation",
          value: "horizontal"
        },
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
  ],
  shipping_address: {
    first_name: "Test",
    last_name: "User",
    address1: "123 Test St",
    city: "Test City",
    province_code: "CA",
    country_code: "US",
    zip: "12345",
    phone: "555-1234"
  },
  billing_address: {
    first_name: "Test",
    last_name: "User",
    address1: "123 Test St",
    city: "Test City",
    province_code: "CA",
    country_code: "US",
    zip: "12345"
  }
};

async function testWorkingOrder() {
  try {
    console.log('🧪 Testing with working order format...');
    console.log('📋 Order ID:', workingOrderTest.id);
    console.log('📋 Line Item ID:', workingOrderTest.line_items[0].id);
    console.log('📋 SKU:', workingOrderTest.line_items[0].sku);
    console.log('📋 Properties count:', workingOrderTest.line_items[0].properties.length);
    
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', workingOrderTest, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'working-test.myshopify.com'
      }
    });
    
    console.log('✅ Working order test response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Working order test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testWorkingOrder();
