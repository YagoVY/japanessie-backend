/**
 * Print specifications and configuration
 * These values must match the frontend configuration exactly
 */

const PRINT_SPECS = {
  // Print area dimensions in inches
  PRINT_AREA: {
    WIDTH_INCHES: 12,
    HEIGHT_INCHES: 16,
    DPI: 300
  },
  
  // Frontend canvas configuration
  CANVAS: {
    WIDTH: 600,
    HEIGHT: 600,
    DPI: 72
  },
  
  // Frontend print mapping (from frontend analysis)
  FRONTEND_MAPPING: {
    horizontal: { x: 200, y: 78, width: 200, height: 270 },
    vertical: { x: 200, y: 78, width: 200, height: 270 }
  },
  
  // Font configuration
  FONTS: {
    AVAILABLE: [
      'Yuji Syuku',
      'Shippori Antique', 
      'Huninn',
      'Rampart One',
      'Cherry Bomb One'
    ],
    DEFAULT: 'Yuji Syuku',
    MIN_SIZE: 12,
    MAX_SIZE: 100,
    DEFAULT_SIZE: 40
  },
  
  // Text rendering configuration
  TEXT: {
    LINE_HEIGHT: 1.1,
    LETTER_SPACING: 0.12,
    VERTICAL_SPACING: 0.85,
    HYPHEN_REPLACEMENT: {
      from: /[ー\-‒–—−﹘﹣－]/g,
      to: '｜'
    }
  },
  
  // Color configuration
  COLORS: {
    DEFAULT: '#FFFFFF',
    SUPPORTED_FORMATS: ['hex', 'rgb', 'rgba'],
    COLOR_PROFILE: 'sRGB'
  },
  
  // File formats and quality
  FILES: {
    PRINT_FORMAT: 'PNG',
    PREVIEW_FORMAT: 'PNG',
    PRINT_QUALITY: 100,
    PREVIEW_QUALITY: 90,
    MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB
  },
  
  // Printful product mapping
  PRINTFUL: {
    PRODUCT_TYPE: 'unisex-staple-t-shirt',
    VARIANT_MAP: {
      'XS-Black': 4011, 'S-Black': 4012, 'M-Black': 4013, 'L-Black': 4014,
      'XL-Black': 4015, 'XXL-Black': 4016, 'XXXL-Black': 4017,
      'XS-Navy': 4030, 'S-Navy': 4031, 'M-Navy': 4032, 'L-Navy': 4033,
      'XL-Navy': 4034, 'XXL-Navy': 4035, 'XXXL-Navy': 4036,
      'XS-White': 4251, 'S-White': 4252, 'M-White': 4253, 'L-White': 4254,
      'XL-White': 4255, 'XXL-White': 4256, 'XXXL-White': 4257,
      'XS-Military Green': 8603, 'S-Military Green': 8604, 'M-Military Green': 8605,
      'L-Military Green': 8606, 'XL-Military Green': 8607, 'XXL-Military Green': 8608,
      'XS-Sand': 8652, 'S-Sand': 8653, 'M-Sand': 8654, 'L-Sand': 8655,
      'XL-Sand': 8656, 'XXL-Sand': 8657, 'XXXL-Sand': 8658
    }
  },
  
  // Processing limits
  LIMITS: {
    MAX_PROCESSING_TIME: 30000, // 30 seconds
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000, // 5 seconds
    BATCH_SIZE: 10
  },
  
  // Validation thresholds
  VALIDATION: {
    MIN_ACCURACY: 95, // 95% accuracy required
    MAX_PIXEL_DIFFERENCES: 10,
    FONT_METRICS_TOLERANCE: 0.1 // 10% tolerance for font metrics
  }
};

/**
 * Calculate print dimensions in pixels
 */
function getPrintDimensions() {
  return {
    width: PRINT_SPECS.PRINT_AREA.WIDTH_INCHES * PRINT_SPECS.PRINT_AREA.DPI,
    height: PRINT_SPECS.PRINT_AREA.HEIGHT_INCHES * PRINT_SPECS.PRINT_AREA.DPI,
    dpi: PRINT_SPECS.PRINT_AREA.DPI
  };
}

/**
 * Calculate preview dimensions
 */
function getPreviewDimensions() {
  return {
    width: PRINT_SPECS.CANVAS.WIDTH,
    height: PRINT_SPECS.CANVAS.HEIGHT,
    dpi: PRINT_SPECS.CANVAS.DPI
  };
}

/**
 * Get scale factor between preview and print
 */
function getScaleFactor() {
  const printDims = getPrintDimensions();
  const previewDims = getPreviewDimensions();
  
  return {
    x: printDims.width / previewDims.width,
    y: printDims.height / previewDims.height
  };
}

/**
 * Validate print specifications
 */
function validateSpecs() {
  const errors = [];
  
  // Validate print area
  if (PRINT_SPECS.PRINT_AREA.WIDTH_INCHES <= 0 || PRINT_SPECS.PRINT_AREA.HEIGHT_INCHES <= 0) {
    errors.push('Print area dimensions must be positive');
  }
  
  // Validate DPI
  if (PRINT_SPECS.PRINT_AREA.DPI < 150 || PRINT_SPECS.PRINT_AREA.DPI > 600) {
    errors.push('Print DPI must be between 150 and 600');
  }
  
  // Validate canvas dimensions
  if (PRINT_SPECS.CANVAS.WIDTH <= 0 || PRINT_SPECS.CANVAS.HEIGHT <= 0) {
    errors.push('Canvas dimensions must be positive');
  }
  
  // Validate font configuration
  if (PRINT_SPECS.FONTS.AVAILABLE.length === 0) {
    errors.push('At least one font must be available');
  }
  
  if (PRINT_SPECS.FONTS.MIN_SIZE >= PRINT_SPECS.FONTS.MAX_SIZE) {
    errors.push('Minimum font size must be less than maximum font size');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get Printful variant ID for size and color combination
 */
function getPrintfulVariantId(size, color) {
  const key = `${size}-${color}`;
  const variantId = PRINT_SPECS.PRINTFUL.VARIANT_MAP[key];
  
  if (!variantId) {
    throw new Error(`Unknown variant combination: ${key}`);
  }
  
  return variantId;
}

/**
 * Get available sizes and colors
 */
function getAvailableVariants() {
  const variants = Object.keys(PRINT_SPECS.PRINTFUL.VARIANT_MAP);
  const sizes = [...new Set(variants.map(v => v.split('-')[0]))];
  const colors = [...new Set(variants.map(v => v.split('-').slice(1).join('-')))];;
  
  return { sizes, colors, variants };
}

module.exports = {
  PRINT_SPECS,
  getPrintDimensions,
  getPreviewDimensions,
  getScaleFactor,
  validateSpecs,
  getPrintfulVariantId,
  getAvailableVariants
};
