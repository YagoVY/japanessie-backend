const S3StorageService = require('./s3-storage');
const logger = require('../utils/logger');

class OrderStorageService {
  constructor() {
    this.s3Storage = new S3StorageService();
  }

  async saveOrder(orderData) {
    // Store order record as JSON in S3
    const orderKey = `orders/${orderData.orderId}/order-record.json`;
    const orderBuffer = Buffer.from(JSON.stringify(orderData, null, 2));
    
    try {
      await this.s3Storage.uploadBuffer(
        orderKey, 
        orderBuffer, 
        'application/json',
        {
          orderId: orderData.orderId,
          status: orderData.status,
          createdAt: new Date().toISOString()
        }
      );
      
      logger.info(`Order record saved for ${orderData.orderId}`);
      return orderKey;
    } catch (error) {
      logger.error(`Failed to save order record for ${orderData.orderId}:`, error);
      throw error;
    }
  }

  async getOrder(orderId) {
    // Retrieve order record from S3
    const orderKey = `orders/${orderId}/order-record.json`;
    
    try {
      const buffer = await this.s3Storage.downloadFileByKey(orderKey);
      return JSON.parse(buffer.toString());
    } catch (error) {
      logger.error(`Failed to retrieve order record for ${orderId}:`, error);
      return null;
    }
  }

  async updateOrderStatus(orderId, status, additionalData = {}) {
    // Update existing order record
    try {
      const existingOrder = await this.getOrder(orderId);
      if (!existingOrder) {
        throw new Error(`Order ${orderId} not found`);
      }

      const updatedOrder = {
        ...existingOrder,
        status,
        ...additionalData,
        updatedAt: new Date().toISOString()
      };

      await this.saveOrder(updatedOrder);
      logger.info(`Order status updated for ${orderId}: ${status}`);
      
      return updatedOrder;
    } catch (error) {
      logger.error(`Failed to update order status for ${orderId}:`, error);
      throw error;
    }
  }

  async listOrders(limit = 100) {
    // List recent orders from S3
    try {
      const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
      
      const listCommand = new ListObjectsV2Command({
        Bucket: this.s3Storage.bucketName,
        Prefix: 'orders/',
        MaxKeys: limit
      });
      
      const response = await this.s3Storage.s3Client.send(listCommand);
      
      if (!response.Contents) {
        return [];
      }

      // Extract order IDs from S3 keys
      const orderIds = response.Contents
        .filter(obj => obj.Key.endsWith('/order-record.json'))
        .map(obj => obj.Key.split('/')[1])
        .slice(0, limit);

      // Fetch order details
      const orders = [];
      for (const orderId of orderIds) {
        try {
          const order = await this.getOrder(orderId);
          if (order) {
            orders.push(order);
          }
        } catch (error) {
          logger.warn(`Failed to fetch order ${orderId}:`, error.message);
        }
      }

      return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      logger.error('Failed to list orders:', error);
      return [];
    }
  }

  async getOrderStats() {
    // Get basic order statistics
    try {
      const orders = await this.listOrders(1000); // Get more for stats
      
      const stats = {
        total: orders.length,
        completed: orders.filter(o => o.status === 'completed').length,
        failed: orders.filter(o => o.status === 'failed').length,
        processing: orders.filter(o => o.status === 'processing').length,
        avgProcessingTime: 0
      };

      const completedOrders = orders.filter(o => 
        o.status === 'completed' && o.processingMetrics?.processingTimeMs
      );
      
      if (completedOrders.length > 0) {
        stats.avgProcessingTime = Math.round(
          completedOrders.reduce((sum, order) => 
            sum + order.processingMetrics.processingTimeMs, 0
          ) / completedOrders.length
        );
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get order stats:', error);
      return {
        total: 0,
        completed: 0,
        failed: 0,
        processing: 0,
        avgProcessingTime: 0
      };
    }
  }
}

module.exports = OrderStorageService;
