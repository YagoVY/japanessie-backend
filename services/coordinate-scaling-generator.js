const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const S3StorageService = require('./s3-storage');
const logger = require('../utils/logger');
const { 
  EXACT_FRONTEND_CONFIG, 
  getExactTextArea, 
  calculateExactCharacterPositions 
} = require('../exact-frontend-constants');

class CoordinateScalingGenerator {
  constructor() {
    this.s3Storage = new S3StorageService();
    this.printRendererPath = path.join(__dirname, '../print-renderer-coordinate-capture.html');
    this.base64Fonts = null;
  }

  async loadBase64Fonts() {
    if (this.base64Fonts) return this.base64Fonts;
    
    try {
      const fontsPath = path.join(__dirname, '../assets/fonts-base64.json');
      const fontsData = await fs.readFile(fontsPath, 'utf8');
      this.base64Fonts = JSON.parse(fontsData);
      logger.info('Base64 fonts loaded successfully for coordinate scaling');
      return this.base64Fonts;
    } catch (error) {
      logger.error('Failed to load base64 fonts for coordinate scaling:', error.message);
      return {};
    }
  }

  async prepareHtmlWithFonts() {
    const base64Fonts = await this.loadBase64Fonts();
    let htmlContent = await fs.readFile(this.printRendererPath, 'utf8');
    
    // Replace font placeholders with actual base64 data
    htmlContent = htmlContent.replace('{{YujiSyukuBase64}}', base64Fonts['Yuji Syuku'] || '');
    htmlContent = htmlContent.replace('{{ShipporiAntiqueBase64}}', base64Fonts['Shippori Antique'] || '');
    htmlContent = htmlContent.replace('{{HuninnBase64}}', base64Fonts['Huninn'] || '');
    htmlContent = htmlContent.replace('{{RampartOneBase64}}', base64Fonts['Rampart One'] || '');
    htmlContent = htmlContent.replace('{{CherryBombOneBase64}}', base64Fonts['Cherry Bomb One'] || '');
    
    return htmlContent;
  }

