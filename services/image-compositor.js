const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');

/**
 * Image Compositor Service
 * 
 * Handles compositing text PNGs onto background images for preset products.
 * Uses Sharp library for high-quality image processing.
 */
class ImageCompositor {
  constructor() {
    this.tempDir = os.tmpdir();
  }

  /**
   * Composite text PNG onto background image
   * @param {string} backgroundImagePath - Path to background image file
   * @param {Buffer} textPNGBuffer - Text PNG as buffer
   * @param {Object} options - Composition options
   * @returns {Promise<Buffer>} - Final composited image as buffer
   */
  async compositeImages(backgroundImagePath, textPNGBuffer, options = {}) {
    try {
      logger.info('[ImageCompositor] Starting image composition', {
        backgroundPath: backgroundImagePath,
        textBufferSize: textPNGBuffer.length,
        options
      });

      // Validate inputs
      if (!fs.existsSync(backgroundImagePath)) {
        throw new Error(`Background image not found: ${backgroundImagePath}`);
      }

      if (!textPNGBuffer || textPNGBuffer.length === 0) {
        throw new Error('Text PNG buffer is empty or invalid');
      }

      // Load background image with Sharp
      const background = sharp(backgroundImagePath);
      
      // Get background image metadata
      const backgroundMetadata = await background.metadata();
      logger.info('[ImageCompositor] Background image metadata', {
        width: backgroundMetadata.width,
        height: backgroundMetadata.height,
        format: backgroundMetadata.format,
        channels: backgroundMetadata.channels
      });

      // Load text PNG with Sharp
      const text = sharp(textPNGBuffer);
      
      // Get text image metadata
      const textMetadata = await text.metadata();
      logger.info('[ImageCompositor] Text image metadata', {
        width: textMetadata.width,
        height: textMetadata.height,
        format: textMetadata.format,
        channels: textMetadata.channels
      });

      // Ensure both images are the same size (3600x4800)
      const targetWidth = 3600;
      const targetHeight = 4800;

      if (backgroundMetadata.width !== targetWidth || backgroundMetadata.height !== targetHeight) {
        logger.warn('[ImageCompositor] Resizing background image to target dimensions', {
          from: `${backgroundMetadata.width}x${backgroundMetadata.height}`,
          to: `${targetWidth}x${targetHeight}`
        });
        background.resize(targetWidth, targetHeight, {
          fit: 'fill', // Stretch to exact dimensions
          kernel: sharp.kernel.lanczos3
        });
      }

      if (textMetadata.width !== targetWidth || textMetadata.height !== targetHeight) {
        logger.warn('[ImageCompositor] Resizing text image to target dimensions', {
          from: `${textMetadata.width}x${textMetadata.height}`,
          to: `${targetWidth}x${targetHeight}`
        });
        text.resize(targetWidth, targetHeight, {
          fit: 'fill', // Stretch to exact dimensions
          kernel: sharp.kernel.lanczos3
        });
      }

      // Composite text on top of background
      const compositeOptions = {
        input: await text.toBuffer(),
        blend: options.blend || 'over', // Default to 'over' blend mode
        gravity: options.gravity || 'northwest' // Default to top-left positioning
      };

      logger.info('[ImageCompositor] Compositing with options', compositeOptions);

      const finalImage = await background
        .composite([compositeOptions])
        .png({
          quality: 100, // Maximum quality
          compressionLevel: 0, // No compression for best quality
          adaptiveFiltering: false
        })
        .toBuffer();

      logger.info('[ImageCompositor] Composition completed successfully', {
        finalImageSize: finalImage.length,
        finalImageSizeKB: Math.round(finalImage.length / 1024)
      });

      return finalImage;

    } catch (error) {
      logger.error('[ImageCompositor] Composition failed:', error);
      throw new Error(`Image composition failed: ${error.message}`);
    }
  }

  /**
   * Composite with custom positioning
   * @param {string} backgroundImagePath - Path to background image
   * @param {Buffer} textPNGBuffer - Text PNG buffer
   * @param {Object} position - Custom positioning options
   * @returns {Promise<Buffer>} - Composited image buffer
   */
  async compositeWithPosition(backgroundImagePath, textPNGBuffer, position = {}) {
    try {
      logger.info('[ImageCompositor] Starting positioned composition', {
        backgroundPath: backgroundImagePath,
        position
      });

      const background = sharp(backgroundImagePath);
      const text = sharp(textPNGBuffer);

      // Get dimensions
      const backgroundMetadata = await background.metadata();
      const textMetadata = await text.metadata();

      // Calculate position (default to center)
      const x = position.x || Math.floor((backgroundMetadata.width - textMetadata.width) / 2);
      const y = position.y || Math.floor((backgroundMetadata.height - textMetadata.height) / 2);

      logger.info('[ImageCompositor] Calculated position', {
        x, y,
        backgroundSize: `${backgroundMetadata.width}x${backgroundMetadata.height}`,
        textSize: `${textMetadata.width}x${textMetadata.height}`
      });

      const finalImage = await background
        .composite([{
          input: await text.toBuffer(),
          blend: 'over',
          left: x,
          top: y
        }])
        .png({
          quality: 100,
          compressionLevel: 0
        })
        .toBuffer();

      return finalImage;

    } catch (error) {
      logger.error('[ImageCompositor] Positioned composition failed:', error);
      throw new Error(`Positioned composition failed: ${error.message}`);
    }
  }

  /**
   * Create a temporary file path for composition output
   * @param {string} prefix - File prefix
   * @returns {string} - Temporary file path
   */
  createTempFilePath(prefix = 'composited') {
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
    return path.join(this.tempDir, filename);
  }

  /**
   * Clean up temporary files
   * @param {string[]} filePaths - Array of file paths to clean up
   */
  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info('[ImageCompositor] Cleaned up temp file:', filePath);
        }
      } catch (error) {
        logger.warn('[ImageCompositor] Failed to clean up temp file:', filePath, error.message);
      }
    }
  }

  /**
   * Validate image file
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} - Image metadata
   */
  async validateImage(imagePath) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      const metadata = await sharp(imagePath).metadata();
      
      logger.info('[ImageCompositor] Image validation successful', {
        path: imagePath,
        metadata
      });

      return metadata;
    } catch (error) {
      logger.error('[ImageCompositor] Image validation failed:', error);
      throw new Error(`Image validation failed: ${error.message}`);
    }
  }
}

module.exports = ImageCompositor;
