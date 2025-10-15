# Print Composition Logic and Parameters

## Overview

The print composition system creates high-resolution print files (3600x4800 pixels at 300 DPI) from frontend design data. The system uses two main approaches:

1. **Frontend Coordinate Capture** - Uses exact coordinates from the frontend
2. **Backend Layout Recreation** - Recreates the layout using backend logic

## Frontend Data Structure

### Input Parameters from Frontend

The system receives the following parameters from the frontend:

```javascript
{
  // Core text parameters
  text: "テスト",                    // The actual text to render
  fontFamily: "Yuji Syuku",         // Font family name
  fontSize: 40,                     // Font size in pixels
  color: "#000000",                 // Text color (hex)
  orientation: "horizontal",        // "horizontal" or "vertical"
  letterSpacing: 1.0,              // Custom letter spacing multiplier (optional)
  
  // Coordinate data (when available)
  textCoordinates: {
    coordinates: [                  // Array of character positions
      {
        x: 245.5,                   // X position relative to print area
        y: 158.2,                   // Y position relative to print area
        char: "テ",                 // Character being positioned
        width: 28.4                 // Character width
      },
      // ... more character positions
    ],
    printArea: {                    // Print area dimensions
      width: 194,                   // Print area width
      height: 264,                  // Print area height
      x: 203,                       // Print area X offset
      y: 81                         // Print area Y offset
    },
    text: "テスト"                  // Original text for reference
  },
  
  // Product type information
  productType: "PRESET_IMAGE",     // Indicates preset product
  presetId: "ja-umbrella",         // Preset identifier
  preset_id: "ja-umbrella"         // Alternative preset ID field
}
```

## Print Specifications

### Canvas Dimensions

```javascript
// Frontend Canvas (preview)
CANVAS: {
  WIDTH: 600,      // Frontend canvas width
  HEIGHT: 600,     // Frontend canvas height
  DPI: 72          // Frontend DPI
}

// Print Canvas (final output)
PRINT_AREA: {
  WIDTH_INCHES: 12,    // 12 inches wide
  HEIGHT_INCHES: 16,   // 16 inches tall
  DPI: 300             // 300 DPI for print quality
}

// Calculated pixel dimensions
printWidth: 3600,      // 12" × 300 DPI
printHeight: 4800      // 16" × 300 DPI
```

### Print Area Mapping

```javascript
// Frontend print area mapping (within 600x600 canvas)
FRONTEND_MAPPING: {
  horizontal: { 
    x: 200,        // Print area X position
    y: 78,         // Print area Y position  
    width: 200,    // Print area width
    height: 270    // Print area height
  },
  vertical: { 
    x: 200,        // Same mapping for vertical
    y: 78,
    width: 200,
    height: 270
  }
}
```

### Font Configuration

```javascript
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
}
```

### Text Rendering Constants

```javascript
TEXT: {
  LINE_HEIGHT: 1.1,           // Line height multiplier
  LETTER_SPACING: 0.12,       // Letter spacing (12% of font size)
  VERTICAL_SPACING: 0.85,     // Vertical spacing multiplier
  HYPHEN_REPLACEMENT: {
    from: /[ー\-‒–—−﹘﹣－]/g,  // Replace various hyphens
    to: '｜'                   // With vertical line
  }
}
```

## Composition Logic

### 1. Frontend Coordinate Capture (Preferred Method)

When frontend coordinates are available:

```javascript
// Check for frontend coordinate data
if (designParams.textCoordinates && designParams.textCoordinates.coordinates) {
  // Use frontend coordinates directly
  layout = {
    fits: true,
    fontSize: fontSize,
    lines: [text],
    positions: designParams.textCoordinates.coordinates.map(coord => ({
      x: coord.x,
      y: coord.y,
      line: coord.char || text,
      useReducedSpacing: false,
      frontendCoordinate: true  // Flag for special handling
    })),
    textArea: designParams.textCoordinates.printArea,
    printArea: designParams.textCoordinates.printArea,
    source: 'frontend-coordinates'
  };
}
```

### 2. Backend Layout Recreation (Fallback Method)

When frontend coordinates are not available, the system recreates the layout:

#### Text Area Calculation

```javascript
function getTextArea(orientation = 'horizontal') {
  const mapping = FRONTEND_MAPPING[orientation];
  
  return {
    x: mapping.x + margins.left,                    // 200 + 3 = 203
    y: mapping.y + margins.top,                     // 78 + 3 = 81
    width: mapping.width - margins.left - margins.right,  // 200 - 3 - 3 = 194
    height: mapping.height - margins.top - margins.bottom // 270 - 3 - 3 = 264
  };
}
```

#### Horizontal Text Positioning

```javascript
function getHorizontalPositioning(textArea, fontSize, lines, ctx) {
  const startY = textArea.y + fontSize * 1.6;      // 81 + (40 * 1.6) = 145
  const lineHeight = fontSize * 1.1;               // 40 * 1.1 = 44
  
  const positions = lines.map((line, index) => {
    const metrics = ctx.measureText(line);
    const x = textArea.x + (textArea.width - metrics.width) / 2;  // Center horizontally
    const y = startY + (index * lineHeight);
    
    return { x, y, line, metrics };
  });
  
  return { positions, startY, lineHeight };
}
```

