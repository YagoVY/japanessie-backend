const axios = require('axios');

// Test the complete pipeline with all fixes applied
const completePipelineTestOrder = {
  id: 7055999999990, // Fresh order ID
  name: "#1006",
  email: "complete-pipeline@example.com",
  line_items: [
    {
      id: 17499999999990, // Fresh line item ID
      variant_id: 17008, // Legacy variant ID
      sku: "17008_Black", // Legacy SKU that should map to catalog variant
      quantity: 1,
      variant_title: "Black / S", // Color and size info
      product_id: 12345,
      properties: [
        { name: "Color", value: "Black" },
        { name: "Size", value: "S" },
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
                textBlocks: [{ text: "COMPLETE PIPELINE TEST", xIn: 6, yIn: 8, anchor: 'center-baseline' }]
              }
            ],
            meta: { baseFontSizeRequested: 40, orientation: 'horizontal' }
          })
        }
      ]
    }
  ],
  shipping_address: {
    first_name: "Complete",
    last_name: "Pipeline",
    address1: "123 Complete St",
    city: "Pipelineville",
    province_code: "CA",
    country_code: "US",
    zip: "90210",
    phone: "555-000-1111"
  }
};

async function runCompletePipelineTest() {
  console.log('🧪 Testing complete pipeline with all fixes applied...');
  console.log(`📋 Order ID: ${completePipelineTestOrder.id}`);
  console.log(`📋 Line Item ID: ${completePipelineTestOrder.line_items[0].id}`);
  console.log(`📋 SKU: ${completePipelineTestOrder.line_items[0].sku}`);
  console.log(`📋 Variant Title: ${completePipelineTestOrder.line_items[0].variant_title}`);
  console.log(`📋 Properties: Color=${completePipelineTestOrder.line_items[0].properties.find(p => p.name === 'Color')?.value}, Size=${completePipelineTestOrder.line_items[0].properties.find(p => p.name === 'Size')?.value}`);
  
  console.log('\n🔧 Expected behavior:');
  console.log('1. ✅ Trust proxy warnings should be gone');
  console.log('2. ✅ Font warnings should be reduced (if TTF files exist)');
  console.log('3. ✅ Catalog resolution should work via mapping table');
  console.log('4. ✅ Complete pipeline: render → S3 → Printful order');
  
  try {
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', completePipelineTestOrder, {
      headers: {
        'X-Shopify-Shop-Domain': 'complete-pipeline-test.myshopify.com',
        'X-Shopify-Hmac-Sha256': 'dummy_hmac'
      }
    });
    console.log('\n✅ Complete pipeline test response:');
    console.log(response.data);
  } catch (error) {
    console.error('\n❌ Complete pipeline test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

runCompletePipelineTest();
