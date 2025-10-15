const OrderProcessor = require('./services/order-processor');

// Test the order processor directly
const testOrderData = {
  orderId: 'test-debug-123',
  shopifyOrderId: 'test-debug-123',
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
    city: 'Test City',
    state: 'CA',
    country: 'US',
    zip: '12345'
  },
  billing: {
    name: 'Test User',
    address1: '123 Test St',
    city: 'Test City',
    state: 'CA',
    country: 'US',
    zip: '12345'
  }
};

async function testOrderProcessor() {
  try {
    console.log('🧪 Testing order processor directly...');
    
    const orderProcessor = new OrderProcessor();
    const result = await orderProcessor.processOrder(testOrderData);
    
    console.log('✅ Order processing result:', result);
    
  } catch (error) {
    console.error('❌ Order processing failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testOrderProcessor();