#### Character-by-Character Positioning

```javascript
// Calculate exact character positions
const characterPositions = [];
let currentX = position.x;  // Start at centered X position
const currentY = position.y; // Use calculated Y position

for (let i = 0; i < text.length; i++) {
  const char = text[i];
  const charMetrics = ctx.measureText(char);
  const charWidth = charMetrics.width;
  
  characterPositions.push({
    char: char,
    x: currentX,
    y: currentY,
    width: charWidth,
    metrics: charMetrics
  });
  
  // Move to next character position
  currentX += charWidth;
}
```

## Scaling and Rendering

### Coordinate Scaling

```javascript
// Scale frontend coordinates to print resolution
if (position.frontendCoordinate) {
  // Frontend coordinates are in print area coordinate system
  const printAreaScaleX = printWidth / layout.printArea.width;   // 3600 / 194 = 18.56
  const printAreaScaleY = printHeight / layout.printArea.height; // 4800 / 264 = 18.18
  
  printX = position.x * printAreaScaleX;  // Scale X coordinate
  printY = position.y * printAreaScaleY;  // Scale Y coordinate
}
```

### Font Scaling

```javascript
// Scale font size to print resolution
const printFontSize = fontSize * Math.max(printAreaScaleX, printAreaScaleY);
ctx.font = `${printFontSize}px ${fontFamily}`;
```

### Final Rendering

```javascript
// Set up print context
ctx.fillStyle = color;
ctx.textAlign = 'left';
ctx.textBaseline = 'alphabetic';

// Render each character at calculated position
for (let i = 0; i < layout.positions.length; i++) {
  const position = layout.positions[i];
  const printX = position.x * printAreaScaleX;
  const printY = position.y * printAreaScaleY;
  
  ctx.fillText(position.line, printX, printY);
}
```

## Preset Product Composition

For preset products (like `ja-umbrella`), the system:

1. **Generates text-only PNG** using the above logic
2. **Fetches background image** from S3 using preset ID
3. **Composites text onto background** using image composition
4. **Returns final composited image**

```javascript
// Preset product workflow
async generatePresetPrintFile(designParams, options = {}) {
  // Step 1: Generate text PNG
  const textResult = await this.generatePrintFile(designParams, options);
  
  // Step 2: Extract preset ID
  const presetId = this.extractPresetId(designParams);
  
  // Step 3: Fetch background from S3
  const backgroundImagePath = await printfulClient.fetchBackgroundImageFromS3(presetId);
  
  // Step 4: Composite text onto background
  const compositedBuffer = await this.imageCompositor.compositeImages(
    backgroundImagePath,
    textResult.printBuffer
  );
  
  return { success: true, printBuffer: compositedBuffer, ... };
}
```

## LetterSpacing Support

The system now supports custom `letterSpacing` for preset products:

### Frontend Integration
- Preset configs can specify `letterSpacing: 1.0` (e.g., ja-umbrella preset)
- Preset configs can specify `fontSize: 11px` (actual size, not default 40px)
- Frontend calculates coordinates using the custom spacing and actual font size
- Coordinates are sent to backend with `letterSpacingApplied` flag

### Backend Handling
- **Primary Method**: Uses frontend coordinates directly (no recalculation)
- **Fallback Method**: Applies custom letterSpacing in backend calculations
- **Scaling**: Coordinates are scaled 18x to print resolution

### Example: ja-umbrella Preset
```javascript
{
  fontSize: 11,        // Actual font size (not default 40px)
  letterSpacing: 1.0,  // Custom spacing multiplier
  textCoordinates: {
    fontSize: 11,      // Coordinates calculated with actual font size
    coordinates: [...], // Calculated with fontSize: 11px and letterSpacing: 1.0
    letterSpacingApplied: 1.0
  }
}
```

## Key Parameters Summary

| Parameter | Frontend Value | Print Value | Scale Factor |
|-----------|---------------|-------------|--------------|
| Canvas Width | 600px | 3600px | 6x |
| Canvas Height | 600px | 4800px | 8x |
| Print Area X | 200px | 3600px | 18x |
| Print Area Y | 78px | 1404px | 18x |
| Print Area Width | 200px | 3600px | 18x |
| Print Area Height | 270px | 4860px | 18x |
| Font Size | 11px (actual) | 204px | 18x |
| Letter Spacing | 1.0 (custom) | 18.0 (scaled) | 18x |
| DPI | 72 | 300 | 4.17x |

## Critical Constants

- **Print Area Mapping**: `{ x: 200, y: 78, width: 200, height: 270 }`
- **Margins**: `{ top: 3, bottom: 3, left: 3, right: 3 }`
- **Line Height**: `1.1` (fontSize * 1.1)
- **Vertical Start**: `fontSize * 1.6` for horizontal text
- **Letter Spacing**: `0.12` (12% of font size)
- **Scale Factor**: `18x` from frontend to print resolution

This system ensures pixel-perfect reproduction of frontend designs at print quality resolution.
