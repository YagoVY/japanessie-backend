const express = require('express');
const crypto = require('crypto');
const OrderProcessor = require('../services/order-processor');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const orderProcessor = new OrderProcessor();

// Load non-personalized products configuration
let nonPersonalizedConfig = null;
try {
  const configPath = path.join(__dirname, '../config/non-personalized-products.json');
  nonPersonalizedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  logger.info('Non-personalized products config loaded successfully');
} catch (error) {
  logger.warn('Failed to load non-personalized products config:', error.message);
}

// Verify Shopify webhook signature
const verifyShopifyWebhook = (req, res, next) => {
  // Temporarily disable signature verification for testing
  // TODO: Re-enable once SHOPIFY_WEBHOOK_SECRET is properly configured
  console.log('WEBHOOK: Signature verification temporarily disabled for testing');
  next();
  return;
  
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = req.body;
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  
  if (!secret) {
    console.log('WEBHOOK: No webhook secret configured, skipping verification');
    return next();
  }
  
  if (!hmac) {
    console.log('WEBHOOK: No HMAC header found');
    return res.status(401).json({ error: 'Missing HMAC signature' });
  }
  
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  
  if (hash !== hmac) {
    console.log('WEBHOOK: HMAC verification failed');
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }
  
  console.log('WEBHOOK: HMAC verification passed');
  next();
};

