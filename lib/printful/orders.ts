import { printfulClient, PrintfulOrder, CreateOrderRequest, AddOrderItemRequest } from './client';

export interface OrderCreationData {
  externalId: string;
  shipping: string;
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
    phone?: string;
    email: string;
  };
}

export interface CatalogItemData {
  variantId: number;
  quantity: number;
  s3PrintUrl: string;
  externalLineItemId?: string;
}

export class OrderService {
  private client = printfulClient;

  /**
   * Find existing order by external ID
   */
  async findOrderByExternalId(externalId: string): Promise<PrintfulOrder | null> {
    try {
      console.log(`[Orders] Looking for existing order with external ID: ${externalId}`);
      const order = await this.client.getOrderByExternalId(externalId);
      
      if (order) {
        console.log(`[Orders] Found existing order: ${order.id} (status: ${order.status})`);
      } else {
        console.log(`[Orders] No existing order found for external ID: ${externalId}`);
      }
      
      return order;
    } catch (error) {
      console.error(`[Orders] Failed to find order by external ID ${externalId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new draft order
   */
  async createDraftOrder(orderData: OrderCreationData): Promise<PrintfulOrder> {
    try {
      console.log(`[Orders] Creating draft order for external ID: ${orderData.externalId}`);
      
      const createRequest: CreateOrderRequest = {
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
   * Ensure draft order exists (create if not found)
   */
  async ensureDraftOrder(orderData: OrderCreationData): Promise<PrintfulOrder> {
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
   * Add catalog item with file and placement to order
   */
  async addCatalogItemWithPlacement(
    orderId: number, 
    itemData: CatalogItemData
  ): Promise<any> {
    try {
      console.log(`[Orders] Adding catalog item to order ${orderId}:`, {
        variantId: itemData.variantId,
        quantity: itemData.quantity,
        externalLineItemId: itemData.externalLineItemId
      });

      const addItemRequest: AddOrderItemRequest = {
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
  async removeItem(orderId: number, itemId: number): Promise<void> {
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
  async removeSyncItemsIfPresent(orderId: number): Promise<void> {
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
  async confirmOrder(orderId: number): Promise<PrintfulOrder> {
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
  async cancelOrder(orderId: number): Promise<PrintfulOrder> {
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
  async getOrderStatus(orderId: number): Promise<PrintfulOrder> {
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
  async findExistingCatalogItem(
    orderId: number, 
    externalLineItemId: string, 
    s3PrintUrl: string
  ): Promise<any | null> {
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
  async updateCatalogItem(
    orderId: number,
    itemId: number,
    itemData: CatalogItemData
  ): Promise<any> {
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
  async addOrUpdateCatalogItem(
    orderId: number,
    itemData: CatalogItemData
  ): Promise<any> {
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
}

// Export singleton instance
export const orderService = new OrderService();
export default OrderService;
