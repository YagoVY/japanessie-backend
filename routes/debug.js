const express = require('express');
const PrintGenerator = require('../services/print-generator');
const S3StorageService = require('../services/s3-storage');
const logger = require('../utils/logger');

const router = express.Router();

// Debug endpoint to test print generation
router.post('/test-render', async (req, res) => {
  try {
    const { designParams, options = {} } = req.body;
    
    if (!designParams) {
      return res.status(400).json({ error: 'designParams is required' });
    }
    
    const printGenerator = new PrintGenerator();
    const result = await printGenerator.generatePrintFile(designParams, options);
    
    res.json({
      success: true,
      result: {
        dimensions: result.dimensions,
        s3Url: result.s3Url,
        bufferSize: result.printBuffer.length,
        generatedAt: result.metadata.generatedAt
      }
    });
    
  } catch (error) {
    logger.error('Test render failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Debug endpoint to test print generator
router.get('/test-print-generator', async (req, res) => {
  try {
    const printGenerator = new PrintGenerator();
    const testResult = await printGenerator.testRenderer();
    
    res.json({
      success: testResult.success,
      message: testResult.success ? 'Print generator test passed' : 'Print generator test failed',
      result: testResult.success ? testResult.testResult : { error: testResult.error }
    });
    
  } catch (error) {
    logger.error('Print generator test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug endpoint to test S3 connectivity
router.get('/test-s3', async (req, res) => {
  try {
    const s3Storage = new S3StorageService();
    
    // Test S3 connectivity by trying to list objects
    const testKey = 'test-connectivity.txt';
    const testBuffer = Buffer.from('S3 connectivity test');
    
    // Upload test file
    const uploadUrl = await s3Storage.uploadBuffer(
      testKey, 
      testBuffer, 
      'text/plain', 
      { test: 'true', timestamp: new Date().toISOString() }
    );
    
    // Check if file exists
    const exists = await s3Storage.fileExists('test-connectivity', 'test-connectivity');
    
    res.json({
      success: true,
      uploadUrl,
      fileExists: exists,
      bucketName: process.env.S3_BUCKET_NAME,
      region: process.env.AWS_REGION
    });
    
  } catch (error) {
    logger.error('S3 test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      bucketName: process.env.S3_BUCKET_NAME,
      region: process.env.AWS_REGION
    });
  }
});

// Debug endpoint to test Printful connectivity
router.get('/test-printful', async (req, res) => {
  try {
    const printfulClient = new PrintfulClient();
    
    // Test Printful connectivity by getting available variants
    const variants = await printfulClient.getAvailableVariants();
    
    res.json({
      success: true,
      variantsCount: variants.length,
      sampleVariants: variants.slice(0, 5).map(v => ({
        id: v.id,
        name: v.name,
        size: v.size,
        color: v.color
      })),
      apiKey: process.env.PRINTFUL_API_KEY ? 'configured' : 'missing',
      storeId: process.env.PRINTFUL_STORE_ID ? 'configured' : 'missing'
    });
    
  } catch (error) {
    logger.error('Printful test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      apiKey: process.env.PRINTFUL_API_KEY ? 'configured' : 'missing',
      storeId: process.env.PRINTFUL_STORE_ID ? 'configured' : 'missing'
    });
  }
});

// Debug endpoint to test complete pipeline
router.post('/test-pipeline', async (req, res) => {
  try {
    const { testOrderData } = req.body;
    
    if (!testOrderData) {
      return res.status(400).json({ error: 'testOrderData is required' });
    }
    
    const OrderProcessor = require('../services/order-processor');
    const orderProcessor = new OrderProcessor();
    
    const result = await orderProcessor.processOrder(testOrderData);
    
    res.json({
      success: true,
      result
    });
    
  } catch (error) {
    logger.error('Pipeline test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Debug endpoint to get system information
router.get('/system-info', (req, res) => {
  try {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      services: {
        mongodb: process.env.MONGODB_URI ? 'configured' : 'missing',
        aws: {
          region: process.env.AWS_REGION,
          bucket: process.env.S3_BUCKET_NAME,
          accessKey: process.env.AWS_ACCESS_KEY_ID ? 'configured' : 'missing'
        },
        shopify: {
          webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET ? 'configured' : 'missing',
          storeUrl: process.env.SHOPIFY_STORE_URL
        },
        printful: {
          apiKey: process.env.PRINTFUL_API_KEY ? 'configured' : 'missing',
          storeId: process.env.PRINTFUL_STORE_ID
        }
      }
    };
    
    res.json(systemInfo);
    
  } catch (error) {
    logger.error('System info failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug endpoint to generate sample design data
router.get('/sample-data', (req, res) => {
  try {
    const sampleDesignParams = {
      text: 'テスト',
      fontFamily: 'Yuji Syuku',
      fontSize: 40,
      color: '#FFFFFF',
      orientation: 'horizontal'
    };
    
    const sampleOrderData = {
      orderId: `test-${Date.now()}`,
      shopifyOrderId: `test-${Date.now()}`,
      designData: {
        _design_params: sampleDesignParams
      },
      lineItems: [{
        id: 'test-line-item',
        title: 'Custom Japanese T-Shirt',
        variant_title: 'M / Black',
        quantity: 1,
        price: '29.99',
        properties: [
          {
            name: "_design_params",
            value: JSON.stringify(sampleDesignParams)
          },
          {
            name: "Original Text",
            value: "test"
          },
          {
            name: "Japanese Text", 
            value: "テスト"
          },
          {
            name: "Font Style",
            value: "Yuji Syuku"
          },
          {
            name: "Font Color",
            value: "#FFFFFF"
          },
          {
            name: "Text Orientation",
            value: "horizontal"
          }
        ]
      }],
      customer: {
        email: 'test@example.com',
        name: 'Test Customer',
        phone: '+1234567890'
      },
      shipping: {
        name: 'Test Customer',
        address1: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        country: 'US',
        zip: '12345',
        phone: '+1234567890'
      },
      billing: {
        name: 'Test Customer',
        address1: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        country: 'US',
        zip: '12345'
      }
    };
    
    res.json({
      sampleDesignParams,
      sampleOrderData,
      usage: {
        testRender: 'POST /debug/test-render with { designParams: sampleDesignParams }',
        testOrder: 'POST /print-webhooks/shopify/orders/created with sampleOrderData'
      }
    });
    
  } catch (error) {
    logger.error('Sample data generation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
