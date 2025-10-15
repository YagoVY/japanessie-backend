const axios = require('axios');

// Test with the enhanced catalog resolver
const enhancedCatalogTestOrder = {
  id: 7055999999992, // Fresh order ID
  name: "#1004",
  email: "enhanced-catalog@example.com",
  line_items: [
    {
      id: 17499999999992, // Fresh line item ID
      variant_id: 17008, // Legacy variant ID
      sku: "17008_Black", // Legacy SKU that should map to catalog variant
      quantity: 1,
      variant_title: "Black / S", // Color and size info
      product_id: 12345,
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
                  family: "Yuji Syuku",
                  sizePt: 32,
                  lineHeight: 1.1,
                  letterSpacingEm: 0,
                  vertical: false,
                  textOrientation: 'upright',
                  hyphenPolicy: 'jp-long-vbar'
                },
                color: "#000000",
                align: { h: 'center', v: 'baseline' },
                textBlocks: [{ text: "ENHANCED CATALOG TEST", xIn: 6, yIn: 8, anchor: 'center-baseline' }]
              }
            ],
            meta: { baseFontSizeRequested: 40, orientation: 'horizontal' }
          })
        }
      ]
    }
  ],
  shipping_address: {
    first_name: "Enhanced",
    last_name: "Catalog",
    address1: "789 Enhanced Ave",
    city: "Catalogville",
    province_code: "CA",
    country_code: "US",
    zip: "90210",
    phone: "555-777-8888"
  }
};

async function runEnhancedCatalogTest() {
  console.log(`🧪 Testing enhanced catalog resolver with legacy SKU: ${enhancedCatalogTestOrder.line_items[0].sku}`);
  console.log(`📋 This should now work via mapping table: ${enhancedCatalogTestOrder.line_items[0].sku} → 3990245`);
  console.log(`📋 Order ID: ${enhancedCatalogTestOrder.id}`);
  console.log(`📋 Line Item ID: ${enhancedCatalogTestOrder.line_items[0].id}`);
  console.log(`📋 Variant ID: ${enhancedCatalogTestOrder.line_items[0].variant_id}`);
  console.log(`📋 Variant Title: ${enhancedCatalogTestOrder.line_items[0].variant_title}`);

  try {
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', enhancedCatalogTestOrder, {
      headers: {
        'X-Shopify-Shop-Domain': 'enhanced-catalog-test.myshopify.com',
        'X-Shopify-Hmac-Sha256': 'dummy_hmac'
      }
    });
    console.log('✅ Enhanced catalog test response:');
    console.log(response.data);
  } catch (error) {
    console.error('❌ Enhanced catalog test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

runEnhancedCatalogTest();
