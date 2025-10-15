const path = require('path');
const fs = require('fs');
const { buildIndex } = require('./catalogCache');

class CatalogService {
  constructor() {
    this._client = null;
  }

  get client() {
    if (!this._client) {
      const { printfulClient } = require('./client');
      this._client = printfulClient;
    }
    return this._client;
  }

  get variantMap() {
    if (this._map) return this._map;
    try {
      const p = path.join(process.cwd(), 'config', 'variant-map.json');
      const raw = fs.readFileSync(p, 'utf8');
      this._map = JSON.parse(raw);
    } catch {
      this._map = { bySku: {}, byShopifyVariantId: {}, byProductOptions: {} };
    }
    return this._map;
  }

  normalizeColor(s) { 
    return String(s || '').toLowerCase().replace(/\s+/g, '').replace(/[-_]/g, ''); 
  }
  
  normalizeSize(s) { 
    return String(s || '').toUpperCase().trim(); 
  }

  // Tier 2: Mapping file by SKU (exact)
  async resolveByMappingSku(sku) {
    if (!sku) return null;
    const map = this.variantMap.bySku?.[sku];
    return map ? Number(map) : null;
  }

  // Tier 3: Catalog cache by variantId parsed from SKU (leading 6+ digits)
  async resolveByCacheVariantId(sku) {
    if (!sku) return null;
    const index = buildIndex();
    
    const m = String(sku).match(/^(\d{6,})(?:[_-]|$)/);
    if (m) {
      const vid = String(m[1]);
      if (index.byVariantId.has(vid)) {
        return Number(vid);
      }
      // fallback to API verification if not in cache
      try {
        const v = await this.client.get(`/catalog/variants/${vid}`);
        if (v?.id) {
          return v.id;
        }
      } catch { /* continue */ }
    }
    return null;
  }

  // Tier 4: Cache lookup by (productId, color, size)
  async resolveByProductColorSize(ctx) {
    if (!ctx) return null;
    const productId = String(process.env.PRINTFUL_CATALOG_PRODUCT_ID || ctx.productId || '');
    if (!productId) return null;
    
    const index = buildIndex();
    const key = `${productId}|${this.normalizeColor(ctx.color)}|${this.normalizeSize(ctx.size)}`;
    const fromCache = index.byProductColorSize.get(key);
    if (fromCache) {
      return Number(fromCache);
    }

    // optional: live API fallback if not cached
    try {
      const product = await this.client.get(`/catalog/products/${productId}`);
      const hit = (product?.variants || []).find(v =>
        this.normalizeColor(v.color) === this.normalizeColor(ctx.color) &&
        this.normalizeSize(v.size) === this.normalizeSize(ctx.size)
      );
      if (hit?.id) {
        return hit.id;
      }
    } catch { /* ignore */ }
    return null;
  }

  // Tier 5: Mapping by shopifyVariantId
  async resolveByMappingShopifyVariantId(shopifyVariantId) {
    if (!shopifyVariantId) return null;
    const map = this.variantMap.byShopifyVariantId?.[String(shopifyVariantId)];
    return map ? Number(map) : null;
  }

  // Tier 6: Mapping by product options key
  async resolveByProductOptions(ctx) {
    if (!ctx) return null;
    const optKey = `product:${ctx.productHandle || 'TEE/G64000'}|color:${this.normalizeColor(ctx.color)}|size:${this.normalizeSize(ctx.size)}`;
    const map = this.variantMap.byProductOptions?.[optKey];
    return map ? Number(map) : null;
  }

  // Legacy method for backward compatibility
  async resolveCatalogVariantIdBySku(sku, ctx = {}) {
    if (!sku) throw new Error('SKU is required for variant resolution');
    
    // Try all tiers in order
    let variantId = await this.resolveByMappingSku(sku);
    if (variantId) return variantId;
    
    variantId = await this.resolveByCacheVariantId(sku);
    if (variantId) return variantId;
    
    variantId = await this.resolveByProductColorSize(ctx);
    if (variantId) return variantId;
    
    variantId = await this.resolveByMappingShopifyVariantId(ctx?.shopifyVariantId);
    if (variantId) return variantId;
    
    variantId = await this.resolveByProductOptions(ctx);
    if (variantId) return variantId;

    throw new Error(`Catalog variant not found for SKU "${sku}". Provide PRINTFUL_CATALOG_PRODUCT_ID or add a mapping in config/variant-map.json.`);
  }



