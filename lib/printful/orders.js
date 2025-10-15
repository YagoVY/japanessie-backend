class OrderService {
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
   * Find existing order by external ID
   */
  async findOrderByExternalId(externalId) {
    try {
      console.log(`[Orders] Looking for existing order with external ID: ${externalId}`);
      const order = await this.client.getOrderByExternalId(externalId);
      
      // Check if order exists and has an id (some APIs return empty objects)
      if (order && order.id) {
        console.log(`[Orders] Found existing order: ${order.id} (status: ${order.status})`);
        return order;
      } else {
        console.log(`[Orders] No existing order found for external ID: ${externalId}`);
        return null;
      }
    } catch (error) {
      console.error(`[Orders] Failed to find order by external ID ${externalId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new draft order
   */
  async createDraftOrder(orderData) {
    try {
      console.log(`[Orders] Creating draft order for external ID: ${orderData.externalId}`);
      
      const createRequest = {
        external_id: orderData.externalId,
        shipping: orderData.shipping,
        recipient: orderData.recipient
      };

      const order = await this.client.createOrder(createRequest);
      console.log(`[Orders] Created draft order: ${order.id}`);
      
      return order;
    } catch (error) {
      console.error(`[Orders] Failed to create draft order:`, error);
      throw error;
    }
  }

  /**
   * Create a new draft order with catalog item included
   */
  async createDraftOrderWithCatalogItem({ externalId, shipping, recipient, item }) {
    try {
      console.log(`[Orders] Creating draft order with catalog item for external ID: ${externalId}`);
      
      const createRequest = {
        external_id: externalId,
        shipping,
        recipient,
        items: [
          {
            variant_id: item.variantId,
            quantity: item.quantity || 1,
            files: [{ type: 'default', url: item.s3PrintUrl }],
            placements: [
              {
                placement: 'front_large',
                layers: [{ type: 'file', url: item.s3PrintUrl, position: { area: 'default' } }]
              }
            ],
            external_id: item.externalLineItemId
          }
        ]
      };

      const order = await this.client.post('/orders', createRequest);
      console.log(`[Orders] Created draft order with catalog item: ${order.id}`);
      
      return order;
    } catch (error) {
      console.error(`[Orders] Failed to create draft order with catalog item:`, error);
      throw error;
    }
  }

  /**
   * Create a new draft order with sync item included
   */
  async createDraftOrderWithSyncItem({ externalId, shipping, recipient, item }) {
    try {
      console.log(`[Orders] Creating draft order with sync item for external ID: ${externalId}`);
      
      const createRequest = {
        external_id: externalId,
        shipping,
        recipient,
        items: [
          {
            sync_variant_id: item.syncVariantId,
            quantity: item.quantity || 1,
            files: [{ type: 'default', url: item.s3PrintUrl }],
            external_id: item.externalLineItemId
          }
        ]
      };

      const order = await this.client.post('/orders', createRequest);
      console.log(`[Orders] Created draft order with sync item: ${order.id}`);
      
      return order;
    } catch (error) {
      console.error(`[Orders] Failed to create draft order with sync item:`, error);
      throw error;
    }
  }

  /**
   * Ensure draft order exists (create if not found)
   */
  async ensureDraftOrder(orderData) {
    try {
      // First, try to find existing order
      let order = await this.findOrderByExternalId(orderData.externalId);
      
      if (!order) {
        // Create new draft order
        order = await this.createDraftOrder(orderData);
      } else if (order.status !== 'draft') {
        console.warn(`[Orders] Order ${order.id} is not in draft status (${order.status}), creating new draft`);
        // Create new draft order with different external ID
        const newExternalId = `${orderData.externalId}-${Date.now()}`;
        order = await this.createDraftOrder({
          ...orderData,
          externalId: newExternalId
        });
      }
      
      return order;
    } catch (error) {
      console.error(`[Orders] Failed to ensure draft order:`, error);
      throw error;
    }
  }

  /**
   * Add sync item with file to order (legacy store/sync products)
   */
  async addOrUpdateSyncItem(orderId, { syncVariantId, quantity, s3PrintUrl, externalLineItemId }) {
    try {
      console.log(`[Orders] Adding sync item to order ${orderId}:`, {
        syncVariantId,
        quantity,
        externalLineItemId
      });

      const addItemRequest = {
        external_id: externalLineItemId?.toString(),
        sync_variant_id: syncVariantId,
        quantity: quantity || 1,
        files: [{ type: 'default', url: s3PrintUrl }]
      };

      const response = await this.client.post(`/orders/${orderId}/items`, addItemRequest);
      
      if (response?.result?.id) {
        console.log(`[Orders] ✅ Successfully added sync item ${response.result.id} to order ${orderId}`);
        return response.result;
      } else {
        throw new Error('Invalid response from Printful API');
      }
    } catch (error) {
      console.error(`[Orders] Failed to add sync item to order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Add catalog item with file and placement to order
   */
  async addCatalogItemWithPlacement(orderId, itemData) {
    try {
      console.log(`[Orders] Adding catalog item to order ${orderId}:`, {
        variantId: itemData.variantId,
        quantity: itemData.quantity,
        externalLineItemId: itemData.externalLineItemId
      });

      const addItemRequest = {
        variant_id: itemData.variantId,
        quantity: itemData.quantity,
        files: [
          {
            type: 'default',
            url: itemData.s3PrintUrl
          }
        ],
        placements: [
          {
            placement: 'front_large',
            layers: [
              {
                type: 'file',
                url: itemData.s3PrintUrl,
                position: {
                  area: 'default'
                }
              }
            ]
          }
        ],
        external_id: itemData.externalLineItemId
      };

      const result = await this.client.addOrderItem(orderId, addItemRequest);
      console.log(`[Orders] Successfully added catalog item: ${result.id}`);
      
      return result;
    } catch (error) {
      console.error(`[Orders] Failed to add catalog item to order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Remove item from order (if supported)
   */
  async removeItem(orderId, itemId) {
    try {
      console.log(`[Orders] Removing item ${itemId} from order ${orderId}`);
      await this.client.removeOrderItem(orderId, itemId);
      console.log(`[Orders] Successfully removed item ${itemId}`);
    } catch (error) {
      console.error(`[Orders] Failed to remove item ${itemId} from order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Remove sync items from order (legacy cleanup)
   */
  async removeSyncItemsIfPresent(orderId) {
    try {
      console.log(`[Orders] Checking for sync items to remove in order ${orderId}`);
      
      const order = await this.client.getOrder(orderId);
      const syncItems = order.items.filter(item => 
        item.external_id && item.external_id.includes('sync')
      );

      if (syncItems.length === 0) {
        console.log(`[Orders] No sync items found in order ${orderId}`);
        return;
      }

      console.log(`[Orders] Found ${syncItems.length} sync items to remove`);

      for (const item of syncItems) {
        try {
          await this.removeItem(orderId, item.id);
        } catch (error) {
          console.warn(`[Orders] Failed to remove sync item ${item.id}:`, error);
          // Continue with other items
        }
      }

      console.log(`[Orders] Completed sync item cleanup for order ${orderId}`);
    } catch (error) {
      console.error(`[Orders] Failed to remove sync items from order ${orderId}:`, error);
      // Don't throw - this is cleanup, not critical
    }
  }

  /**
   * Confirm order (submit for fulfillment)
   */
  async confirmOrder(orderId) {
    try {
      console.log(`[Orders] Confirming order ${orderId}`);
      const order = await this.client.confirmOrder(orderId);
      console.log(`[Orders] Order ${orderId} confirmed successfully`);
      return order;
    } catch (error) {
      console.error(`[Orders] Failed to confirm order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId) {
    try {
      console.log(`[Orders] Cancelling order ${orderId}`);
      const order = await this.client.cancelOrder(orderId);
      console.log(`[Orders] Order ${orderId} cancelled successfully`);
      return order;
    } catch (error) {
      console.error(`[Orders] Failed to cancel order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId) {
    try {
      return await this.client.getOrder(orderId);
    } catch (error) {
      console.error(`[Orders] Failed to get order status for ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Check if order item already exists with same external ID and file URL
   */
  async findExistingCatalogItem(orderId, externalLineItemId, s3PrintUrl) {
    try {
      const order = await this.client.getOrder(orderId);
      
      const existingItem = order.items.find(item => 
        item.external_id === externalLineItemId &&
        item.files.some(file => file.url === s3PrintUrl)
      );

      if (existingItem) {
        console.log(`[Orders] Found existing catalog item: ${existingItem.id}`);
      }

      return existingItem || null;
    } catch (error) {
      console.error(`[Orders] Failed to check for existing catalog item:`, error);
      return null;
    }
  }

  /**
   * Update existing catalog item (if file URL differs)
   */
  async updateCatalogItem(orderId, itemId, itemData) {
    try {
      console.log(`[Orders] Updating catalog item ${itemId} in order ${orderId}`);
      
      // Remove old item and add new one
      await this.removeItem(orderId, itemId);
      return await this.addCatalogItemWithPlacement(orderId, itemData);
    } catch (error) {
      console.error(`[Orders] Failed to update catalog item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Add or update catalog item (idempotent)
   */
  async addOrUpdateCatalogItem(orderId, itemData) {
    if (!itemData.externalLineItemId) {
      // No external ID, just add new item
      return await this.addCatalogItemWithPlacement(orderId, itemData);
    }

    // Check for existing item
    const existingItem = await this.findExistingCatalogItem(
      orderId,
      itemData.externalLineItemId,
      itemData.s3PrintUrl
    );

    if (existingItem) {
      console.log(`[Orders] Catalog item already exists with same file URL, skipping`);
      return existingItem;
    }

    // Check if item exists but with different file URL
    const order = await this.client.getOrder(orderId);
    const itemWithSameExternalId = order.items.find(item => 
      item.external_id === itemData.externalLineItemId
    );

    if (itemWithSameExternalId) {
      console.log(`[Orders] Updating existing item with new file URL`);
      return await this.updateCatalogItem(orderId, itemWithSameExternalId.id, itemData);
    }

    // Add new item
    return await this.addCatalogItemWithPlacement(orderId, itemData);
  }

  /**
   * Remove opposite item type if present (cleanup mixed item types)
   */
  async removeOppositeItemTypeIfPresent(orderId) {
    try {
      console.log(`[Orders] Checking for opposite item types to remove in order ${orderId}`);
      
      const order = await this.client.getOrder(orderId);
      if (!order?.items || order.items.length === 0) {
        console.log(`[Orders] No items found in order ${orderId}`);
        return;
      }

      // Determine the type of items in the order
      const hasCatalogItems = order.items.some(item => 
        item.variant_id && (item.placements || item.files)
      );
      const hasSyncItems = order.items.some(item => 
        item.sync_variant_id || (item.external_id && item.external_id.includes('sync'))
      );

      console.log(`[Orders] Order ${orderId} has catalog items: ${hasCatalogItems}, sync items: ${hasSyncItems}`);

      // If we have both types, remove the opposite type
      if (hasCatalogItems && hasSyncItems) {
        console.log(`[Orders] Mixed item types detected, removing sync items`);
        
        const syncItems = order.items.filter(item => 
          item.sync_variant_id || (item.external_id && item.external_id.includes('sync'))
        );

        for (const item of syncItems) {
          try {
            console.log(`[Orders] Removing sync item ${item.id}`);
            await this.removeItem(orderId, item.id);
          } catch (error) {
            console.warn(`[Orders] Failed to remove sync item ${item.id}:`, error.message);
            // Continue with other items
          }
        }
      } else if (hasSyncItems && !hasCatalogItems) {
        console.log(`[Orders] Only sync items found, removing catalog items (if any)`);
        
        const catalogItems = order.items.filter(item => 
          item.variant_id && (item.placements || item.files)
        );

        for (const item of catalogItems) {
          try {
            console.log(`[Orders] Removing catalog item ${item.id}`);
            await this.removeItem(orderId, item.id);
          } catch (error) {
            console.warn(`[Orders] Failed to remove catalog item ${item.id}:`, error.message);
            // Continue with other items
          }
        }
      } else {
        console.log(`[Orders] No mixed item types found, no cleanup needed`);
      }

    } catch (error) {
      console.error(`[Orders] Failed to remove opposite item types from order ${orderId}:`, error.message);
      // Don't throw - this is cleanup, not critical
    }
  }
}

// Export singleton instance (lazy initialization)
let orderService = null;

function getOrderService() {
  if (!orderService) {
    orderService = new OrderService();
  }
  return orderService;
}

module.exports = {
  get orderService() {
    return getOrderService();
  },
  OrderService
};
