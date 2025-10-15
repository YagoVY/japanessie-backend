const axios = require('axios');

// Test webhook payload with the same SKU that was failing
const testOrder = {
  id: 7055914303828,
  name: "#1001",
  email: "test@example.com",
  line_items: [
    {
      id: 17490422956372,
      variant_id: 3990245,
      sku: "3990245_474",
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
                  family: 'Yuji Syuku',
                  sizePt: 24,
                  lineHeight: 1.1,
                  letterSpacingEm: 0.12,
                  vertical: false,
                  textOrientation: 'upright',
                  hyphenPolicy: 'jp-long-vbar'
                },
                color: '#000000',
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
        sku: "3990245_474",
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

async function testWebhook() {
  try {
    console.log('🧪 Testing webhook with fixed pipeline...');
    
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', testOrder, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com'
      }
    });
    
    console.log('✅ Webhook test successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Webhook test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testWebhook();
