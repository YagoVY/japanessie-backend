const axios = require('axios');

// Test with the EXACT same format as the working order from the logs
const exactFormatOrder = {
  id: 7055999999997, // Fresh order ID
  name: "#1003",
  email: "test@example.com",
  line_items: [
    {
      id: 17499999999997, // Fresh line item ID
      variant_id: 4016, // Real Printful variant ID
      sku: "4016_Black", // Real SKU format
      quantity: 1,
      properties: [
        {
          name: "Original Text",
          value: "tetete tetetete"
        },
        {
          name: "Japanese Text", 
          value: "テテテ テテテテ"
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
          name: "_layout_snapshot",
          value: JSON.stringify({
            lines: [
              { text: "テテテ", x: 254, y: 145 },
              { text: "テテテテ", x: 239, y: 189 }
            ],
            actualFontSize: 40,
            fontFamily: "Cherry Bomb One"
          })
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
                    text: 'テテテ',
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
        },
        {
          name: "_design_data",
          value: JSON.stringify({
            originalText: "tetete tetetete",
            translatedText: "テテテ テテテテ",
            orientation: "horizontal",
            fontColor: "#DC2626",
            fontStyle: "Cherry Bomb One"
          })
        },
        {
          name: "_preview_data_url",
          value: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC+ZpjcAAAQAElEQVR4AezdC5Rkd3kY+Fs9IwZGsh..."
        },
        {
          name: "_preview_mockup_url",
          value: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAYAAAC+ZpjcAAAQAElEQVR4Aey9B7wtWVXnv7+dA6lJak..."
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

async function testExactFormat() {
  try {
    console.log('🧪 Testing with EXACT format from working order...');
    console.log('📋 Order ID:', exactFormatOrder.id);
    console.log('📋 Line Item ID:', exactFormatOrder.line_items[0].id);
    console.log('📋 SKU:', exactFormatOrder.line_items[0].sku);
    console.log('📋 Properties count:', exactFormatOrder.line_items[0].properties.length);
    console.log('📋 Has _layout_snapshot_v2:', exactFormatOrder.line_items[0].properties.some(p => p.name === '_layout_snapshot_v2'));
    
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', exactFormatOrder, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'exact-format-test.myshopify.com'
      }
    });
    
    console.log('✅ Exact format test response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Exact format test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testExactFormat();
