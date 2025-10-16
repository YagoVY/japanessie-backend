// services/print-generator.js
// NOTE: Inline tiny helpers to avoid module resolution issues.

console.log('[BOOT] print-generator loaded');

let logger = console;

function withTimeout(promise, ms, label = 'operation') {
  let to;
  const timeout = new Promise((_, rej) => {
    to = setTimeout(() => rej(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(to));
}

let getBrowser;
try {
  // Prefer local helper (CJS) to launch Puppeteer singleton
  ({ getBrowser } = require('./puppeteer'));
} catch (e) {
  // Log a clear error if services/puppeteer.js is missing or path is wrong
  console.error('[BOOT] Failed to load ./puppeteer from services/print-generator.js', e);
  throw e;
}

// Render minimal HTML for the text → PNG
function renderHtml(designParams) {
  const { canvasSize = { width: 600, height: 600 }, fontFamily = 'Yuji Syuku', fontColor = '#000', textCoordinates } = designParams;
  const color = designParams.color || fontColor;

  const textLayers = (textCoordinates?.coordinates || []).map(c => (
    `<span style="position:absolute; left:${c.x}px; top:${c.y}px; font-size:${c.fontSize}px; font-family:'${fontFamily}', sans-serif; color:${color}; line-height:1">${c.char}</span>`
  )).join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: https:; style-src 'unsafe-inline' https: data:; img-src 'self' data: https:;" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Yuji+Syuku&display=swap" rel="stylesheet">
    <style>
      html, body { margin:0; padding:0; }
      .stage { position: relative; width: ${canvasSize.width}px; height: ${canvasSize.height}px; background: transparent; }
      .stage * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    </style>
  </head>
  <body>
    <div class="stage">${textLayers}</div>
  </body>
</html>`;
}

const path = require('path');
const fs = require('fs').promises;
const S3StorageService = require('./s3-storage');
const ImageCompositor = require('./image-compositor');

// Retry utility for Chrome startup
async function withRetry(fn, {retries = 2, delayMs = 500} = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { 
      return await fn(); 
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      logger.warn(`Chrome startup attempt ${i + 1} failed, retrying in ${delayMs * (i + 1)}ms:`, e.message);
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

// Try to load logger, fallback to console if not available
try {
  logger = require('../utils/logger');
} catch (e) {
  console.warn('[BOOT] Using console logger fallback');
  logger = console;
}

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
    return await this.generateTextPng(designParams, options);
  }

  async generateTextPng(designParams, options = {}) {
    const start = Date.now();
    let page;
    try {
      const browser = await getBrowser();
      page = await browser.newPage();

      await withTimeout(page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 2 }), 4000, 'setViewport');
      await withTimeout(page.setContent(renderHtml(designParams), { waitUntil: 'networkidle0' }), 10000, 'setContent');

      try {
        await withTimeout(
          page.evaluate(() => (document.fonts && document.fonts.ready) ? document.fonts.ready : null),
          8000,
          'fonts.ready'
        );
      } catch (_) { /* ignore if fonts API unavailable */ }

      await new Promise(r => setTimeout(r, 150));

      const buf = await withTimeout(page.screenshot({ type: 'png', omitBackground: true }), 8000, 'screenshot');
      logger.info('✅ Print PNG generated', { service: 'tshirt-designer-backend', ms: Date.now() - start });
      
      // Upload to S3
      const uploadResult = await this.s3Storage.uploadPrintFile(buf, {
        orderId: options.orderId,
        lineItemId: options.lineItemId,
        designParams: designParams
      });

      return {
        success: true,
        printBuffer: buf,
        s3Url: uploadResult.s3Url,
        dimensions: { width: 1024, height: 1024 },
        designParams,
        rendererVersion: '1.0.0'
      };
    } catch (err) {
      logger.error('❌ Print generation failed', { service: 'tshirt-designer-backend', err: err?.message, stack: err?.stack });
      throw err;
    } finally {
      try { if (page && !page.isClosed()) await page.close(); } catch {}
    }
  }

  async _generatePrintFileInternal(designParams, options = {}) {
    let browser = null;
    
    try {
      logger.info('Starting print generation with Puppeteer', { designParams, options });
      
      // Determine canvas size from options
      const canvasSize = options.canvasSize || { width: 3600, height: 4800 };
      const isTestMode = options.canvasSize !== undefined;
      
      // Launch headless browser with bundled Chrome
      const launchOptions = {
        headless: 'new', // use new headless; avoids deprecation + is stabler
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',       // avoid /dev/shm crashes
          '--disable-gpu',
          '--no-zygote',
          '--disable-features=IsolateOrigins,site-per-process',
          '--js-flags=--max_old_space_size=128',
          '--font-render-hinting=none'
        ]
        // Do NOT set executablePath; let Puppeteer use its bundled Chromium
      };

      logger.info('Using bundled Puppeteer Chrome');
      browser = await withRetry(() => puppeteer.launch(launchOptions), {retries: 2, delayMs: 700});

      const page = await withTimeout(browser.newPage(), 4000, 'newPage');
      
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
      await withTimeout(page.setViewport({
        width: canvasSize.width,
        height: canvasSize.height,
        deviceScaleFactor: 1
      }), 4000, 'setViewport');

      // Load the print renderer HTML with embedded fonts
      const htmlContent = await this.prepareHtmlWithFonts();
      await withTimeout(page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      }), 10000, 'setContent');

      // Wait for the renderer to be ready
      await withTimeout(page.waitForFunction(() => window.printRendererReady === true, {
        timeout: 10000
      }), 8000, 'waitForRenderer');

      logger.info('Print renderer loaded successfully');

      // Execute the rendering function
      const result = await withTimeout(page.evaluate(async (params, canvasSize, isTestMode, useFrontendLogic) => {
        return await window.renderPrintDesign(params, canvasSize, isTestMode, useFrontendLogic);
      }, designParams, canvasSize, isTestMode, options.useFrontendLogic), 15000, 'pageEvaluate');

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
      // Always clean up page and browser to prevent memory leaks
      try {
        if (page && !page.isClosed()) {
          await page.close();
        }
      } catch (cleanupError) {
        logger.warn('Failed to close page:', cleanupError.message);
      }
      
      try {
        if (browser) {
          await browser.close();
        }
      } catch (cleanupError) {
        logger.warn('Failed to close browser:', cleanupError.message);
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
