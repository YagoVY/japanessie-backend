const express = require('express');
const router = express.Router();
const CoordinateScalingGenerator = require('../services/coordinate-scaling-generator');
const logger = require('../utils/logger');

const coordinateGenerator = new CoordinateScalingGenerator();

/**
 * Test endpoint for real frontend coordinates
 * This receives ACTUAL coordinates from your frontend, not mock data
 */
router.post('/test-real-coordinates', async (req, res) => {
    try {
        logger.info('Received REAL coordinates from frontend', req.body);
        
        const { realCoordinates } = req.body;
        
        if (!realCoordinates) {
            return res.status(400).json({
                success: false,
                error: 'No real coordinates provided'
            });
        }
        
        // Validate that these are REAL coordinates (not mock)
        if (!realCoordinates.characterPositions || realCoordinates.characterPositions.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No character positions in real coordinates'
            });
        }
        
        // Check if coordinates are marked as real capture
        const hasRealCaptureFlag = realCoordinates.characterPositions.some(
            char => char.realFrontendCapture === true
        );
        
        if (!hasRealCaptureFlag) {
            logger.warn('Coordinates not marked as real capture - may be mock data');
        }
        
        logger.info('Processing REAL coordinates:', {
            text: realCoordinates.text,
            fontFamily: realCoordinates.fontFamily,
            fontSize: realCoordinates.fontSize,
            characterCount: realCoordinates.characterPositions.length,
            printAreaBounds: realCoordinates.printAreaBounds,
            realCaptureFlag: hasRealCaptureFlag
        });
        
        // Generate print file using REAL coordinates (not mock data)
        const result = await coordinateGenerator.generatePrintFromRealCoordinates(realCoordinates, {
            debugMode: true,
            realCoordinates: true
        });
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }
        
        logger.info('Print generation completed with REAL coordinates', {
            dimensions: result.dimensions,
            bufferSize: result.printBuffer.length,
            s3Url: result.s3Url
        });
        
        res.json({
            success: true,
            message: 'Print generated successfully using REAL frontend coordinates',
            result: {
                dimensions: result.dimensions,
                bufferSize: result.printBuffer.length,
                s3Url: result.s3Url,
                debug: result.debug
            }
        });
        
    } catch (error) {
        logger.error('Error processing real coordinates:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

/**
 * Health check for real coordinates endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Real coordinates endpoint is healthy',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
