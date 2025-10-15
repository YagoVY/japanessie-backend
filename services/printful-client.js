const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

// DEPRECATED: This service is being replaced by the new V2 pipeline
// See lib/printful/client.ts, lib/printful/catalog.ts, lib/printful/orders.ts

class PrintfulClient {
  constructor() {
    this.apiKey = process.env.PRINTFUL_API_KEY;
    this.storeId = process.env.PRINTFUL_STORE_ID;
    this.baseUrl = 'https://api.printful.com';
    this.syncVariantCache = {}; // Cache for Shopify variant ID → Printful sync variant ID
    
    // Load preset background configuration
    try {
      const presetConfig = require('../config/preset-backgrounds.json');
      this.presetBackgrounds = presetConfig.preset_backgrounds;
      console.log('✅ Loaded preset backgrounds:', Object.keys(this.presetBackgrounds));
    } catch (error) {
      console.warn('Could not load preset backgrounds config:', error.message);
      this.presetBackgrounds = {};
    }
    
    // NOTE: Sync variant cache building disabled for Shopify-integrated stores
    // For Shopify integration, we use external_variant_id directly (no cache needed)
    // Uncomment below if you have a Manual Order Platform Printful store:
    // this.buildSyncVariantCache().catch(err => {
    //   console.warn('[Printful] Failed to build sync variant cache:', err.message);
    // });
  }

