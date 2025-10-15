/**
 * Exact Frontend Constants
 * 
 * These are the EXACT constants and calculations from the frontend
 * that the backend must use to match visual output perfectly.
 */

const EXACT_FRONTEND_CONFIG = {
  // Canvas Configuration (from text-layout-engine.js lines 19-33)
  canvasMapping: {
    horizontal: {
      x: 200, 
      y: 78,
      width: 200, 
      height: 270
    }
  },

  // Margins (from text-layout-engine.js)
  margins: {
    top: 3, 
    bottom: 3, 
    left: 3, 
    right: 3
  },

  // Spacing Constants (from text-layout-engine.js)
  lineSpacing: 1.1,  // NOT 1.2 or any other value (line 43)
  
  verticalSpacing: {
    charSpacingMultiplier: 0.85,  // lines 46-49
    columnMarginFactor: 0.3
  }
};

/**
 * Get exact text area calculation (from text-layout-engine.js lines 66-72)
 */
function getExactTextArea(orientation = 'horizontal') {
  const mapping = EXACT_FRONTEND_CONFIG.canvasMapping[orientation];
  return {
    x: mapping.x + EXACT_FRONTEND_CONFIG.margins.left,
    y: mapping.y + EXACT_FRONTEND_CONFIG.margins.top,
    width: mapping.width - EXACT_FRONTEND_CONFIG.margins.left - EXACT_FRONTEND_CONFIG.margins.right,
    height: mapping.height - EXACT_FRONTEND_CONFIG.margins.top - EXACT_FRONTEND_CONFIG.margins.bottom
  };
}

/**
 * Exact horizontal text positioning logic (from text-layout-engine.js lines 266-268, 270-279)
 */
function getExactHorizontalPositioning(textArea, fontSize, lines, ctx) {
  const startY = textArea.y + fontSize * 1.6;  // Specific 1.6x multiplier (line 266-268)
  const lineHeight = fontSize * EXACT_FRONTEND_CONFIG.lineSpacing; // fontSize * 1.1
  
  const positions = lines.map((line, index) => {
    const metrics = ctx.measureText(line);
    const x = textArea.x + (textArea.width - metrics.width) / 2;  // Center horizontally (line 270-279)
    const y = startY + (index * lineHeight);  // lineHeight = fontSize * 1.1
    
    return {
      x: x,
      y: y,
      line: line,
      metrics: metrics
    };
  });
  
  return {
    positions: positions,
    startY: startY,
    lineHeight: lineHeight
  };
}

/**
 * Exact vertical text positioning logic (from text-layout-engine.js lines 245-247)
 */
function getExactVerticalPositioning(textArea, fontSize, lines, ctx) {
  const startY = textArea.y + fontSize * 0.85;  // 0.85x multiplier (line 245-247)
  const columnX = textArea.x + (textArea.width / 2 + 45);  // +45px offset (line 245-247)
  const lineHeight = fontSize * EXACT_FRONTEND_CONFIG.lineSpacing;
  const charSpacing = lineHeight * EXACT_FRONTEND_CONFIG.verticalSpacing.charSpacingMultiplier; // lineHeight * 0.85
  
  // Implementation would continue with vertical text logic...
  return {
    startY: startY,
    columnX: columnX,
    lineHeight: lineHeight,
    charSpacing: charSpacing
  };
}

/**
 * Exact letter spacing for horizontal text (from tshirt-designer.js lines 400-410)
 */
function getExactLetterSpacing(position, layout, ctx) {
  if (position.useReducedSpacing && position.line.length > 1) {
    const reduction = position.letterSpacingReduction || 0;
    const extraSpacing = layout.fontSize * 0.12;  // 12% of font size (line 400-410)
    
    return {
      reduction: reduction,
      extraSpacing: extraSpacing,
      useReducedSpacing: true
    };
  }
  
  return {
    reduction: 0,
    extraSpacing: 0,
    useReducedSpacing: false
  };
}

/**
 * Calculate exact character positions using frontend logic
 * @param {string} text - Text to position
 * @param {string} fontFamily - Font family name
 * @param {number} fontSize - Font size in pixels
 * @param {string} color - Text color
 * @param {string} orientation - Text orientation ('horizontal' or 'vertical')
 * @param {CanvasRenderingContext2D} ctx - Canvas context for measurements
 * @param {number} letterSpacing - Custom letter spacing multiplier (optional)
 */
function calculateExactCharacterPositions(text, fontFamily, fontSize, color, orientation = 'horizontal', ctx, letterSpacing = null) {
  // Set up context exactly like frontend
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  
  // Get exact text area
  const textArea = getExactTextArea(orientation);
  
  // Get exact positioning
  const positioning = getExactHorizontalPositioning(textArea, fontSize, [text], ctx);
  const position = positioning.positions[0];
  
  // Calculate exact character positions
  const characterPositions = [];
  let currentX = position.x;
  const currentY = position.y;
  
  // Determine letter spacing multiplier
  const spacingMultiplier = letterSpacing !== null ? letterSpacing : EXACT_FRONTEND_CONFIG.verticalSpacing.charSpacingMultiplier;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charMetrics = ctx.measureText(char);
    const charWidth = charMetrics.width;
    
    characterPositions.push({
      char: char,
      x: currentX,
      y: currentY,
      width: charWidth,
      metrics: charMetrics,
      exactFrontendLogic: true,
      letterSpacing: letterSpacing,
      spacingMultiplier: spacingMultiplier
    });
    
    // Move to next character position with custom spacing
    if (orientation === 'vertical' && i < text.length - 1) {
      // For vertical text, apply letter spacing between characters
      const lineHeight = fontSize * EXACT_FRONTEND_CONFIG.lineSpacing;
      const charSpacing = lineHeight * spacingMultiplier;
      currentX += charSpacing;
    } else {
      // For horizontal text, use character width
      currentX += charWidth;
    }
  }
  
  return {
    characterPositions: characterPositions,
    textArea: textArea,
    positioning: positioning,
    exactConstants: EXACT_FRONTEND_CONFIG,
    letterSpacing: letterSpacing,
    spacingMultiplier: spacingMultiplier
  };
}

module.exports = {
  EXACT_FRONTEND_CONFIG,
  getExactTextArea,
  getExactHorizontalPositioning,
  getExactVerticalPositioning,
  getExactLetterSpacing,
  calculateExactCharacterPositions
};
