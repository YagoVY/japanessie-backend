const axios = require('axios');

// Test with a real order format that should work
const realOrderTest = {
  id: 7055999999999, // Fresh order ID
  name: "#1001",
  email: "test@example.com",
  line_items: [
    {
      id: 17499999999999, // Fresh line item ID
      variant_id: 4016, // This is a real Printful variant ID for Bella+Canvas 3001
      sku: "4016_Black", // Real SKU format
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
      ],
      variant: {
        sku: "4016_Black",
        title: "Size: M / Color: Black"
      }
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

async function testRealOrder() {
  try {
    console.log('🧪 Testing with real SKU format: 4016_Black');
    console.log('📋 This should extract variant ID: 4016');
    
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', realOrderTest, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com'
      }
    });
    
    console.log('✅ Real order test successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Real order test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testRealOrder();
