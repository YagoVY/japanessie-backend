const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const S3StorageService = require('../services/s3-storage');
const logger = require('../utils/logger');

const router = express.Router();
const s3Storage = new S3StorageService();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PNG files
    if (file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG files are allowed'), false);
    }
  }
});

/**
 * Simple endpoint for frontend-generated print files
 * Frontend generates the print file, backend just stores it
 */
router.post('/upload-print-file', upload.single('printFile'), async (req, res) => {
  try {
    logger.info('Received frontend-generated print file', {
      originalName: req.file?.originalname,
      size: req.file?.size,
      mimetype: req.file?.mimetype,
      orderId: req.body.orderId
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No print file provided'
      });
    }

    // Validate file
    if (req.file.mimetype !== 'image/png') {
      return res.status(400).json({
        success: false,
        error: 'Only PNG files are allowed'
      });
    }

    const orderId = req.body.orderId || `order-${Date.now()}`;
    const timestamp = Date.now();
    const fileName = `${orderId}-${timestamp}-frontend-print.png`;

    // Store the file in S3
    const uploadResult = await s3Storage.uploadBuffer(
      `prints/${orderId}/${fileName}`,
      req.file.buffer,
      'image/png',
      {
        orderId: orderId,
        type: 'frontend-generated-print',
        generatedAt: new Date().toISOString(),
        method: 'frontend-direct-generation',
        originalName: req.file.originalname,
        fileSize: req.file.size
      }
    );

    logger.info('Frontend-generated print file uploaded successfully', {
      orderId,
      fileName,
      s3Url: uploadResult,
      fileSize: req.file.size
    });

    res.json({
      success: true,
      message: 'Print file uploaded successfully',
      data: {
        orderId: orderId,
        fileName: fileName,
        s3Url: uploadResult,
        fileSize: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error uploading frontend-generated print file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check for simple upload endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Simple print upload endpoint is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
