const OrderProcessor = require('./services/order-processor');

// Test the variant mapping with the real variant ID from the logs
const testOrderData = {
  orderId: `test-variant-mapping-${Date.now()}`,
  shopifyOrderId: `test-variant-mapping-${Date.now()}`,
  designData: {
    'Original Text': 'test',
    'Japanese Text': 'テスト',
    'Font Style': 'Yuji Syuku',
    'Font Color': '#000000',
    'Text Orientation': 'horizontal',
    'Font Size': 'medium'
  },
  lineItems: [{
    id: 'test-line-item',
    variant_id: 52564464435540, // Real variant ID from the logs
    quantity: 1,
    properties: [
      { name: 'Original Text', value: 'test' },
      { name: 'Japanese Text', value: 'テスト' },
      { name: 'Font Style', value: 'Yuji Syuku' },
      { name: 'Font Color', value: '#000000' },
      { name: 'Text Orientation', value: 'horizontal' },
      { name: 'Font Size', value: 'medium' }
    ]
  }],
  customer: {
    email: 'test@example.com',
    name: 'Test User'
  },
  shipping: {
    name: 'Test User',
    address1: '123 Test St',
    city: 'Los Angeles',
    state: 'CA',
    country: 'US',
    zip: '90210',
    phone: '555-1234'
  },
  billing: {
    name: 'Test User',
    address1: '123 Test St',
    city: 'Los Angeles',
    state: 'CA',
    country: 'US',
    zip: '90210'
  }
};

async function testVariantMapping() {
  try {
    console.log('🧪 Testing variant mapping with real Shopify variant ID...');
    console.log('Shopify variant ID:', testOrderData.lineItems[0].variant_id);
    
    const orderProcessor = new OrderProcessor();
    
    // Test just the variant mapping
    const variantInfo = orderProcessor.extractVariantInfo(testOrderData);
    console.log('✅ Variant mapping result:', variantInfo);
    
    // Test full order processing
    console.log('\n🧪 Testing full order processing...');
    const result = await orderProcessor.processOrder(testOrderData);
    
    console.log('✅ Order processing result:', {
      success: result.success,
      orderId: result.orderId,
      status: result.status,
      printfulOrderId: result.printfulOrderId,
      printFileUrl: result.printFileUrl ? 'Uploaded to S3' : 'Not uploaded'
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testVariantMapping();
