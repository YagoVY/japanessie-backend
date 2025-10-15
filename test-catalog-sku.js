const axios = require('axios');

// Test with a catalog-style SKU (should work directly)
const catalogSkuTestOrder = {
  id: 7055999999991, // Fresh order ID
  name: "#1005",
  email: "catalog-sku@example.com",
  line_items: [
    {
      id: 17499999999991, // Fresh line item ID
      variant_id: 3990245, // Catalog variant ID
      sku: "3990245_Black_S", // Catalog-style SKU (6+ digits)
      quantity: 1,
      variant_title: "Black / S",
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
                textBlocks: [{ text: "CATALOG SKU TEST", xIn: 6, yIn: 8, anchor: 'center-baseline' }]
              }
            ],
            meta: { baseFontSizeRequested: 40, orientation: 'horizontal' }
          })
        }
      ]
    }
  ],
  shipping_address: {
    first_name: "Catalog",
    last_name: "SKU",
    address1: "456 Catalog St",
    city: "SKUville",
    province_code: "CA",
    country_code: "US",
    zip: "90210",
    phone: "555-999-0000"
  }
};

async function runCatalogSkuTest() {
  console.log(`🧪 Testing catalog-style SKU: ${catalogSkuTestOrder.line_items[0].sku}`);
  console.log(`📋 This should work directly via /catalog/variants/3990245`);
  console.log(`📋 Order ID: ${catalogSkuTestOrder.id}`);
  console.log(`📋 Line Item ID: ${catalogSkuTestOrder.line_items[0].id}`);
  console.log(`📋 Variant ID: ${catalogSkuTestOrder.line_items[0].variant_id}`);

  try {
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', catalogSkuTestOrder, {
      headers: {
        'X-Shopify-Shop-Domain': 'catalog-sku-test.myshopify.com',
        'X-Shopify-Hmac-Sha256': 'dummy_hmac'
      }
    });
    console.log('✅ Catalog SKU test response:');
    console.log(response.data);
  } catch (error) {
    console.error('❌ Catalog SKU test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

runCatalogSkuTest();
