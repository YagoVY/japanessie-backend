const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const S3StorageService = require('./s3-storage');
const ImageCompositor = require('./image-compositor');
const logger = require('../utils/logger');

class PrintGenerator {
  constructor() {
    this.s3Storage = new S3StorageService();
    this.imageCompositor = new ImageCompositor();
    this.printRendererPath = path.join(__dirname, '../print-renderer.html');
    this.base64Fonts = null;
  }

  async loadBase64Fonts() {
    if (this.base64Fonts) return this.base64Fonts;
    
    try {
      const fontsPath = path.join(__dirname, '../assets/fonts-base64.json');
      const fontsData = await fs.readFile(fontsPath, 'utf8');
      this.base64Fonts = JSON.parse(fontsData);
      logger.info('Base64 fonts loaded successfully');
      return this.base64Fonts;
    } catch (error) {
      logger.error('Failed to load base64 fonts:', error.message);
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

  async generatePrintFile(designParams, options = {}) {
    let browser = null;
    
    try {
      logger.info('Starting print generation with Puppeteer', { designParams, options });
      
      // Determine canvas size from options
      const canvasSize = options.canvasSize || { width: 3600, height: 4800 };
      const isTestMode = options.canvasSize !== undefined;
      
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
          logger.info(`[Browser Console] ${text}`);
        } else if (type === 'error') {
          logger.error(`[Browser Console Error] ${text}`);
        } else if (type === 'warn') {
          logger.warn(`[Browser Console Warning] ${text}`);
        }
      });
      
      // Set viewport to match canvas dimensions
      await page.setViewport({
        width: canvasSize.width,
        height: canvasSize.height,
        deviceScaleFactor: 1
      });

      // Load the print renderer HTML with embedded fonts
      const htmlContent = await this.prepareHtmlWithFonts();
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Wait for the renderer to be ready
      await page.waitForFunction(() => window.printRendererReady === true, {
        timeout: 10000
      });

      logger.info('Print renderer loaded successfully');

      // Execute the rendering function
      const result = await page.evaluate(async (params, canvasSize, isTestMode, useFrontendLogic) => {
        return await window.renderPrintDesign(params, canvasSize, isTestMode, useFrontendLogic);
      }, designParams, canvasSize, isTestMode, options.useFrontendLogic);

      if (!result.success) {
        throw new Error(`Rendering failed: ${result.error}`);
      }

      logger.info('Print rendering completed', { 
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
            `prints/${options.orderId}/${Date.now()}-print.png`,
            printBuffer,
            'image/png',
            {
              orderId: options.orderId,
              type: 'print-file',
              dpi: result.dimensions.dpi,
              dimensions: `${result.dimensions.width}x${result.dimensions.height}`,
              generatedAt: new Date().toISOString()
            }
          );
          s3Url = uploadResult;
          logger.info('Print file uploaded to S3', { s3Url });
        } catch (s3Error) {
          logger.warn(`S3 not configured, skipping print file upload: ${s3Error.message}`);
        }
      }

