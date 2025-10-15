const express = require('express');
const OrderProcessor = require('../services/order-processor');
const PrintGenerator = require('../services/print-generator');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const orderProcessor = new OrderProcessor();
const printGenerator = new PrintGenerator();

// Load non-personalized products configuration
let nonPersonalizedConfig = null;
try {
  const configPath = path.join(__dirname, '../config/non-personalized-products.json');
  nonPersonalizedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  logger.info('Non-personalized products config loaded successfully');
} catch (error) {
  logger.warn('Failed to load non-personalized products config:', error.message);
}

// Shopify order created webhook - NEW SYSTEM with multi-item support
router.post('/shopify/orders/created', async (req, res) => {
  try {
    const order = req.body;
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    
    logger.info('Received Shopify order webhook', { 
      orderId: order.id, 
      shop: shopDomain,
      totalPrice: order.total_price,
      lineItemsCount: order.line_items?.length || 0
    });
    
    // Extract design data from ALL line items
    const allDesignData = extractAllDesignData(order);
    
    if (!allDesignData || allDesignData.length === 0) {
      logger.info('No design processing needed for order', { orderId: order.id });
      return res.status(200).json({ message: 'No design processing needed' });
    }
    
    logger.info(`Order ${order.id} has ${allDesignData.length} items requiring processing`);
    
    // Respond immediately to Shopify (webhook must respond quickly)
    res.status(200).json({ 
      message: 'Order processing started',
      orderId: order.id,
      itemCount: allDesignData.length,
      status: 'queued'
    });
    
    // Process all items asynchronously (no time pressure)
    setImmediate(async () => {
      try {
        const result = await orderProcessor.processMultiItemOrder({
          orderId: order.id.toString(),
          shopifyOrderId: order.id.toString(),
          allDesignData: allDesignData,
          customer: {
            email: order.email,
            name: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
            phone: order.billing_address?.phone
          },
          shipping: {
            name: `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`.trim(),
            address1: order.shipping_address?.address1,
            address2: order.shipping_address?.address2,
            city: order.shipping_address?.city,
            state: order.shipping_address?.province_code,
            country: order.shipping_address?.country_code,
            zip: order.shipping_address?.zip,
            phone: order.shipping_address?.phone
          },
          billing: {
            name: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
            address1: order.billing_address?.address1,
            address2: order.billing_address?.address2,
            city: order.billing_address?.city,
            state: order.billing_address?.province_code,
            country: order.billing_address?.country_code,
            zip: order.billing_address?.zip
          }
        });
        
        logger.info('Multi-item order processed successfully', { 
          orderId: order.id,
          itemsProcessed: result.itemsProcessed,
          itemsFailed: result.itemsFailed,
          printfulOrderId: result.printfulOrderId
        });
      } catch (error) {
        logger.error('Async multi-item order processing failed', { 
          orderId: order.id, 
          error: error.message,
          stack: error.stack
        });
      }
    });
    
  } catch (error) {
    logger.error('Webhook processing failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint for print generation
router.post('/test-print', async (req, res) => {
  try {
    const { designParams } = req.body;
    
    if (!designParams) {
      return res.status(400).json({ error: 'designParams is required' });
    }
    
    logger.info('Testing print generation', { designParams });
    
    const result = await printGenerator.generatePrintFile(designParams);
    
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
    logger.error('Test print generation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test renderer endpoint
router.get('/test-renderer', async (req, res) => {
  try {
    const testResult = await printGenerator.testRenderer();
    
    res.json({
      success: testResult.success,
      result: testResult.success ? {
        message: 'Renderer test passed',
        testResult: testResult.testResult
      } : {
        error: testResult.error
      }
    });
    
  } catch (error) {
    logger.error('Renderer test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get order status
router.get('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const status = await orderProcessor.getProcessingStatus(orderId);
    
    if (!status) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      orderId,
      status: status.status,
      printFileUrl: status.printFile?.s3Url,
      dimensions: status.printFile?.dimensions,
      processingMetrics: status.processingMetrics,
      updatedAt: status.updatedAt
    });
    
  } catch (error) {
    logger.error('Failed to get order status:', error);
    res.status(500).json({ error: error.message });
  }
});

// List recent orders
router.get('/orders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const orders = await orderProcessor.listRecentOrders(limit);
    
    res.json({
      orders: orders.map(order => ({
        orderId: order.orderId,
        status: order.status,
        printFileUrl: order.printFile?.s3Url,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      })),
      count: orders.length
    });
    
  } catch (error) {
    logger.error('Failed to list orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const checks = await orderProcessor.healthCheck();
    
    const isHealthy = Object.values(checks).every(check => 
      typeof check === 'string' && check === 'healthy'
    );
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

/**
 * Check if a line item is a non-personalized product that should be fulfilled
 * @param {Object} lineItem - Shopify line item
 * @returns {Object|null} - Product config if it's a non-personalized product, null otherwise
 */
function isNonPersonalizedProduct(lineItem) {
  if (!nonPersonalizedConfig || !nonPersonalizedConfig.productMapping) {
    return null;
  }

  const rules = nonPersonalizedConfig.identificationRules || {};
  
  for (const [productKey, productConfig] of Object.entries(nonPersonalizedConfig.productMapping)) {
    const identifiers = productConfig.identifiers || {};
    
    // Check product_type
    if (rules.checkProductType && identifiers.productType) {
      if (lineItem.product_type && lineItem.product_type.toLowerCase() === identifiers.productType.toLowerCase()) {
        logger.info(`Matched non-personalized product by type: ${productKey}`);
        return { key: productKey, ...productConfig };
      }
    }
    
    // Check title contains
    if (rules.checkTitle && identifiers.titleContains && Array.isArray(identifiers.titleContains)) {
      const title = lineItem.title || lineItem.name || '';
      for (const keyword of identifiers.titleContains) {
        if (title.toLowerCase().includes(keyword.toLowerCase())) {
          logger.info(`Matched non-personalized product by title keyword "${keyword}": ${productKey}`);
          return { key: productKey, ...productConfig };
        }
      }
    }
    
    // Check SKU patterns if enabled
    if (rules.checkSKU && identifiers.skuPattern && lineItem.sku) {
      const skuRegex = new RegExp(identifiers.skuPattern, 'i');
      if (skuRegex.test(lineItem.sku)) {
        logger.info(`Matched non-personalized product by SKU: ${productKey}`);
        return { key: productKey, ...productConfig };
      }
    }
  }
  
  return null;
}

/**
 * Create default design data for non-personalized products
 * @param {Object} lineItem - Shopify line item
 * @param {Object} productConfig - Product configuration
 * @returns {Object} - Design data structure
 */
function createDefaultDesignData(lineItem, productConfig) {
  const defaults = nonPersonalizedConfig.defaults || {};
  
  // Create design params for preset product
  const designParams = {
    translatedText: defaults.text || '',
    originalText: defaults.text || '',
    fontStyle: defaults.fontFamily || 'Yuji Syuku',
    fontColor: defaults.color || '#000000',
    fontSize: defaults.fontSize || 40,
    orientation: defaults.orientation || 'horizontal',
    presetId: productConfig.presetId,
    productType: productConfig.productType || 'PRESET_IMAGE'
  };
  
  logger.info('Created default design data for non-personalized product', {
    lineItemId: lineItem.id,
    presetId: productConfig.presetId,
    productType: productConfig.productType
  });
  
  return {
    lineItemId: lineItem.id,
    _design_params: designParams
  };
}

/**
 * Extract design data from ALL line items in the order
 * @param {Object} order - Shopify order object
 * @returns {Array} - Array of design data objects (one per line item)
 */
function extractAllDesignData(order) {
  const allDesignData = [];
  
  for (const lineItem of order.line_items) {
    const properties = lineItem.properties || [];
    
    const designData = {};
    for (const prop of properties) {
      if (prop.name.startsWith('_')) {
        try {
          designData[prop.name] = JSON.parse(prop.value);
        } catch (e) {
          logger.warn(`Failed to parse property ${prop.name} for line item ${lineItem.id}:`, e.message);
          designData[prop.name] = prop.value;
        }
      }
    }
    
    // Look for design parameters (new system) or legacy snapshots
    if (designData._design_params || designData._layout_snapshot_v2 || designData._layout_snapshot) {
      allDesignData.push({
        lineItemId: lineItem.id,
        lineItem: lineItem,  // Include full line item for reference
        variantId: lineItem.variant_id,
        quantity: lineItem.quantity || 1,
        sku: lineItem.sku,
        title: lineItem.title,
        ...designData
      });
      continue;  // Check next item
    }
    
    // Check if this is a non-personalized product that should still be fulfilled
    const productConfig = isNonPersonalizedProduct(lineItem);
    if (productConfig) {
      logger.info('Detected non-personalized product, creating default design data', {
        lineItemId: lineItem.id,
        productKey: productConfig.key,
        presetId: productConfig.presetId
      });
      
      const defaultData = createDefaultDesignData(lineItem, productConfig);
      allDesignData.push({
        lineItemId: lineItem.id,
        lineItem: lineItem,
        variantId: lineItem.variant_id,
        quantity: lineItem.quantity || 1,
        sku: lineItem.sku,
        title: lineItem.title,
        ...defaultData
      });
    }
  }
  
  logger.info(`Extracted design data for ${allDesignData.length} out of ${order.line_items.length} line items`);
  return allDesignData;
}

/**
 * Legacy function for backward compatibility
 * Returns first item only (for single-item orders)
 */
function extractDesignData(order) {
  const allData = extractAllDesignData(order);
  return allData.length > 0 ? allData[0] : null;
}

module.exports = router;

