const express = require('express');
const OrderProcessor = require('../services/order-processor');
const logger = require('../utils/logger');

const router = express.Router();
const orderProcessor = new OrderProcessor();

// Get order status
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderProcessor.getProcessingStatus(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      orderId: order.orderId,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      processingMetrics: order.processingMetrics,
      printfulOrderId: order.printfulOrderId,
      s3Urls: order.s3Urls
    });
  } catch (error) {
    logger.error('Failed to get order status:', error);
    res.status(500).json({ error: 'Internal server error' });
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
        createdAt: order.createdAt,
        processingTimeMs: order.processingMetrics?.processingTimeMs,
        customerEmail: order.customer?.email
      })),
      total: orders.length
    });
  } catch (error) {
    logger.error('Failed to list orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get processing statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await orderProcessor.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;