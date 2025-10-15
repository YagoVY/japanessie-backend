require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import routes
const webhookRoutes = require('./routes/webhooks');
const printWebhookRoutes = require('./routes/print-webhooks');
const realCoordinatesRoutes = require('./routes/real-coordinates-webhook');
const simplePrintUploadRoutes = require('./routes/simple-print-upload');
const orderRoutes = require('./routes/orders');
const debugRoutes = require('./routes/debug');

// Import services
const OrderProcessor = require('./services/order-processor');

// Import utilities
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for proper IP address handling
const isProd = process.env.NODE_ENV === 'production';

// If Shopify/your proxy adds X-Forwarded-For, Express must trust the proxy hop.
app.set('trust proxy', 1); // set to 1 even in dev since we're seeing XFF

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Shopify-Hmac-Sha256', 'X-Shopify-Shop-Domain']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 300, // whatever fits your dev
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true // match app.set('trust proxy', 1)
});

app.use(limiter);

// --- BEGIN: Webhook raw-body pipeline (Shopify) ---
const webhookRaw = express.raw({ type: 'application/json', limit: '2mb' });

// Mount raw parser ONLY for /webhooks/**
app.use('/webhooks', webhookRaw, (req, res, next) => {
  // If HMAC is disabled, we still need a JS object for our handlers
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      return res.status(400).send('Invalid JSON body');
    }
  }
  next();
});
// --- END: Webhook raw-body pipeline ---

// Global parsers for non-webhook routes
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    shop: req.get('X-Shopify-Shop-Domain')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/webhooks', webhookRoutes);  // Legacy webhook routes
app.use('/print-webhooks', printWebhookRoutes);  // New print webhook routes
app.use('/real-coordinates', realCoordinatesRoutes);  // Real coordinates from frontend
app.use('/simple-print-upload', simplePrintUploadRoutes);  // Simple frontend print file upload
app.use('/api/orders', orderRoutes);
app.use('/api/debug', debugRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'T-Shirt Designer Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      webhooks: '/webhooks',
      printWebhooks: '/print-webhooks',
      realCoordinates: '/real-coordinates',
      simplePrintUpload: '/simple-print-upload',
      orders: '/api/orders',
      debug: '/api/debug'
    },
    documentation: 'https://github.com/your-repo/tshirt-designer-backend'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Initialize services
async function initializeServices() {
  try {
    // Initialize order processor
    const orderProcessor = new OrderProcessor();
    logger.info('Order processor initialized');
    
    // Test print generator
    const PrintGenerator = require('./services/print-generator');
    const printGenerator = new PrintGenerator();
    const testResult = await printGenerator.testRenderer();
    
    if (testResult.success) {
      logger.info('Print generator test passed');
    } else {
      logger.warn('Print generator test failed:', testResult.error);
    }
    
  } catch (error) {
    logger.error('Service initialization failed:', error);
    // Don't exit - services can be initialized on demand
  }
}

// Start server
async function startServer() {
  try {
    // Initialize services
    await initializeServices();
    
    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        port: PORT,
        nodeVersion: process.version
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();