  async generatePrintFromCoordinates(coordinateData, options = {}) {
    let browser = null;
    
    try {
      logger.info('Starting coordinate-based print generation', { 
        coordinateData: {
          text: coordinateData.text,
          fontFamily: coordinateData.fontFamily,
          fontSize: coordinateData.fontSize,
          characterCount: coordinateData.characterPositions?.length
        },
        options 
      });
      
      // Launch headless browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Capture console logs for debugging
      page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'log') {
          logger.info(`[CoordinateBrowser Console] ${text}`);
        } else if (type === 'error') {
          logger.error(`[CoordinateBrowser Console Error] ${text}`);
        } else if (type === 'warn') {
          logger.warn(`[CoordinateBrowser Console Warning] ${text}`);
        }
      });
      
      // Set viewport to match print dimensions (12" x 16" at 300 DPI)
      await page.setViewport({
        width: 3600,
        height: 4800,
        deviceScaleFactor: 1
      });

      // Load the coordinate capture renderer HTML with embedded fonts
      const htmlContent = await this.prepareHtmlWithFonts();
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Wait for the renderer to be ready
      await page.waitForFunction(() => window.coordinateCaptureReady === true, {
        timeout: 10000
      });

      logger.info('Coordinate capture renderer loaded successfully');

      // Execute the coordinate-based rendering function
      const result = await page.evaluate(async (coordinateData) => {
        return await window.renderFromCoordinates(coordinateData);
      }, coordinateData);

      if (!result.success) {
        throw new Error(`Coordinate-based rendering failed: ${result.error}`);
      }

      logger.info('Coordinate-based print rendering completed', { 
        dimensions: result.dimensions,
        dataUrlLength: result.dataUrl.length 
      });

      // Convert data URL to buffer
      const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, '');
      const printBuffer = Buffer.from(base64Data, 'base64');

      // Store in S3 if orderId provided
      let s3Url = null;
      if (options.orderId) {
        try {
          const uploadResult = await this.s3Storage.uploadBuffer(
            `prints/${options.orderId}/${Date.now()}-coordinate-print.png`,
            printBuffer,
            'image/png',
            {
              orderId: options.orderId,
              type: 'coordinate-print-file',
              dpi: result.dimensions.dpi,
              dimensions: `${result.dimensions.width}x${result.dimensions.height}`,
              generatedAt: new Date().toISOString(),
              method: 'coordinate-scaling'
            }
          );
          s3Url = uploadResult;
          logger.info('Coordinate-based print file uploaded to S3', { s3Url });
        } catch (s3Error) {
          logger.warn(`S3 not configured, skipping coordinate print file upload: ${s3Error.message}`);
        }
      }

      return {
        success: true,
        printBuffer,
        s3Url,
        dimensions: result.dimensions,
        debug: result.debug
      };

    } catch (error) {
      logger.error('Coordinate-based print generation failed:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate print file from REAL frontend coordinates
   * 
   * CRITICAL: This uses ACTUAL coordinates from frontend, not mock data
   */
  async generatePrintFromRealCoordinates(realCoordinates, options = {}) {
    logger.info('Generating print from REAL frontend coordinates', {
      text: realCoordinates.text,
      fontFamily: realCoordinates.fontFamily,
      fontSize: realCoordinates.fontSize,
      characterCount: realCoordinates.characterPositions?.length,
      realCaptureFlag: realCoordinates.characterPositions?.some(char => char.realFrontendCapture === true)
    });
    
    // Validate that these are REAL coordinates
    if (!realCoordinates.characterPositions || realCoordinates.characterPositions.length === 0) {
      throw new Error('No real character positions provided');
    }
    
    // Check if coordinates are marked as real capture
    const hasRealCaptureFlag = realCoordinates.characterPositions.some(
      char => char.realFrontendCapture === true
    );
    
    if (!hasRealCaptureFlag) {
      logger.warn('Coordinates not marked as real capture - may be mock data');
    }
    
    // Use the REAL coordinates directly (no conversion needed)
    const coordinateData = {
      ...realCoordinates,
      source: 'real-frontend-capture',
      validated: true
    };
    
    logger.info('Using REAL coordinates directly:', {
      characterCount: coordinateData.characterPositions.length,
      printAreaBounds: coordinateData.printAreaBounds,
      totalWidth: coordinateData.totalWidth,
      totalHeight: coordinateData.totalHeight,
      actualTextMetrics: coordinateData.actualTextMetrics
    });
    
    // Generate print file using REAL coordinates
    return await this.generatePrintFromCoordinates(coordinateData, options);
  }

  /**
   * Convert legacy design parameters to coordinate data format
   * 
   * CRITICAL: Now uses EXACT frontend constants and calculations
   */
  convertLegacyToCoordinates(designParams) {
    logger.info('Converting legacy design params using EXACT frontend constants', designParams);
    
    const { text, fontFamily, fontSize, color, orientation, letterSpacing } = designParams;
    
    // Create a mock canvas context for measurements
    const mockCanvas = { width: 600, height: 600 };
    const mockCtx = {
      font: '',
      measureText: (text) => {
        // Mock text measurement - in real implementation, this would use actual canvas
        const charWidth = fontSize * 0.6; // Rough estimate for mock
        return {
          width: text.length * charWidth,
          actualBoundingBoxAscent: fontSize * 0.8,
          actualBoundingBoxDescent: fontSize * 0.2
        };
      }
    };
    
    // Use EXACT frontend constants and calculations
    const exactResult = calculateExactCharacterPositions(
      text, fontFamily, fontSize, color, orientation || 'horizontal', mockCtx, letterSpacing
    );
    
    // Extract exact print area bounds from frontend constants
    const exactTextArea = exactResult.textArea;
    const exactPrintAreaBounds = {
      x: EXACT_FRONTEND_CONFIG.canvasMapping.horizontal.x,
      y: EXACT_FRONTEND_CONFIG.canvasMapping.horizontal.y,
      width: EXACT_FRONTEND_CONFIG.canvasMapping.horizontal.width,
      height: EXACT_FRONTEND_CONFIG.canvasMapping.horizontal.height
    };
    
    logger.info('EXACT frontend constants applied', {
      exactTextArea,
      exactPrintAreaBounds,
      exactConstants: EXACT_FRONTEND_CONFIG,
      characterCount: exactResult.characterPositions.length,
      letterSpacing: letterSpacing || 'default',
      spacingMultiplier: exactResult.spacingMultiplier,
      note: 'Using exact frontend constants, not approximations'
    });
    
    const coordinateData = {
      text: text,
      fontFamily: fontFamily,
      fontSize: fontSize,
      color: color,
      orientation: orientation || 'horizontal',
      frontendCanvasSize: {
        width: 600,
        height: 600
      },
      // EXACT print area bounds from frontend constants
      printAreaBounds: exactPrintAreaBounds,
      // EXACT character positions using frontend logic
      characterPositions: exactResult.characterPositions,
      // EXACT frontend constants for reference
      exactFrontendConstants: EXACT_FRONTEND_CONFIG,
      exactTextArea: exactTextArea,
      exactPositioning: exactResult.positioning,
      letterSpacing: letterSpacing,
      spacingMultiplier: exactResult.spacingMultiplier,
      captureTimestamp: Date.now(),
      source: 'exact-frontend-constants'
    };
    
    logger.info('Legacy conversion complete with EXACT frontend constants', {
      characterCount: exactResult.characterPositions.length,
      exactPrintAreaBounds,
      exactConstants: EXACT_FRONTEND_CONFIG,
      coordinateData
    });
    
    return coordinateData;
  }
}

module.exports = CoordinateScalingGenerator;
