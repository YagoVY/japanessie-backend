import { printfulClient, PrintfulCatalogVariant } from './client';

export interface CatalogVariantResult {
  variantId: number;
  sku: string;
  name: string;
  size: string;
  color: string;
  inStock: boolean;
}

export class CatalogService {
  private client = printfulClient;

  /**
   * Resolve catalog variant ID by SKU
   * First tries exact SKU match, then falls back to search
   */
  async resolveCatalogVariantIdBySku(sku: string): Promise<number> {
    if (!sku || sku.trim() === '') {
      throw new Error('SKU is required for catalog variant resolution');
    }

    console.log(`[Catalog] Resolving variant for SKU: ${sku}`);

    try {
      // First try: exact SKU match
      const exactMatch = await this.findVariantByExactSku(sku);
      if (exactMatch) {
        console.log(`[Catalog] Found exact SKU match: ${sku} -> variant ${exactMatch.id}`);
        return exactMatch.id;
      }

      // Second try: search by SKU
      const searchMatch = await this.findVariantBySearch(sku);
      if (searchMatch) {
        console.log(`[Catalog] Found search match: ${sku} -> variant ${searchMatch.id}`);
        return searchMatch.id;
      }

      throw new Error(`Catalog variant not found for SKU: ${sku}`);
    } catch (error) {
      console.error(`[Catalog] Failed to resolve variant for SKU ${sku}:`, error);
      throw error;
    }
  }

  /**
   * Find variant by exact SKU match
   */
  private async findVariantByExactSku(sku: string): Promise<PrintfulCatalogVariant | null> {
    try {
      const response = await this.client.getCatalogVariants({
        sku: sku,
        limit: 100 // Enforce limit <= 100
      });

      if (response.variants && response.variants.length > 0) {
        // Return the first exact match
        return response.variants[0];
      }

      return null;
    } catch (error) {
      console.warn(`[Catalog] Exact SKU search failed for ${sku}:`, error);
      return null;
    }
  }

  /**
   * Find variant by search (fallback)
   */
  private async findVariantBySearch(sku: string): Promise<PrintfulCatalogVariant | null> {
    try {
      const response = await this.client.getCatalogVariants({
        search: sku,
        limit: 100 // Enforce limit <= 100
      });

      if (response.variants && response.variants.length > 0) {
        // Find the best match (exact SKU match if available)
        const exactMatch = response.variants.find(v => v.sku === sku);
        if (exactMatch) {
          return exactMatch;
        }

        // Return the first result if no exact match
        return response.variants[0];
      }

      return null;
    } catch (error) {
      console.warn(`[Catalog] Search failed for ${sku}:`, error);
      return null;
    }
  }

  /**
   * Get detailed variant information
   */
  async getVariantDetails(variantId: number): Promise<CatalogVariantResult> {
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
  async resolveMultipleSkus(skus: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const errors: string[] = [];

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
  async validateVariant(variantId: number): Promise<boolean> {
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
  async getAllVariantsForProduct(productType: string, limit: number = 100): Promise<PrintfulCatalogVariant[]> {
    const allVariants: PrintfulCatalogVariant[] = [];
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
  async searchVariants(criteria: {
    sku?: string;
    search?: string;
    size?: string;
    color?: string;
    inStock?: boolean;
    limit?: number;
  }): Promise<PrintfulCatalogVariant[]> {
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
        variants = variants.filter(v => v.size.toLowerCase().includes(criteria.size!.toLowerCase()));
      }

      if (criteria.color) {
        variants = variants.filter(v => v.color.toLowerCase().includes(criteria.color!.toLowerCase()));
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

// Export singleton instance
export const catalogService = new CatalogService();
export default CatalogService;