  async uploadDesignFromS3(s3Url, filename) {
    // Since Printful's /files endpoint was removed, we'll return the S3 URL directly
    // and use it in the order creation
    try {
      // Return a mock file object that contains the S3 URL
      // This will be used directly in the order creation
      return {
        id: s3Url, // Use S3 URL as the file ID
        url: s3Url,
        filename: filename,
        type: 'default'
      };
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`Printful file upload failed: ${errorMessage}`);
      throw new Error(`Printful upload failed: ${errorMessage}`);
    }
  }

  async createStaticProductOrder(orderData) {
    // For static/synced products, create order using external_variant_id
    // This references the Shopify variant that's synced with Printful
    
    console.log('[PrintfulClient] Creating order for synced product:', {
      shopifyOrderId: orderData.shopifyOrderId,
      shopifyVariantId: orderData.shopifyVariantId
    });

    const orderRequest = {
      recipient: {
        name: orderData.shipping.name,
        address1: orderData.shipping.address1,
        address2: orderData.shipping.address2,
        city: orderData.shipping.city,
        state_code: orderData.shipping.state,
        country_code: orderData.shipping.country,
        zip: orderData.shipping.zip,
        phone: orderData.shipping.phone,
        email: orderData.customer.email
      },
      items: [{
        external_variant_id: orderData.shopifyVariantId.toString(), // Use Shopify variant ID
        quantity: orderData.quantity || 1
      }],
      external_id: orderData.shopifyOrderId.toString(),
      shipping: 'STANDARD'
    };

    console.log('[PrintfulClient] Order request:', JSON.stringify(orderRequest, null, 2));

    try {
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        orderRequest,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 45000
        }
      );
      
      console.log('[PrintfulClient] Static product order created successfully:', response.data.result.id);
      return response.data.result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      const statusCode = error.response?.status;
      
      console.error(`[PrintfulClient] Static product order creation failed (${statusCode}):`, errorMessage);
      console.error('[PrintfulClient] Error response:', JSON.stringify(error.response?.data, null, 2));
      throw new Error(`Static product order creation failed: ${errorMessage}`);
    }
  }

  /**
   * Get Printful sync variant ID from Shopify variant ID
   * @param {string|number} shopifyVariantId - The Shopify variant ID (external_id in Printful)
   * @returns {Promise<number|null>} - The Printful sync variant ID
   */
  async getSyncVariantId(shopifyVariantId) {
    const variantIdStr = shopifyVariantId.toString();
    
    // Check cache first for performance
    if (this.syncVariantCache[variantIdStr]) {
      console.log(`[Printful] Using cached sync variant: ${this.syncVariantCache[variantIdStr]} for Shopify variant: ${variantIdStr}`);
      return this.syncVariantCache[variantIdStr];
    }
    
    try {
      console.log(`[Printful] Looking up sync variant for Shopify variant: ${variantIdStr}`);
      
      // Get all store products and search for the variant
      const productsResponse = await axios.get(
        `${this.baseUrl}/store/products`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 15000
        }
      );
      
      const products = productsResponse.data?.result || [];
      console.log(`[Printful] Searching through ${products.length} synced products...`);
      
      // Search through all products for the variant
      for (const product of products) {
        try {
          // Get detailed product info with variants
          const detailsResponse = await axios.get(
            `${this.baseUrl}/store/products/${product.id}`,
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`
              },
              timeout: 10000
            }
          );
          
          const syncProduct = detailsResponse.data?.result?.sync_product;
          const syncVariants = detailsResponse.data?.result?.sync_variants || [];
          
          // Find variant with matching external_id
          const matchingVariant = syncVariants.find(v => 
            v.external_id && v.external_id.toString() === variantIdStr
          );
          
          if (matchingVariant) {
            const syncVariantId = matchingVariant.id;
            console.log(`[Printful] Found sync variant: ${syncVariantId} for Shopify variant: ${variantIdStr}`, {
              productName: syncProduct?.name,
              variantName: matchingVariant.name
            });
            
            // Cache the result
            this.syncVariantCache[variantIdStr] = syncVariantId;
            return syncVariantId;
          }
          
          // Rate limiting - wait between requests
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (productError) {
          console.debug(`[Printful] Error fetching product ${product.id}:`, productError.message);
          continue;
        }
      }
      
      console.warn(`[Printful] No sync variant found for Shopify variant: ${variantIdStr}`);
      return null;
      
    } catch (error) {
      console.error(`[Printful] Error getting sync variant for ${variantIdStr}:`, error.message);
      return null;
    }
  }

  /**
   * Build a cache of Shopify variant IDs to Printful sync variant IDs
   * Run this once when server starts or periodically to refresh
   * @returns {Promise<Object>} - Map of Shopify variant ID → Sync variant ID
   */
  async buildSyncVariantCache() {
    try {
      console.log('[Printful] Building sync variant cache...');
      
      // Get all synced products
      const productsResponse = await axios.get(
        `${this.baseUrl}/store/products`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 30000
        }
      );
      
      const products = productsResponse.data?.result || [];
      console.log(`[Printful] Found ${products.length} synced products, building cache...`);
      
      let cachedCount = 0;
      
      // For each product, get detailed variant info
      for (const product of products) {
        try {
          const detailsResponse = await axios.get(
            `${this.baseUrl}/store/products/${product.id}`,
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`
              },
              timeout: 15000
            }
          );
          
          const syncVariants = detailsResponse.data?.result?.sync_variants || [];
          
          // Map Shopify external_id to sync variant id
          syncVariants.forEach(variant => {
            if (variant.external_id) {
              this.syncVariantCache[variant.external_id.toString()] = variant.id;
              cachedCount++;
            }
          });
          
          // Rate limiting - wait between requests to avoid API throttling
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (productError) {
          console.error(`[Printful] Error fetching product ${product.id}:`, productError.message);
          continue;
        }
      }
      
      console.log(`[Printful] Sync variant cache built successfully: ${cachedCount} variants cached`);
      return this.syncVariantCache;
      
    } catch (error) {
      console.error('[Printful] Error building sync variant cache:', error.message);
      return {};
    }
  }

  /**
   * Create Printful order with multiple items
   * @param {Object} orderData - Order data with items array already formatted for Printful
   * @returns {Promise<Object>} - Printful order result
   */
  async createMultiItemOrder(orderData) {
    try {
      const itemCount = orderData.items?.length || 0;
      console.log(`[PrintfulClient] Creating order with ${itemCount} items`);
      
      // Validate order data
      if (!orderData.recipient) {
        throw new Error('Missing recipient information');
      }
      
      if (!orderData.items || orderData.items.length === 0) {
        throw new Error('No items in order');
      }
      
      // Log each item for debugging
      orderData.items.forEach((item, index) => {
        console.log(`[PrintfulClient] Item ${index + 1}:`, {
          variantId: item.external_variant_id || item.sync_variant_id || item.variant_id,
          quantity: item.quantity,
          hasFiles: !!item.files
        });
      });
      
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000  // Longer timeout for multi-item orders
        }
      );
      
      console.log(`[PrintfulClient] ✅ Multi-item order created successfully: ${response.data.result.id}`);
      return response.data.result;
      
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      const statusCode = error.response?.status;
      
      console.error(`[PrintfulClient] Multi-item order creation failed (${statusCode}):`, errorMessage);
      console.error('[PrintfulClient] Full error response:', JSON.stringify(error.response?.data, null, 2));
      throw new Error(`Printful multi-item order creation failed: ${errorMessage}`);
    }
  }

  async createDraftOrder(orderData, printFileUrl) {
    // Create Printful draft order (for review before fulfillment)
    // For Shopify-integrated stores, use external_variant_id (Shopify variant ID)
    
    if (!orderData.shopifyVariantId && !orderData.syncVariantId && !orderData.printfulVariantId) {
      throw new Error('Missing variant ID (shopifyVariantId, syncVariantId, or printfulVariantId required)');
    }
    
    const item = {
      quantity: orderData.quantity || 1,
      files: [{
        url: printFileUrl, // Use the S3 URL directly
        type: 'default'
      }]
    };
    
    // Priority order for Shopify-integrated Printful stores:
    // 1. external_variant_id (Shopify variant) - BEST for Shopify integration
    // 2. sync_variant_id - For manual order platform stores
    // 3. variant_id - For catalog products (fallback)
    
    if (orderData.shopifyVariantId) {
      item.external_variant_id = orderData.shopifyVariantId.toString();
      console.log('[PrintfulClient] Using external_variant_id (Shopify variant):', orderData.shopifyVariantId);
    } else if (orderData.syncVariantId) {
      item.sync_variant_id = orderData.syncVariantId;
      console.log('[PrintfulClient] Using sync_variant_id:', orderData.syncVariantId);
    } else {
      item.variant_id = orderData.printfulVariantId || 4016;
      console.log('[PrintfulClient] Using catalog variant_id:', item.variant_id);
    }
    
    const orderRequest = {
      recipient: {
        name: orderData.shipping.name,
        address1: orderData.shipping.address1,
        address2: orderData.shipping.address2,
        city: orderData.shipping.city,
        state_code: orderData.shipping.state,
        country_code: orderData.shipping.country,
        zip: orderData.shipping.zip,
        phone: orderData.shipping.phone,
        email: orderData.customer.email
      },
      items: [item],
      external_id: orderData.shopifyOrderId.toString().replace(/[^0-9]/g, ''),
      shipping: 'STANDARD' // Default shipping method
    };

    console.log('[PrintfulClient] Creating draft order:', {
      shopifyVariantId: orderData.shopifyVariantId || null,
      syncVariantId: orderData.syncVariantId || null,
      catalogVariantId: orderData.printfulVariantId || null,
      printFileUrl: printFileUrl
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        orderRequest,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 45000
        }
      );
      
      console.log('[PrintfulClient] Draft order created successfully:', response.data.result.id);
      return response.data.result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      const statusCode = error.response?.status;
      
      console.error(`[PrintfulClient] Draft order creation failed (${statusCode}):`, errorMessage);
      console.error('[PrintfulClient] Full error response:', JSON.stringify(error.response?.data, null, 2));
      throw new Error(`Draft order creation failed: ${errorMessage}`);
    }
  }

  async createOrderWithDesign(orderData) {
    // Create Printful order directly (for immediate fulfillment)
    const orderRequest = {
      recipient: {
        name: orderData.shipping.name,
        address1: orderData.shipping.address1,
        address2: orderData.shipping.address2,
        city: orderData.shipping.city,
        state_code: orderData.shipping.state,
        country_code: orderData.shipping.country,
        zip: orderData.shipping.zip,
        phone: orderData.shipping.phone,
        email: orderData.customer.email
      },
      items: [{
        variant_id: orderData.printfulVariantId,
        quantity: orderData.quantity,
        files: [{
          url: orderData.fileId, // Use the S3 URL directly
          type: 'default'
        }]
      }],
      external_id: orderData.shopifyOrderId.toString().replace(/[^a-zA-Z0-9-_]/g, '_')
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        orderRequest,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 45000
        }
      );
      
      return response.data.result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      const statusCode = error.response?.status;
      
      console.error(`Printful order creation failed (${statusCode}):`, errorMessage);
      throw new Error(`Order creation failed: ${errorMessage}`);
    }
  }

  getVariantId(size, color, productType = 'unisex-staple-t-shirt') {
    // Map Shopify size/color to Printful variant IDs (Bella + Canvas 3001)
    const variantMap = {
      'unisex-staple-t-shirt': {
        'XS-Black': 9527, 'S-Black': 4016, 'M-Black': 4017, 'L-Black': 4018,
        'XL-Black': 4019, 'XXL-Black': 4020, 'XXXL-Black': 5295,
        'XS-White': 24351, 'S-White': 24352, 'M-White': 24353, 'L-White': 24354,
        'XL-White': 24355, 'XXL-White': 24356, 'XXXL-White': 24357,
        'XS-Navy': 9546, 'S-Navy': 4111, 'M-Navy': 4112, 'L-Navy': 4113,
        'XL-Navy': 4114, 'XXL-Navy': 4115, 'XXXL-Navy': 12874
      }
    };
    
    const key = `${size}-${color}`;
    const variantId = variantMap[productType]?.[key];
    
    if (!variantId) {
      throw new Error(`Unknown variant combination: ${productType} ${key}`);
    }
    
    return variantId;
  }

  /**
   * Fetch background image from S3 based on preset ID
   * @param {string} presetId - The preset identifier (e.g., "wave-vertical")
   * @returns {Promise<string>} - Local file path to downloaded background image
   */
  async fetchBackgroundImageFromS3(presetId) {
    try {
      console.log(`[PrintfulClient] Fetching background image for preset: ${presetId}`);
      
      // Step 1: Get background URL from preset mapping
      const backgroundUrl = this.presetBackgrounds[presetId];
      if (!backgroundUrl) {
        throw new Error(`No background URL found for preset: ${presetId}`);
      }
      
      console.log(`[PrintfulClient] Background URL: ${backgroundUrl}`);
      
      // Step 2: Download the background image from S3
      const downloadResponse = await axios.get(backgroundUrl, {
        responseType: 'stream',
        timeout: 60000
      });
      
      // Step 3: Create temporary file path
      const tempDir = os.tmpdir();
      const filename = `background-${presetId}-${Date.now()}.png`;
      const tempFilePath = path.join(tempDir, filename);
      
      // Step 4: Save to temporary file
      const writer = fs.createWriteStream(tempFilePath);
      downloadResponse.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`[PrintfulClient] Background image saved to: ${tempFilePath}`);
          resolve(tempFilePath);
        });
        writer.on('error', (error) => {
          console.error(`[PrintfulClient] Error saving background image:`, error);
          reject(error);
        });
      });
      
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      console.error(`[PrintfulClient] Failed to fetch background image for preset ${presetId}:`, errorMessage);
      throw new Error(`Background image fetch failed: ${errorMessage}`);
    }
  }

  /**
   * Get Printful sync variant ID from Shopify variant ID
   * @param {string|number} shopifyVariantId - Shopify variant ID
   * @returns {Promise<number|null>} - Printful sync variant ID
   */
  async getSyncVariantIdFromShopifyVariant(shopifyVariantId) {
    try {
      const shopifyIdStr = shopifyVariantId.toString();
      console.log(`[PrintfulClient] Looking up sync variant for Shopify variant: ${shopifyIdStr}`);
      
      // Get all sync products to find the one that contains this variant
      const response = await axios.get(
        `${this.baseUrl}/sync/products`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 30000
        }
      );
      
      const syncProducts = response.data.result;
      console.log(`[PrintfulClient] Found ${syncProducts.length} sync products to search`);
      
      // Search through sync products to find the one with matching Shopify variant
      for (const syncProduct of syncProducts) {
        console.log(`[PrintfulClient] Checking sync product: ${syncProduct.name} (ID: ${syncProduct.id})`);
        
        if (syncProduct.sync_variants && Array.isArray(syncProduct.sync_variants)) {
          const matchingVariant = syncProduct.sync_variants.find(variant => 
            variant.external_id === shopifyIdStr || 
            variant.external_id === shopifyVariantId ||
            variant.external_id == shopifyVariantId
          );
          
          if (matchingVariant) {
            console.log(`[PrintfulClient] ✅ Found matching sync variant:`, {
              syncVariantId: matchingVariant.id,
              externalId: matchingVariant.external_id,
              syncProductName: syncProduct.name,
              sku: matchingVariant.sku
            });
            return matchingVariant.id;
          }
        }
      }
      
      console.log(`[PrintfulClient] ❌ No sync variant found for Shopify variant: ${shopifyVariantId}`);
      return null;
      
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      console.error(`[PrintfulClient] Failed to lookup sync variant for Shopify variant ${shopifyVariantId}:`, errorMessage);
      throw new Error(`Sync variant lookup failed: ${errorMessage}`);
    }
  }

  /**
   * Get Printful sync product ID from Shopify variant ID
   * @param {string} shopifyVariantId - Shopify variant ID
   * @returns {Promise<string>} - Printful sync product ID
   */
  async getSyncProductIdFromVariant(shopifyVariantId) {
    try {
      console.log(`[PrintfulClient] Looking up sync product for Shopify variant: ${shopifyVariantId}`);
      
      // Get all sync products to find the one that contains this variant
      const response = await axios.get(
        `${this.baseUrl}/sync/products`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 30000
        }
      );
      
      const syncProducts = response.data.result;
      console.log(`[PrintfulClient] Found ${syncProducts.length} sync products`);
      
      // Search through sync products to find the one with matching variant
      for (const syncProduct of syncProducts) {
        if (syncProduct.variants && Array.isArray(syncProduct.variants)) {
          const matchingVariant = syncProduct.variants.find(variant => 
            variant.external_id === shopifyVariantId || 
            variant.id === shopifyVariantId ||
            variant.sku === shopifyVariantId
          );
          
          if (matchingVariant) {
            console.log(`[PrintfulClient] Found matching variant in sync product:`, {
              syncProductId: syncProduct.id,
              syncProductName: syncProduct.name,
              variantId: matchingVariant.id,
              variantExternalId: matchingVariant.external_id,
              variantSku: matchingVariant.sku
            });
            return syncProduct.id;
          }
        }
      }
      
      console.log(`[PrintfulClient] No sync product found for Shopify variant: ${shopifyVariantId}`);
      return null;
      
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      console.error(`[PrintfulClient] Failed to lookup sync product for variant ${shopifyVariantId}:`, errorMessage);
      throw new Error(`Sync product lookup failed: ${errorMessage}`);
    }
  }

  /**
   * Check if a preset ID exists in the mapping
   * @param {string} presetId - The preset identifier
   * @returns {boolean} - True if preset exists
   */
  isPresetProduct(presetId) {
    return presetId && this.presetMapping.hasOwnProperty(presetId);
  }

  /**
   * Get all available preset IDs
   * @returns {string[]} - Array of preset IDs
   */
  getAvailablePresets() {
    return Object.keys(this.presetMapping);
  }

  async getOrderStatus(printfulOrderId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/orders/${printfulOrderId}`,
        { headers: { 
          'Authorization': `Bearer ${this.apiKey}`
        } }
      );
      
      return response.data.result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      const statusCode = error.response?.status;
      
      console.error(`Failed to get Printful order status (${statusCode}):`, errorMessage);
      throw new Error(`Failed to get order status: ${errorMessage}`);
    }
  }

  async cancelOrder(printfulOrderId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/orders/${printfulOrderId}`,
        { headers: { 
          'Authorization': `Bearer ${this.apiKey}`
        } }
      );
      
      return response.data.result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      const statusCode = error.response?.status;
      
      console.error(`Failed to cancel Printful order (${statusCode}):`, errorMessage);
      throw new Error(`Failed to cancel order: ${errorMessage}`);
    }
  }

  async getShippingRates(orderData) {
    try {
      const shippingRequest = {
        recipient: {
          country_code: orderData.shipping.country,
          state_code: orderData.shipping.state,
          city: orderData.shipping.city,
          zip: orderData.shipping.zip
        },
        items: [{
          variant_id: orderData.printfulVariantId,
          quantity: orderData.quantity
        }]
      };

      const response = await axios.post(
        `${this.baseUrl}/shipping/rates`,
        shippingRequest,
        { headers: { 
          'Authorization': `Bearer ${this.apiKey}`
        } }
      );
      
      return response.data.result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      const statusCode = error.response?.status;
      
      console.error(`Failed to get shipping rates (${statusCode}):`, errorMessage);
      throw new Error(`Failed to get shipping rates: ${errorMessage}`);
    }
  }

  async validateAddress(address) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/countries`,
        { country_code: address.country },
        { headers: { 
          'Authorization': `Bearer ${this.apiKey}`
        } }
      );
      
      return response.data.result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      const statusCode = error.response?.status;
      
      console.error(`Address validation failed (${statusCode}):`, errorMessage);
      throw new Error(`Address validation failed: ${errorMessage}`);
    }
  }

  async getProductInfo(variantId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/products/variant/${variantId}`,
        { headers: { 
          'Authorization': `Bearer ${this.apiKey}`
        } }
      );
      
      return response.data.result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      const statusCode = error.response?.status;
      
      console.error(`Failed to get product info (${statusCode}):`, errorMessage);
      throw new Error(`Failed to get product info: ${errorMessage}`);
    }
  }

  // Helper method to extract size and color from Shopify variant title
  extractVariantOptions(variantTitle) {
    if (!variantTitle) return { size: 'M', color: 'Black' };
    
    const parts = variantTitle.split(' / ');
    let size = 'M';
    let color = 'Black';
    
    for (const part of parts) {
      if (part.toLowerCase().includes('size')) {
        size = part.split(': ')[1] || part.split(' / ')[0];
      } else if (part.toLowerCase().includes('color')) {
        color = part.split(': ')[1] || part.split(' / ')[0];
      }
    }
    
    return { size, color };
  }

  // Get available product variants
  async getAvailableVariants(productType = 'unisex-staple-t-shirt') {
    try {
      const response = await axios.get(
        `${this.baseUrl}/products`,
        { headers: { 
          'Authorization': `Bearer ${this.apiKey}`
        } }
      );
      
      const products = response.data.result;
      const targetProduct = products.find(p => p.name.toLowerCase().includes(productType.toLowerCase()));
      
      if (!targetProduct) {
        throw new Error(`Product type ${productType} not found`);
      }
      
      return targetProduct.variants;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message;
      const statusCode = error.response?.status;
      
      console.error(`Failed to get available variants (${statusCode}):`, errorMessage);
      throw new Error(`Failed to get variants: ${errorMessage}`);
    }
  }
}

module.exports = PrintfulClient;
