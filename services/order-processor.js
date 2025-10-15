require('dotenv').config();

const PrintGenerator = require('./print-generator');
const S3StorageService = require('./s3-storage');
const OrderStorageService = require('./order-storage');
const PrintfulClient = require('./printful-client');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class OrderProcessor {
  constructor() {
    this.printGenerator = new PrintGenerator();
    this.s3Storage = new S3StorageService();
    this.orderStorage = new OrderStorageService();
    this.printfulClient = new PrintfulClient();
    this.presetMapping = this.loadPresetMapping();
  }

  loadPresetMapping() {
    try {
      const configPath = path.join(__dirname, '../config/preset-mapping.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Load all mapping structures
      const shopifyToPrintful = config.shopify_to_printful_variants || {};
      const presetFallbacks = config.preset_fallbacks || {};
      const presetMetadata = config.preset_product_variants || {};
      
      // Filter out comment entries (keys starting with underscore or "comment")
      const cleanedVariantMapping = {};
      for (const [key, value] of Object.entries(shopifyToPrintful)) {
        if (!key.startsWith('_') && !key.startsWith('comment')) {
          cleanedVariantMapping[key] = value;
        }
      }
      
      logger.info('Preset mapping configuration loaded successfully', {
        variantMappingCount: Object.keys(cleanedVariantMapping).length,
        presetFallbackCount: Object.keys(presetFallbacks).length,
        presetMetadataCount: Object.keys(presetMetadata).length
      });
      
      return {
        variantMapping: cleanedVariantMapping,
        presetFallbacks: presetFallbacks,
        presetMetadata: presetMetadata
      };
    } catch (error) {
      logger.warn('Failed to load preset mapping configuration:', error.message);
      return {
        variantMapping: {},
        presetFallbacks: {},
        presetMetadata: {}
      };
    }
  }

  async processOrder(orderData) {
    const startTime = Date.now();
    const orderId = orderData.orderId;
    
    try {
      logger.info(`Starting order processing for ${orderId}`);
      
      // Create initial order record
      const initialOrderData = {
        orderId,
        shopifyOrderId: orderData.shopifyOrderId || orderId,
        status: 'processing',
        designData: orderData.designData,
        customer: orderData.customer,
        shipping: orderData.shipping,
        processingMetrics: {
          startedAt: new Date().toISOString(),
          processingTimeMs: null
        },
        createdAt: new Date().toISOString()
      };
      
      // Try to save order record, but don't fail if S3 is not configured
      try {
        await this.orderStorage.saveOrder(initialOrderData);
      } catch (s3Error) {
        logger.warn(`S3 not configured, skipping order storage: ${s3Error.message}`);
      }
      
      // 1. Extract design parameters from order data
      const designParams = this.extractDesignParams(orderData);
      logger.info(`Extracted design parameters for order ${orderId}`, { designParams });
      
      // Check if this is a static non-personalized product (no customization needed)
      // Simple check: if productType or productCategory is "Mugs" (or other static categories)
      const staticProductTypes = ['Mugs', 'Mug'];
      const isStaticProduct = 
        staticProductTypes.includes(designParams.productMetadata?.productType) ||
        staticProductTypes.includes(designParams.productMetadata?.productCategory);
      
      if (isStaticProduct) {
        console.log('🎯 Static product detected by product type:', {
          productType: designParams.productMetadata?.productType,
          productCategory: designParams.productMetadata?.productCategory
        });
      }
      
      let printResult = null;
      let printfulOrder = null;
      let printfulOrderId = null;
      
      if (isStaticProduct) {
        // Static product - skip print generation, create Printful order using synced variant
        logger.info(`Static product detected for order ${orderId}, forwarding to Printful`);
        
        try {
          // Extract variant information from order data
          const variantInfo = this.extractVariantInfo(orderData);
          const lineItem = orderData.lineItems?.[0] || orderData.line_items?.[0];
          
          logger.info(`Creating Printful order for synced product`, {
            orderId,
            shopifyVariantId: lineItem?.variant_id,
            sku: lineItem?.sku
          });
          
          // For static products, use the Shopify variant ID (external_variant_id in Printful)
          printfulOrder = await this.printfulClient.createStaticProductOrder({
            shopifyOrderId: orderId,
            shopifyVariantId: lineItem?.variant_id,
            quantity: variantInfo.quantity,
            shipping: orderData.shipping,
            customer: orderData.customer
          });
          printfulOrderId = printfulOrder.id;
          
          logger.info(`Printful order created successfully for static product`, { 
            orderId, 
            printfulOrderId
          });
        } catch (printfulError) {
          logger.error(`Printful static order creation failed for ${orderId}:`, printfulError.message);
          throw printfulError;
        }
        
        // Update order status for static product
        const finalOrderData = {
          ...initialOrderData,
          status: 'sent_to_printful',
          productType: 'static',
          printfulOrder: {
            id: printfulOrderId,
            status: printfulOrder.status,
            createdAt: printfulOrder.created_at
          },
          designParams,
          productMetadata: designParams.productMetadata || null, // Store product metadata for analytics
          processingMetrics: {
            ...initialOrderData.processingMetrics,
            completedAt: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime
          },
          updatedAt: new Date().toISOString()
        };
        
        try {
          await this.orderStorage.saveOrder(finalOrderData);
        } catch (s3Error) {
          logger.warn(`S3 not configured, skipping final order storage: ${s3Error.message}`);
        }
        
        logger.info(`Static product order completed for ${orderId}`, {
          processingTimeMs: Date.now() - startTime
        });
        
        return {
          success: true,
          orderId,
          status: 'sent_to_printful',
          productType: 'static',
          printfulOrderId,
          processingTimeMs: Date.now() - startTime
        };
      }
      
      // 2. Generate high-resolution print file using Puppeteer (for custom products)
      logger.info(`Generating print file for order ${orderId}`);
      
      // Check if this is a preset product with customization
      if (this.printGenerator.isPresetProduct(designParams)) {
        logger.info(`Processing preset product for order ${orderId}`);
        
        // Get preset ID from design parameters for background fetch
        const presetId = designParams.presetId;
        
        if (!presetId) {
          logger.warn(`No preset ID found for preset product, falling back to text-only`);
          printResult = await this.printGenerator.generatePrintFile(designParams, { orderId });
        } else {
          logger.info(`Using preset ID ${presetId} for background fetch`);
          printResult = await this.printGenerator.generatePresetPrintFile(designParams, { 
            orderId
          });
        }
      } else {
        logger.info(`Processing custom product for order ${orderId}`);
        printResult = await this.printGenerator.generatePrintFile(designParams, { orderId });
      }
      
      // 3. Create Printful draft order with the generated print file
      logger.info(`Creating Printful draft order for ${orderId}`);
      
      if (printResult.s3Url) {
        try {
          // Get the line item for quantity and variant info
          const lineItem = orderData.lineItems?.[0] || orderData.line_items?.[0];
          const quantity = lineItem?.quantity || 1;
          
          // For Shopify-integrated Printful stores, use Shopify variant ID directly
          // This is simpler and works because Printful maintains the Shopify sync
          const shopifyVariantId = designParams.shopifyVariantId || lineItem?.variant_id;
          
          if (shopifyVariantId) {
            logger.info(`Using Shopify variant ID for Printful order`, {
              shopifyVariantId: shopifyVariantId,
              presetId: designParams.presetId || 'none',
              productType: designParams.productType || 'custom'
            });
          } else {
            logger.warn(`No Shopify variant ID found, using fallback variant mapping`);
          }
          
          const printfulOrderData = {
            shopifyOrderId: orderId,
            shipping: orderData.shipping,
            customer: orderData.customer,
            shopifyVariantId: shopifyVariantId,  // Use Shopify variant ID directly
            quantity: quantity
          };
          
          printfulOrder = await this.printfulClient.createDraftOrder(printfulOrderData, printResult.s3Url);
          printfulOrderId = printfulOrder.id;
          
          logger.info(`Printful draft order created successfully`, { 
            orderId, 
            printfulOrderId,
            printFileUrl: printResult.s3Url 
          });
        } catch (printfulError) {
          logger.error(`Printful draft order creation failed for ${orderId}:`, printfulError.message);
          // Continue processing even if Printful fails
        }
      } else {
        logger.warn(`No S3 URL available for order ${orderId}, skipping Printful integration`);
      }
      
      // 4. Update order status and store final result
      const finalOrderData = {
        ...initialOrderData,
        status: printfulOrderId ? 'sent_to_printful' : 'ready_for_review',
        printFile: {
          s3Url: printResult.s3Url,
          dimensions: printResult.dimensions,
          bufferSize: printResult.printBuffer.length
        },
        printfulOrder: printfulOrder ? {
          id: printfulOrderId,
          status: printfulOrder.status,
          createdAt: printfulOrder.created_at
        } : null,
        designParams,
        productMetadata: designParams.productMetadata || null, // Store product metadata for analytics
        processingMetrics: {
          ...initialOrderData.processingMetrics,
          completedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime
        },
        updatedAt: new Date().toISOString()
      };
      
      // Try to save final order record, but don't fail if S3 is not configured
      try {
        await this.orderStorage.saveOrder(finalOrderData);
      } catch (s3Error) {
        logger.warn(`S3 not configured, skipping final order storage: ${s3Error.message}`);
      }
      
      logger.info(`Order processing completed for ${orderId}`, {
        processingTimeMs: Date.now() - startTime,
        printFileUrl: printResult.s3Url,
        status: 'ready_for_review'
      });
      
      return {
        success: true,
        orderId,
        status: printfulOrderId ? 'sent_to_printful' : 'ready_for_review',
        printFileUrl: printResult.s3Url,
        printfulOrderId,
        dimensions: printResult.dimensions,
        processingTimeMs: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error(`Order processing failed for ${orderId}`, { error: error.message });
      
      // Update order status to failed
      try {
        const failedOrderData = {
          orderId,
          status: 'failed',
          error: error.message,
          processingMetrics: {
            startedAt: new Date().toISOString(),
            failedAt: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime
          },
          updatedAt: new Date().toISOString()
        };
        await this.orderStorage.saveOrder(failedOrderData);
      } catch (updateError) {
        logger.warn(`S3 not configured, skipping failed order storage: ${updateError.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Process an order with multiple line items
   * Generates print files for all items and creates ONE Printful order
   * @param {Object} orderData - Complete order data with all line items
   * @returns {Promise<Object>} - Processing result with success/failure counts
   */
  async processMultiItemOrder(orderData) {
    const { orderId, allDesignData, shipping, customer } = orderData;
    const startTime = Date.now();
    
    logger.info(`Processing multi-item order ${orderId} with ${allDesignData.length} items`);
    
    const printResults = [];
    const failures = [];
    
    // Step 1: Generate print files for ALL items sequentially
    // (Parallel processing can be added in Phase 2 for performance)
    for (let i = 0; i < allDesignData.length; i++) {
      const designData = allDesignData[i];
      
      try {
        logger.info(`Generating print file for item ${i + 1}/${allDesignData.length}`, {
          lineItemId: designData.lineItemId,
          title: designData.title
        });
        
        // Extract design parameters for this item
        const designParams = this.extractDesignParamsFromData(designData);
        
        // Check if this is a static product (no print file needed)
        if (this.isStaticProduct(designParams)) {
          logger.info(`Item ${designData.lineItemId} is static product, skipping print generation`);
          
          printResults.push({
            lineItemId: designData.lineItemId,
            variantId: designData.variantId,
            shopifyVariantId: designParams.shopifyVariantId || designData.variantId,
            quantity: designData.quantity,
            requiresPrintFile: false,
            designParams: designParams
          });
          
          continue;
        }
        
        // Generate print file based on product type
        let printResult;
        
        if (this.printGenerator.isPresetProduct(designParams)) {
          logger.info(`Generating preset print file for item ${designData.lineItemId}`);
          printResult = await this.printGenerator.generatePresetPrintFile(designParams, {
            orderId: orderId,
            lineItemId: designData.lineItemId
          });
        } else {
          logger.info(`Generating custom print file for item ${designData.lineItemId}`);
          printResult = await this.printGenerator.generatePrintFile(designParams, {
            orderId: orderId,
            lineItemId: designData.lineItemId
          });
        }
        
        if (printResult.success && printResult.s3Url) {
          printResults.push({
            lineItemId: designData.lineItemId,
            variantId: designData.variantId,
            shopifyVariantId: designParams.shopifyVariantId || designData.variantId,
            quantity: designData.quantity,
            printFileUrl: printResult.s3Url,
            requiresPrintFile: true,
            designParams: designParams
          });
          
          logger.info(`✅ Item ${i + 1}/${allDesignData.length} processed successfully`);
        } else {
          throw new Error('Print generation failed: No S3 URL returned');
        }
        
      } catch (error) {
        logger.error(`❌ Failed to process item ${designData.lineItemId}:`, error.message);
        
        failures.push({
          lineItemId: designData.lineItemId,
          title: designData.title,
          error: error.message
        });
      }
    }
    
    // Step 2: Check if we have any successful items
    if (printResults.length === 0) {
      logger.error(`All ${allDesignData.length} items failed to process for order ${orderId}`);
      throw new Error(`All ${allDesignData.length} items failed to process`);
    }
    
    if (failures.length > 0) {
      logger.warn(`${failures.length} out of ${allDesignData.length} items failed`, {
        failures: failures
      });
    }
    
    logger.info(`Successfully generated ${printResults.length} print files, creating Printful order`);
    
    // Step 3: Create ONE Printful order with ALL successful items
    const printfulItems = printResults.map(result => {
      const item = {
        external_variant_id: result.shopifyVariantId.toString(),
        quantity: result.quantity
      };
      
      // Add files only if this item requires a print file
      if (result.requiresPrintFile && result.printFileUrl) {
        item.files = [{
          url: result.printFileUrl,
          type: 'default'
        }];
      }
      
      return item;
    });
    
    const printfulOrderData = {
      recipient: {
        name: shipping.name,
        address1: shipping.address1,
        address2: shipping.address2,
        city: shipping.city,
        state_code: shipping.state,
        country_code: shipping.country,
        zip: shipping.zip,
        phone: shipping.phone,
        email: customer.email
      },
      items: printfulItems,
      external_id: orderId.toString().replace(/[^0-9]/g, ''),
      shipping: 'STANDARD'
    };
    
    logger.info(`Creating Printful order with ${printfulItems.length} items`, {
      orderId: orderId,
      items: printfulItems.map(i => ({
        variantId: i.external_variant_id,
        quantity: i.quantity,
        hasFile: !!i.files
      }))
    });
    
    // Create the Printful order
    let printfulOrder;
    try {
      const response = await this.printfulClient.createMultiItemOrder(printfulOrderData);
      printfulOrder = response;
      
      logger.info(`✅ Printful order created successfully`, {
        printfulOrderId: printfulOrder.id,
        itemsIncluded: printfulItems.length
      });
      
    } catch (printfulError) {
      logger.error(`Printful order creation failed for ${orderId}:`, printfulError.message);
      throw printfulError;
    }
    
    // Step 4: Return processing result
    const result = {
      success: true,
      orderId: orderId,
      printfulOrderId: printfulOrder.id,
      itemsProcessed: printResults.length,
      itemsFailed: failures.length,
      processingTimeMs: Date.now() - startTime,
      items: printResults.map(r => ({
        lineItemId: r.lineItemId,
        printFileUrl: r.printFileUrl,
        requiresPrintFile: r.requiresPrintFile
      })),
      failures: failures
    };
    
    logger.info(`Multi-item order processing completed for ${orderId}`, {
      processingTimeMs: result.processingTimeMs,
      successCount: result.itemsProcessed,
      failureCount: result.itemsFailed
    });
    
    return result;
  }

  /**
   * Check if product is a static product (no print file generation needed)
   */
  isStaticProduct(designParams) {
    if (!designParams) return false;
    
    const staticTypes = ['Mugs', 'Mug', 'katakana_chart_mug'];
    return staticTypes.includes(designParams.productMetadata?.productType) ||
           staticTypes.includes(designParams.productMetadata?.productCategory) ||
           staticTypes.includes(designParams.productType);
  }

  /**
   * Extract design parameters from design data object
   * (Used for multi-item processing where we already have the design data)
   */
  extractDesignParamsFromData(designData) {
    if (designData._design_params) {
      const frontendParams = designData._design_params;
      
      return {
        text: frontendParams.translatedText || frontendParams.originalText || '',
        fontFamily: frontendParams.fontStyle || 'Yuji Syuku',
        color: frontendParams.fontColor || '#000000',
        orientation: frontendParams.orientation || 'horizontal',
        fontSize: frontendParams.fontSize || 40,
        letterSpacing: frontendParams.letterSpacing || null,
        
        shopifyVariantId: frontendParams.shopifyVariantId || null,
        variantSku: frontendParams.variantSku || null,
        variantTitle: frontendParams.variantTitle || null,
        
        productMetadata: {
          productId: frontendParams.productId || null,
          productHandle: frontendParams.productHandle || null,
          productCategory: frontendParams.productCategory || null,
          productTags: frontendParams.productTags || [],
          productType: frontendParams.productType || null,
          designType: frontendParams.designType || null
        },
        
        textCoordinates: frontendParams.textCoordinates || null,
        presetId: frontendParams.presetId || null,
        productType: frontendParams.productType || null
      };
    }
    
    // Fallback for legacy data structures
    return {
      text: '',
      fontFamily: 'Yuji Syuku',
      color: '#000000',
      orientation: 'horizontal',
      fontSize: 40
    };
  }

  extractDesignParams(orderData) {
    // Extract design parameters from order properties
    // Look for _design_params instead of _layout_snapshot
    const designData = orderData.designData || {};
    
    console.log('🔍 Order processor - designData keys:', Object.keys(designData));
    console.log('🔍 Order processor - lineItems:', orderData.lineItems?.length || 0);
    console.log('🔍 Order processor - line_items:', orderData.line_items?.length || 0);
    
    // Try to extract from _design_params first
    if (designData._design_params) {
      console.log('✅ Found _design_params:', designData._design_params);
      
      // Map frontend parameter names to renderer parameter names
      const frontendParams = designData._design_params;
      const rendererParams = {
        text: frontendParams.translatedText || frontendParams.originalText || '',
        fontFamily: frontendParams.fontStyle || 'Yuji Syuku',
        color: frontendParams.fontColor || '#000000',
        orientation: frontendParams.orientation || 'horizontal',
        fontSize: frontendParams.fontSize || 40,
        letterSpacing: frontendParams.letterSpacing || null,  // Extract letterSpacing from frontend
        
        // NEW: Extract variant information from frontend
        shopifyVariantId: frontendParams.shopifyVariantId || null,
        variantSku: frontendParams.variantSku || null,
        variantTitle: frontendParams.variantTitle || null,
        
        // Extract product metadata from frontend
        productMetadata: {
          productId: frontendParams.productId || null,
          productHandle: frontendParams.productHandle || null,
          productCategory: frontendParams.productCategory || null,
          productTags: frontendParams.productTags || [],
          productType: frontendParams.productType || null,
          designType: frontendParams.designType || null  // NEW: designType for product classification
        }
      };
      
      // Log product metadata if present
      if (frontendParams.productId || frontendParams.productCategory || frontendParams.productType) {
        console.log('📦 Product metadata from frontend:', {
          productId: frontendParams.productId,
          productHandle: frontendParams.productHandle,
          productCategory: frontendParams.productCategory,
          productType: frontendParams.productType,
          designType: frontendParams.designType,
          productTags: frontendParams.productTags
        });
      }
      
      // CRITICAL FIX: Include textCoordinates if they exist
      if (frontendParams.textCoordinates) {
        rendererParams.textCoordinates = frontendParams.textCoordinates;
        console.log('✅ INCLUDED textCoordinates in renderer params:', {
          coordinatesCount: frontendParams.textCoordinates.coordinates?.length || 0,
          printArea: frontendParams.textCoordinates.printArea,
          source: frontendParams.textCoordinates.source || 'unknown'
        });
      } else {
        console.log('⚠️ No textCoordinates found in _design_params');
      }
      
      // NEW: Include preset information if it exists
      if (frontendParams.presetId) {
        rendererParams.presetId = frontendParams.presetId;
        console.log('✅ INCLUDED presetId in renderer params:', frontendParams.presetId);
      }
      
      // NEW: Log letterSpacing if present
      if (frontendParams.letterSpacing !== undefined && frontendParams.letterSpacing !== null) {
        console.log('✅ INCLUDED letterSpacing in renderer params:', frontendParams.letterSpacing);
      } else {
        console.log('ℹ️ No letterSpacing found in frontend params (using default)');
      }
      
      // NEW: Log actual fontSize from frontend
      if (frontendParams.fontSize !== undefined && frontendParams.fontSize !== null) {
        console.log('✅ INCLUDED actual fontSize from frontend:', frontendParams.fontSize + 'px');
      } else {
        console.log('ℹ️ No fontSize found in frontend params (using default 40px)');
      }
      
      if (frontendParams.productType) {
        rendererParams.productType = frontendParams.productType;
        console.log('✅ INCLUDED productType in renderer params:', frontendParams.productType);
      }
      
      // NEW: Check if this is a preset product based on frontend data
      if (frontendParams.productType === 'preset_image' && frontendParams.presetId) {
        console.log('🎨 Detected preset product from frontend:', {
          productType: frontendParams.productType,
          presetId: frontendParams.presetId
        });
      }
      
      console.log('🔄 Mapped to renderer params:', rendererParams);
      return rendererParams;
    }
    
    // Fallback: extract from individual properties
    const lineItem = orderData.lineItems?.[0] || orderData.line_items?.[0];
    console.log('🔍 Order processor - lineItem:', lineItem ? 'Found' : 'Not found');
    console.log('🔍 Order processor - lineItem properties:', lineItem?.properties?.length || 0);
    
    if (!lineItem?.properties) {
      throw new Error('No design parameters found in order');
    }
    
    const params = {};
    for (const prop of lineItem.properties) {
      console.log('🔍 Order processor - processing property:', prop.name, '=', prop.value?.substring(0, 50) + '...');
      switch (prop.name) {
        case 'Original Text':
          params.text = prop.value;
          break;
        case 'Japanese Text':
          params.text = prop.value; // Use Japanese text as primary
          break;
        case 'Font Style':
          params.fontFamily = prop.value;
          break;
        case 'Font Color':
          params.color = prop.value;
          break;
        case 'Text Orientation':
          params.orientation = prop.value;
          break;
        case 'Font Size':
          // Convert size string to number
          const sizeMap = { 'small': 24, 'medium': 40, 'large': 60 };
          params.fontSize = sizeMap[prop.value] || 40;
          break;
      }
    }
    
    // Set defaults
    params.fontFamily = params.fontFamily || 'Yuji Syuku';
    params.color = params.color || '#000000';
    params.orientation = params.orientation || 'horizontal';
    params.fontSize = params.fontSize || 40;
    
    if (!params.text) {
      throw new Error('No text content found in design parameters');
    }
    
    console.log('✅ Order processor - extracted params:', params);
    return params;
  }

  extractVariantInfo(orderData, designParams = null) {
    // Extract variant information from order data
    let variantId = 4016; // Global fallback: M Black T-shirt
    let quantity = 1;
    let shopifyVariantId = null;
    let selectionMethod = 'global_fallback';
    
    // Extract line item data first
    const lineItem = orderData.lineItems?.[0] || orderData.line_items?.[0];
    if (lineItem) {
      quantity = lineItem.quantity || 1;
      shopifyVariantId = lineItem.variant_id;
    }
    
    // PRIORITY 1: Try exact Shopify variant mapping from designParams
    // Frontend now sends the exact variant the user selected
    if (designParams && designParams.shopifyVariantId) {
      const shopifyId = designParams.shopifyVariantId.toString();
      const mappedVariant = this.presetMapping.variantMapping[shopifyId];
      
      if (mappedVariant) {
        variantId = mappedVariant;
        selectionMethod = 'shopify_variant_from_designParams';
        
        logger.info(`PRIORITY 1: Using Shopify variant from designParams`, {
          shopifyVariantId: shopifyId,
          printfulVariantId: variantId,
          source: 'designParams.shopifyVariantId'
        });
        
        return {
          variantId,
          quantity,
          shopifyVariantId,
          selectionMethod,
          presetId: designParams.presetId || null
        };
      } else {
        logger.debug(`Shopify variant ${shopifyId} from designParams not in mapping, trying other methods`);
      }
    }
    
    // PRIORITY 2: Try preset fallback (for preset products when exact variant not mapped)
    if (designParams && designParams.productType === 'preset_image' && designParams.presetId) {
      const fallbackVariant = this.presetMapping.presetFallbacks[designParams.presetId];
      
      if (fallbackVariant) {
        variantId = fallbackVariant;
        selectionMethod = 'preset_fallback';
        
        logger.info(`PRIORITY 2: Using preset fallback for ${designParams.presetId}`, {
          presetId: designParams.presetId,
          printfulVariantId: variantId,
          reason: 'Exact Shopify variant not in mapping'
        });
        
        return {
          variantId,
          quantity,
          shopifyVariantId,
          selectionMethod,
          presetId: designParams.presetId
        };
      } else {
        logger.warn(`Preset ID ${designParams.presetId} not found in fallback mapping`);
      }
    }
    
    // PRIORITY 3: Try legacy Shopify variant mapping from line item
    if (shopifyVariantId) {
      const legacyMapped = this.mapShopifyToPrintfulVariant(shopifyVariantId);
      if (legacyMapped) {
        variantId = legacyMapped;
        selectionMethod = 'legacy_shopify_mapping';
        
        logger.info(`PRIORITY 3: Using legacy Shopify variant mapping`, {
          shopifyVariantId: shopifyVariantId,
          printfulVariantId: variantId
        });
        
        return {
          variantId,
          quantity,
          shopifyVariantId,
          selectionMethod
        };
      }
    }
    
    // PRIORITY 4: Try SKU-based mapping
    if (lineItem && lineItem.sku) {
      const skuParts = lineItem.sku.split('_');
      if (skuParts.length >= 2) {
        const skuVariantId = parseInt(skuParts[0]);
        if (skuVariantId) {
          const skuMapped = this.mapShopifyToPrintfulVariant(skuVariantId);
          if (skuMapped) {
            variantId = skuMapped;
            selectionMethod = 'sku_based';
            
            logger.info(`PRIORITY 4: Using SKU-based mapping`, {
              sku: lineItem.sku,
              printfulVariantId: variantId
            });
            
            return {
              variantId,
              quantity,
              shopifyVariantId,
              selectionMethod
            };
          }
        }
      }
    }
    
    // PRIORITY 5: Global fallback
    logger.warn(`All variant mapping methods failed, using global fallback`, {
      defaultVariantId: variantId,
      shopifyVariantId: shopifyVariantId,
      designParamsProvided: !!designParams
    });
    
    return {
      variantId,
      quantity,
      shopifyVariantId,
      selectionMethod
    };
  }

  mapShopifyToPrintfulVariant(shopifyVariantId) {
    // Mapping table: Shopify variant ID -> Printful variant ID
    // This should be updated based on your actual product catalog
    const variantMapping = {
      // Real Shopify -> Printful mappings from your store
      '52564464435540': 4016, // Real variant from order 7057440899412 -> M Black
      '52564464435541': 4017, // L Black
      '52564464435542': 4018, // XL Black
      '52564464435543': 4019, // XXL Black
      '52564464435544': 4020, // XXXL Black
      // Add more mappings as you discover them
    };
    
    // Try exact match first
    if (variantMapping[shopifyVariantId]) {
      return variantMapping[shopifyVariantId];
    }
    
    // Try string match (in case of type conversion issues)
    if (variantMapping[shopifyVariantId.toString()]) {
      return variantMapping[shopifyVariantId.toString()];
    }
    
    // No mapping found - return null to use default
    return null;
  }

  async getProcessingStatus(orderId) {
    return await this.orderStorage.getOrder(orderId);
  }

  async listRecentOrders(limit = 50) {
    return await this.orderStorage.listOrders(limit);
  }

  async getStats() {
    return await this.orderStorage.getOrderStats();
  }

  // Health check method
  async healthCheck() {
    const checks = {};
    
    try {
      // Check S3 connectivity
      const { HeadBucketCommand } = require('@aws-sdk/client-s3');
      await this.s3Storage.s3Client.send(new HeadBucketCommand({ 
        Bucket: process.env.S3_BUCKET_NAME 
      }));
      checks.s3 = 'healthy';
    } catch (error) {
      checks.s3 = `error: ${error.message}`;
    }
    
    try {
      // Check print generator
      const testResult = await this.printGenerator.testRenderer();
      checks.printGenerator = testResult.success ? 'healthy' : `error: ${testResult.error}`;
    } catch (error) {
      checks.printGenerator = `error: ${error.message}`;
    }
    
    return checks;
  }
}

module.exports = OrderProcessor;