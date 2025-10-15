const axios = require('axios');

// Simple debug test
async function debugWebhook() {
  try {
    console.log('🔍 Testing webhook endpoint...');
    
    // First test the health endpoint
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test webhook health
    const webhookHealthResponse = await axios.get('http://localhost:3000/webhooks/health');
    console.log('✅ Webhook health:', webhookHealthResponse.data);
    
    // Test with minimal order data
    const minimalOrder = {
      id: 999999999,
      email: "test@example.com",
      line_items: [
        {
          id: 888888888,
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
          sku: "4016_Black"
        }
      ]
    };
    
    console.log('🧪 Testing with minimal order data...');
    const response = await axios.post('http://localhost:3000/webhooks/shopify/orders/created', minimalOrder, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': 'debug-test.myshopify.com'
      }
    });
    
    console.log('✅ Webhook test response:', response.data);
    
  } catch (error) {
    console.error('❌ Debug test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

debugWebhook();
