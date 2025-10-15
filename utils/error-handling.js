/**
 * Custom error classes and error handling utilities
 */

class TShirtDesignerError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends TShirtDesignerError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.field = field;
  }
}

class DesignError extends TShirtDesignerError {
  constructor(message, designId = null) {
    super(message, 'DESIGN_ERROR', 422);
    this.designId = designId;
  }
}

class RenderingError extends TShirtDesignerError {
  constructor(message, orderId = null) {
    super(message, 'RENDERING_ERROR', 500);
    this.orderId = orderId;
  }
}

class FontError extends TShirtDesignerError {
  constructor(message, fontFamily = null) {
    super(message, 'FONT_ERROR', 500);
    this.fontFamily = fontFamily;
  }
}

class S3Error extends TShirtDesignerError {
  constructor(message, operation = null) {
    super(message, 'S3_ERROR', 500);
    this.operation = operation;
  }
}

class PrintfulError extends TShirtDesignerError {
  constructor(message, orderId = null) {
    super(message, 'PRINTFUL_ERROR', 502);
    this.orderId = orderId;
  }
}

class OrderProcessingError extends TShirtDesignerError {
  constructor(message, orderId = null, stage = null) {
    super(message, 'ORDER_PROCESSING_ERROR', 500);
    this.orderId = orderId;
    this.stage = stage;
  }
}

class WebhookError extends TShirtDesignerError {
  constructor(message, shop = null) {
    super(message, 'WEBHOOK_ERROR', 400);
    this.shop = shop;
  }
}

/**
 * Error handling middleware factory
 */
function createErrorHandler(logger) {
  return (error, req, res, next) => {
    // Log the error
    logger.error('Error occurred:', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      shop: req.get('X-Shopify-Shop-Domain')
    });

    // Determine response status code
    const statusCode = error.statusCode || 500;
    
    // Prepare error response
    const errorResponse = {
      error: {
        message: process.env.NODE_ENV === 'production' 
          ? getPublicErrorMessage(error)
          : error.message,
        code: error.code || 'INTERNAL_ERROR',
        timestamp: error.timestamp || new Date().toISOString()
      }
    };

    // Add additional context in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.stack = error.stack;
      errorResponse.error.details = {
        field: error.field,
        designId: error.designId,
        orderId: error.orderId,
        fontFamily: error.fontFamily,
        operation: error.operation,
        stage: error.stage,
        shop: error.shop
      };
    }

    res.status(statusCode).json(errorResponse);
  };
}

/**
 * Get public-friendly error message for production
 */
function getPublicErrorMessage(error) {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return 'Invalid request data provided';
    case 'DESIGN_ERROR':
      return 'Design processing failed';
    case 'RENDERING_ERROR':
      return 'Image rendering failed';
    case 'FONT_ERROR':
      return 'Font loading failed';
    case 'S3_ERROR':
      return 'File storage error';
    case 'PRINTFUL_ERROR':
      return 'Print service error';
    case 'ORDER_PROCESSING_ERROR':
      return 'Order processing failed';
    case 'WEBHOOK_ERROR':
      return 'Webhook processing failed';
    default:
      return 'An unexpected error occurred';
  }
}

/**
 * Async error wrapper for route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error formatter
 */
function formatValidationErrors(errors) {
  if (Array.isArray(errors)) {
    return errors.map(error => ({
      field: error.path?.join('.') || error.field,
      message: error.message,
      value: error.value
    }));
  }
  
  return [{
    field: errors.field,
    message: errors.message,
    value: errors.value
  }];
}

/**
 * Retry configuration for different error types
 */
const RETRY_CONFIG = {
  S3_ERROR: { maxRetries: 3, delay: 1000 },
  PRINTFUL_ERROR: { maxRetries: 2, delay: 2000 },
  FONT_ERROR: { maxRetries: 2, delay: 1000 },
  RENDERING_ERROR: { maxRetries: 1, delay: 500 },
  ORDER_PROCESSING_ERROR: { maxRetries: 2, delay: 1000 }
};

/**
 * Retry utility with exponential backoff
 */
async function retryOperation(operation, errorType, context = {}) {
  const config = RETRY_CONFIG[errorType] || { maxRetries: 1, delay: 1000 };
  let lastError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === config.maxRetries) {
        break;
      }
      
      const delay = config.delay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Error recovery strategies
 */
const RECOVERY_STRATEGIES = {
  FONT_ERROR: async (error, context) => {
    // Try to reload font or use fallback
    const FontLoader = require('../services/font-loader');
    const fontLoader = new FontLoader();
    
    if (error.fontFamily) {
      try {
        await fontLoader.loadFont(error.fontFamily);
        return { recovered: true, action: 'font_reloaded' };
      } catch (reloadError) {
        // Use fallback font
        return { recovered: true, action: 'fallback_font_used', fallback: 'Arial' };
      }
    }
    
    return { recovered: false, reason: 'no_font_family' };
  },
  
  S3_ERROR: async (error, context) => {
    // Try alternative S3 operation or local storage
    return { recovered: false, reason: 's3_unavailable' };
  },
  
  PRINTFUL_ERROR: async (error, context) => {
    // Queue for later processing or manual intervention
    return { recovered: false, reason: 'printful_unavailable', action: 'queued_for_retry' };
  }
};

/**
 * Attempt error recovery
 */
async function attemptRecovery(error, context = {}) {
  const strategy = RECOVERY_STRATEGIES[error.code];
  
  if (!strategy) {
    return { recovered: false, reason: 'no_recovery_strategy' };
  }
  
  try {
    return await strategy(error, context);
  } catch (recoveryError) {
    return { 
      recovered: false, 
      reason: 'recovery_failed', 
      recoveryError: recoveryError.message 
    };
  }
}

module.exports = {
  TShirtDesignerError,
  ValidationError,
  DesignError,
  RenderingError,
  FontError,
  S3Error,
  PrintfulError,
  OrderProcessingError,
  WebhookError,
  createErrorHandler,
  asyncHandler,
  formatValidationErrors,
  retryOperation,
  attemptRecovery,
  RETRY_CONFIG,
  RECOVERY_STRATEGIES
};