// Shopify order created webhook
router.post('/shopify/orders/created', 
  verifyShopifyWebhook,
  async (req, res) => {
    try {
      console.log('🔥 WEBHOOK: Order created webhook received');

      // req.body is already an object (server.js converted from raw)
      const order = req.body;
      const shopDomain = req.get('X-Shopify-Shop-Domain');
      
      // Legacy webhook - process using new system
      console.log('⚠️  Legacy webhook endpoint - processing with new system');
      
      // Debug: Log order structure
      console.log('📋 Order ID:', order.id);
      console.log('📋 Line items count:', order.line_items?.length || 0);
      
      // Debug: Log line item details for non-personalized product detection
      if (order.line_items?.[0]) {
        const lineItem = order.line_items[0];
        console.log('📋 Line Item Details:');
        console.log('   - Title:', lineItem.title);
        console.log('   - Product Type:', lineItem.product_type);
        console.log('   - SKU:', lineItem.sku);
        console.log('   - Variant ID:', lineItem.variant_id);
      }
      
      if (order.line_items?.[0]?.properties) {
        console.log('📋 Properties:', order.line_items[0].properties.map(p => ({ 
          name: p.name, 
          value: p.name === '_design_params' ? 'JSON data (see below)' : p.value?.substring(0, 100) + '...' 
        })));
        
        // Log _design_params in detail if present
        const designParamsProp = order.line_items[0].properties.find(p => p.name === '_design_params');
        if (designParamsProp) {
          try {
            const designParams = JSON.parse(designParamsProp.value);
            console.log('📦 _design_params parsed:', {
              productId: designParams.productId,
              productHandle: designParams.productHandle,
              productCategory: designParams.productCategory,
              productType: designParams.productType,
              designType: designParams.designType,
              hasText: !!designParams.translatedText || !!designParams.originalText,
              translatedText: designParams.translatedText?.substring(0, 50) || '(empty)',
              productTags: designParams.productTags
            });
          } catch (e) {
            console.log('⚠️ Failed to parse _design_params:', e.message);
          }
        }
      }
      
      // Extract design data from ALL line items
      const allDesignData = extractAllDesignData(order);
      console.log('📋 Extracted design data:', allDesignData.length, 'items');
      
      if (!allDesignData || allDesignData.length === 0) {
        logger.info('No design processing needed for order', { orderId: order.id });
        return res.status(200).json({ message: 'No design processing needed' });
      }
      
      logger.info(`Legacy webhook: Order ${order.id} has ${allDesignData.length} items requiring processing`);
      
      // Process all items asynchronously using new system
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
          
          logger.info('Multi-item order processed successfully via legacy webhook', { 
            orderId: order.id,
            itemsProcessed: result.itemsProcessed,
            itemsFailed: result.itemsFailed,
            printfulOrderId: result.printfulOrderId
          });
        } catch (error) {
          logger.error('Async multi-item order processing failed via legacy webhook', { 
            orderId: order.id, 
            error: error.message 
          });
        }
      });
      
      return res.status(200).json({ 
        message: 'Order processing started via legacy webhook',
        orderId: order.id,
        status: 'queued'
      });
      
    } catch (error) {
      logger.error('Webhook processing failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Shopify order paid webhook
router.post('/shopify/orders/paid', 
  verifyShopifyWebhook,
  async (req, res) => {
    try {
      const order = req.body;
      const shopDomain = req.get('X-Shopify-Shop-Domain');
      
      logger.info('Order paid webhook received', { 
        orderId: order.id, 
        shop: shopDomain,
        totalPrice: order.total_price
      });
      
      // Check if this order needs processing (in case it was created before payment)
      const OrderStorageService = require('../services/order-storage');
      const orderStorage = new OrderStorageService();
      const existingOrder = await orderStorage.getOrder(order.id.toString());
      
      if (!existingOrder || existingOrder.status === 'pending') {
        // Re-process the order now that it's paid
        const designData = extractDesignData(order);
        
        if (designData) {
          setImmediate(async () => {
            try {
              await orderProcessor.processOrder({
                orderId: order.id.toString(),
                shopifyOrderId: order.id.toString(),
                designData: designData,
                lineItems: order.line_items,
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
            } catch (error) {
              logger.error('Async order processing failed on payment', { 
                orderId: order.id, 
                error: error.message 
              });
            }
          });
        }
      }
      
      res.status(200).json({ message: 'Order paid webhook processed' });
      
    } catch (error) {
      logger.error('Order paid webhook failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Test endpoint for order processing
router.post('/test-order', async (req, res) => {
  try {
    const { testOrderData } = req.body;
    
    if (!testOrderData) {
      return res.status(400).json({ error: 'testOrderData is required' });
    }
    
    const result = await orderProcessor.processOrder(testOrderData);
    
    res.status(200).json({
      message: 'Test order processed successfully',
      result
    });
    
  } catch (error) {
    logger.error('Test order processing failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check if a line item is a non-personalized product that should be fulfilled
 * @param {Object} lineItem - Shopify line item
 * @param {Object} designParams - Design parameters from frontend (optional)
 * @returns {Object|null} - Product config if it's a non-personalized product, null otherwise
 */
function isNonPersonalizedProduct(lineItem, designParams = null) {
  if (!nonPersonalizedConfig || !nonPersonalizedConfig.productMapping) {
    return null;
  }

  const rules = nonPersonalizedConfig.identificationRules || {};
  
  // PRIORITY 1: Check designType for static products (most reliable)
  if (designParams?.designType) {
    const designType = designParams.designType.toLowerCase();
    
    // Static products have specific designType values
    if (designType === 'katakana_chart_mug' || 
        designType === 'preset_image' || 
        designType.includes('static')) {
      
      // Try to match to a specific product config
      for (const [productKey, productConfig] of Object.entries(nonPersonalizedConfig.productMapping)) {
        const identifiers = productConfig.identifiers || {};
        
        // Match by productCategory or productType
        if (designParams.productCategory && identifiers.productType) {
          if (designParams.productCategory.toLowerCase() === identifiers.productType.toLowerCase()) {
            logger.info(`Matched static product by designType + productCategory: ${productKey} (designType: ${designParams.designType})`);
            return { key: productKey, ...productConfig };
          }
        }
      }
      
      // If no specific match, return a generic static product config
      logger.info(`Detected static product by designType: ${designParams.designType}`);
      return {
        key: 'StaticProduct',
        productType: 'PRESET_IMAGE',
        description: 'Static product synced with Printful'
      };
    }
  }
  
  // PRIORITY 2: Check for empty text with product metadata (indicates static product)
  if (designParams && 
      (!designParams.translatedText || designParams.translatedText === '') &&
      (!designParams.originalText || designParams.originalText === '') &&
      (designParams.productCategory || designParams.productType)) {
    
    for (const [productKey, productConfig] of Object.entries(nonPersonalizedConfig.productMapping)) {
      const identifiers = productConfig.identifiers || {};
      
      // Match by productCategory
      if (designParams.productCategory && identifiers.productType) {
        if (designParams.productCategory.toLowerCase() === identifiers.productType.toLowerCase()) {
          logger.info(`Matched static product by empty text + productCategory: ${productKey}`);
          return { key: productKey, ...productConfig };
        }
      }
      
      // Match by productType
      if (designParams.productType && identifiers.productType) {
        if (designParams.productType.toLowerCase() === identifiers.productType.toLowerCase()) {
          logger.info(`Matched static product by empty text + productType: ${productKey}`);
          return { key: productKey, ...productConfig };
        }
      }
    }
  }
  
  // PRIORITY 3: Traditional matching (fallback)
  for (const [productKey, productConfig] of Object.entries(nonPersonalizedConfig.productMapping)) {
    const identifiers = productConfig.identifiers || {};
    
    // Check product_type from frontend design params
    if (rules.checkProductType && identifiers.productType && designParams?.productType) {
      if (designParams.productType.toLowerCase() === identifiers.productType.toLowerCase()) {
        logger.info(`Matched non-personalized product by frontend productType: ${productKey}`);
        return { key: productKey, ...productConfig };
      }
    }
    
    // Check productCategory from frontend design params
    if (rules.checkProductType && identifiers.productType && designParams?.productCategory) {
      if (designParams.productCategory.toLowerCase() === identifiers.productType.toLowerCase()) {
        logger.info(`Matched non-personalized product by frontend productCategory: ${productKey}`);
        return { key: productKey, ...productConfig };
      }
    }
    
    // Fallback: Check product_type from Shopify (rarely available in order webhooks)
    if (rules.checkProductType && identifiers.productType && lineItem.product_type) {
      if (lineItem.product_type.toLowerCase() === identifiers.productType.toLowerCase()) {
        logger.info(`Matched non-personalized product by Shopify type: ${productKey}`);
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
    let hasDesignProperties = false;
    
    for (const prop of properties) {
      if (prop.name.startsWith('_')) {
        // Handle JSON properties like _design_params, _layout_snapshot_v2
        try {
          designData[prop.name] = JSON.parse(prop.value);
        } catch (e) {
          logger.warn(`Failed to parse property ${prop.name} for line item ${lineItem.id}:`, e.message);
          designData[prop.name] = prop.value;
        }
      } else if (['Original Text', 'Japanese Text', 'Font Style', 'Font Color', 'Text Orientation', 'Font Size'].includes(prop.name)) {
        // Handle individual design properties
        hasDesignProperties = true;
        designData[prop.name] = prop.value;
      }
    }
    
    // Look for design parameters (new system) or legacy snapshots or individual properties
    if (designData._design_params || designData._layout_snapshot_v2 || designData._layout_snapshot || hasDesignProperties) {
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
    // Pass _design_params if available (even though we didn't find design data, it might have product metadata)
    const productConfig = isNonPersonalizedProduct(lineItem, designData._design_params);
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
module.exports = router;