  /**
   * Get detailed variant information
   */
  async getVariantDetails(variantId) {
    try {
      const variant = await this.client.getProductInfo(variantId);
      
      return {
        variantId: variant.id,
        sku: variant.sku || '',
        name: variant.name || '',
        size: variant.size || '',
        color: variant.color || '',
        inStock: variant.in_stock || false
      };
    } catch (error) {
      console.error(`[Catalog] Failed to get variant details for ${variantId}:`, error);
      throw new Error(`Failed to get variant details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch resolve multiple SKUs
   */
  async resolveMultipleSkus(skus) {
    const results = new Map();
    const errors = [];

    console.log(`[Catalog] Batch resolving ${skus.length} SKUs`);

    for (const sku of skus) {
      try {
        const variantId = await this.resolveCatalogVariantIdBySku(sku);
        results.set(sku, variantId);
      } catch (error) {
        const errorMsg = `Failed to resolve SKU ${sku}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[Catalog] ${errorMsg}`);
      }
    }

    if (errors.length > 0) {
      console.warn(`[Catalog] ${errors.length} SKUs failed to resolve:`, errors);
    }

    console.log(`[Catalog] Successfully resolved ${results.size}/${skus.length} SKUs`);
    return results;
  }

  /**
   * Validate that a variant exists and is in stock
   */
  async validateVariant(variantId) {
    try {
      const details = await this.getVariantDetails(variantId);
      return details.inStock;
    } catch (error) {
      console.error(`[Catalog] Variant validation failed for ${variantId}:`, error);
      return false;
    }
  }

  /**
   * Get all available variants for a product type (with pagination)
   */
  async getAllVariantsForProduct(productType, limit = 100) {
    const allVariants = [];
    let offset = 0;
    const maxLimit = Math.min(limit, 100); // Enforce limit <= 100

    try {
      while (true) {
        const response = await this.client.getCatalogVariants({
          search: productType,
          limit: maxLimit,
          offset
        });

        if (!response.variants || response.variants.length === 0) {
          break;
        }

        allVariants.push(...response.variants);

        // Check if we've reached the end
        if (response.variants.length < maxLimit) {
          break;
        }

        offset += maxLimit;

        // Safety check to prevent infinite loops
        if (allVariants.length >= limit) {
          break;
        }
      }

      console.log(`[Catalog] Retrieved ${allVariants.length} variants for product type: ${productType}`);
      return allVariants;
    } catch (error) {
      console.error(`[Catalog] Failed to get variants for product type ${productType}:`, error);
      throw error;
    }
  }

  /**
   * Search variants by multiple criteria
   */
  async searchVariants(criteria) {
    const limit = Math.min(criteria.limit || 20, 100); // Enforce limit <= 100

    try {
      const response = await this.client.getCatalogVariants({
        sku: criteria.sku,
        search: criteria.search,
        limit
      });

      let variants = response.variants || [];

      // Apply additional filters
      if (criteria.size) {
        variants = variants.filter(v => v.size.toLowerCase().includes(criteria.size.toLowerCase()));
      }

      if (criteria.color) {
        variants = variants.filter(v => v.color.toLowerCase().includes(criteria.color.toLowerCase()));
      }

      if (criteria.inStock !== undefined) {
        variants = variants.filter(v => v.in_stock === criteria.inStock);
      }

      console.log(`[Catalog] Found ${variants.length} variants matching criteria`);
      return variants;
    } catch (error) {
      console.error(`[Catalog] Search failed:`, error);
      throw error;
    }
  }
}

// Export singleton instance (lazy initialization)
let catalogService = null;

function getCatalogService() {
  if (!catalogService) {
    catalogService = new CatalogService();
  }
  return catalogService;
}

// Helper functions for color/size normalization
function normalizeColor(s = '') {
  return String(s).toLowerCase().trim()
    .replace('military green', 'army')        // example mapping
    .replace(/\s+/g, ' ');
}

function normalizeSize(s = '') {
  return String(s).toUpperCase().trim();
}

function pickColor(title = '') {
  const m = String(title).split('/')[0];
  return (m || '').trim();
}

function pickSize(title = '') {
  const m = String(title).split('/')[1];
  return (m || '').trim();
}

module.exports = {
  get catalogService() {
    return getCatalogService();
  },
  CatalogService
};
