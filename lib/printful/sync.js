/**
 * Printful Store/Sync API Service
 * Handles resolution of sync variants (legacy store products)
 */

class SyncService {
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

  /**
   * Resolve Printful *store/sync* variant by SKU.
   * Returns sync variant object or throws.
   */
  async resolveSyncVariantBySku(sku) {
    if (!sku) throw new Error('SKU is required for sync variant resolution');
    
    console.log(`[Sync] 🔍 Resolving sync variant for SKU: ${sku}`);
    
    try {
      let totalProducts = 0;
      let totalVariants = 0;
      let page = 1;
      const limit = 100; // Printful API limit
      const maxPages = 10; // Safety guard for >500 products
      
      // Paginate through all sync products
      while (page <= maxPages) {
        console.log(`[Sync] Fetching sync products page ${page}...`);
        
        const response = await this.client.get(`/sync/products?limit=${limit}&offset=${(page - 1) * limit}`);
        const products = response?.result || response || [];
        
        if (!Array.isArray(products) || products.length === 0) {
          if (page === 1) {
            throw new Error('No sync products found');
          }
          break; // No more products
        }
        
        totalProducts += products.length;
        console.log(`[Sync] Found ${products.length} products on page ${page} (total: ${totalProducts})`);
        
        // Search through products and their variants
        for (const product of products) {
          try {
            // The client returns response.data.result with sync_product and sync_variants keys
            const productData = await this.client.get(`/sync/products/${product.id}`);
            const variants = productData?.sync_variants ?? [];
            totalVariants += variants.length;
            
            // Look for exact SKU match
            const match = variants.find(v => v.sku === sku);
            if (match) {
              console.log(`[Sync] ✅ Found sync variant: ${match.id} (${match.name || 'N/A'}) in product ${product.id}`);
              console.log(`[Sync] Scanned ${totalProducts} products, ${totalVariants} variants total`);
              return match; // includes id (sync variant id)
            }
          } catch (productError) {
            console.warn(`[Sync] Could not fetch variants for product ${product.id}:`, productError.message);
            continue;
          }
        }
        
        // Check if we've reached the end
        if (products.length < limit) {
          break; // Last page
        }
        
        page++;
      }
      
      if (page > maxPages) {
        console.warn(`[Sync] ⚠️  Reached max pages limit (${maxPages}), stopping search`);
      }
      
      console.log(`[Sync] Scanned ${totalProducts} products, ${totalVariants} variants total`);
      throw new Error(`No sync variants found for SKU: ${sku}`);
      
    } catch (error) {
      console.error(`[Sync] ❌ Failed to resolve sync variant for SKU ${sku}:`, error.message);
      throw new Error(`Sync variant resolution failed: ${error.message}`);
    }
  }

  /**
   * Get detailed sync variant information
   */
  async getSyncVariantDetails(variantId) {
    try {
      const variant = await this.client.get(`/store/variants/${variantId}`);
      
      return {
        variantId: variant.id,
        sku: variant.sku || '',
        name: variant.name || '',
        size: variant.size || '',
        color: variant.color || '',
        inStock: variant.in_stock || false
      };
    } catch (error) {
      console.error(`[Sync] Failed to get sync variant details for ${variantId}:`, error);
      throw new Error(`Failed to get sync variant details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch resolve multiple SKUs
   */
  async resolveMultipleSkus(skus) {
    const results = new Map();
    for (const sku of skus) {
      try {
        const variant = await this.resolveSyncVariantBySku(sku);
        results.set(sku, variant.id);
      } catch (error) {
        console.warn(`[Sync] Could not resolve SKU ${sku}: ${error.message}`);
        results.set(sku, null); // Indicate failure
      }
    }
    return results;
  }
}

let syncService = null;

function getSyncService() {
  if (!syncService) {
    syncService = new SyncService();
  }
  return syncService;
}

module.exports = {
  get syncService() {
    return getSyncService();
  },
  SyncService
};