      return {
        success: true,
        printBuffer,
        s3Url,
        dimensions: result.dimensions,
        metadata: {
          generatedAt: new Date().toISOString(),
          designParams,
          rendererVersion: '1.0.0'
        }
      };

    } catch (error) {
      logger.error('Print generation failed', { error: error.message, stack: error.stack });
      throw new Error(`Print generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate print file for preset products (background + text)
   * @param {Object} designParams - Design parameters including preset info
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generation result with composited image
   */
  async generatePresetPrintFile(designParams, options = {}) {
    let backgroundImagePath = null;
    
    try {
      logger.info('Starting preset print generation', { designParams, options });
      
      // Step 1: Generate text-only PNG (existing functionality)
      logger.info('Generating text PNG for preset product');
      const textResult = await this.generatePrintFile(designParams, options);
      
      if (!textResult.success) {
        throw new Error('Failed to generate text PNG for preset product');
      }
      
      // Step 2: Check if this is a preset product
      const presetId = this.extractPresetId(designParams);
      if (!presetId) {
        logger.warn('No preset ID found, treating as custom product');
        return textResult; // Fallback to text-only
      }
      
      logger.info(`Processing preset product: ${presetId}`);
      
      // Step 3: Fetch background image from the actual Printful product
      const PrintfulClient = require('./printful-client');
      const printfulClient = new PrintfulClient();
      
      try {
        // Get preset ID from design parameters
        if (!presetId) {
          throw new Error('Preset ID required for background fetch');
        }
        
        backgroundImagePath = await printfulClient.fetchBackgroundImageFromS3(presetId);
        logger.info('Background image fetched successfully from S3', { 
          backgroundImagePath, 
          presetId 
        });
      } catch (backgroundError) {
        logger.error('Failed to fetch background image from product, using text-only fallback:', backgroundError.message);
        return textResult; // Fallback to text-only
      }
      
      // Step 4: Composite text onto background
      logger.info('Compositing text onto background image');
      const compositedBuffer = await this.imageCompositor.compositeImages(
        backgroundImagePath,
        textResult.printBuffer
      );
      
      // Step 5: Upload composited image to S3
      let s3Url = null;
      if (options.orderId) {
        try {
          const uploadResult = await this.s3Storage.uploadBuffer(
            `prints/${options.orderId}/${Date.now()}-preset-print.png`,
            compositedBuffer,
            'image/png',
            {
              orderId: options.orderId,
              type: 'preset-print-file',
              presetId: presetId,
              dpi: textResult.dimensions.dpi,
              dimensions: `${textResult.dimensions.width}x${textResult.dimensions.height}`,
              generatedAt: new Date().toISOString()
            }
          );
          s3Url = uploadResult;
          logger.info('Preset print file uploaded to S3', { s3Url });
        } catch (s3Error) {
          logger.warn(`S3 not configured, skipping preset print file upload: ${s3Error.message}`);
        }
      }
      
      return {
        success: true,
        printBuffer: compositedBuffer,
        s3Url,
        dimensions: textResult.dimensions,
        metadata: {
          generatedAt: new Date().toISOString(),
          designParams,
          presetId: presetId,
          rendererVersion: '1.0.0',
          type: 'preset-product'
        }
      };
      
    } catch (error) {
      logger.error('Preset print generation failed', { error: error.message, stack: error.stack });
      throw new Error(`Preset print generation failed: ${error.message}`);
    } finally {
      // Clean up temporary background image file
      if (backgroundImagePath) {
        try {
          await this.imageCompositor.cleanupTempFiles([backgroundImagePath]);
        } catch (cleanupError) {
          logger.warn('Failed to clean up background image:', cleanupError.message);
        }
      }
    }
  }

  /**
   * Extract preset ID from design parameters
   * @param {Object} designParams - Design parameters
   * @returns {string|null} - Preset ID or null if not found
   */
  extractPresetId(designParams) {
    // Check for preset ID in various possible locations
    if (designParams.presetId) {
      return designParams.presetId;
    }
    
    if (designParams.preset_id) {
      return designParams.preset_id;
    }
    
    // Check for preset product type (both uppercase and lowercase)
    if (designParams.productType === 'PRESET_IMAGE' || designParams.productType === 'preset_image') {
      return designParams.presetId || designParams.preset_id;
    }
    
    // Check if design params contain preset information
    if (designParams.textCoordinates && designParams.textCoordinates.presetId) {
      return designParams.textCoordinates.presetId;
    }
    
    return null;
  }

  /**
   * Check if design parameters indicate a preset product
   * @param {Object} designParams - Design parameters
   * @returns {boolean} - True if preset product
   */
  isPresetProduct(designParams) {
    // Must have both productType indicating preset AND a valid presetId
    const isPresetType = designParams.productType === 'PRESET_IMAGE' || designParams.productType === 'preset_image';
    const presetId = this.extractPresetId(designParams);
    return isPresetType && presetId !== null && presetId !== undefined;
  }

  async generatePreview(designParams, options = {}) {
    // Generate a smaller preview version for testing
    const previewParams = {
      ...designParams,
      // Could add preview-specific scaling here if needed
    };

    return this.generatePrintFile(previewParams, {
      ...options,
      preview: true
    });
  }

  async validateDesignParams(designParams) {
    const required = ['text'];
    const missing = required.filter(field => !designParams[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required design parameters: ${missing.join(', ')}`);
    }

    // Validate font family
    const validFonts = [
      'Yuji Syuku',
      'Shippori Antique', 
      'Huninn',
      'Rampart One',
      'Cherry Bomb One'
    ];

    if (designParams.fontFamily && !validFonts.includes(designParams.fontFamily)) {
      throw new Error(`Invalid font family: ${designParams.fontFamily}`);
    }

    // Validate orientation
    if (designParams.orientation && !['horizontal', 'vertical'].includes(designParams.orientation)) {
      throw new Error(`Invalid orientation: ${designParams.orientation}`);
    }

    return true;
  }

  async testRenderer() {
    try {
      const testParams = {
        text: 'テスト',
        fontFamily: 'Yuji Syuku',
        fontSize: 40,
        color: '#000000',
        orientation: 'horizontal'
      };

      const result = await this.generatePrintFile(testParams);
      
      logger.info('Renderer test successful', {
        dimensions: result.dimensions,
        bufferSize: result.printBuffer.length
      });

      return {
        success: true,
        testResult: result
      };
    } catch (error) {
      logger.error('Renderer test failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PrintGenerator;
