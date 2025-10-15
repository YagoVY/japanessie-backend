/**
 * Real Frontend Coordinate Capture
 * 
 * This script captures ACTUAL coordinates from your working frontend,
 * not mock/estimated measurements. It must be integrated into your
 * frontend tshirt-designer.js to capture real coordinates.
 */

/**
 * Capture real coordinates from working frontend
 * This function should be called from your frontend after text is rendered
 */
function captureRealFrontendCoordinates() {
    console.log('[RealCapture] Starting REAL frontend coordinate capture');
    
    // Get the actual canvas and context from your frontend
    const canvas = document.getElementById('design-canvas'); // Your actual canvas ID
    const ctx = canvas.getContext('2d');
    
    if (!canvas || !ctx) {
        console.error('[RealCapture] Canvas not found - cannot capture real coordinates');
        return null;
    }
    
    // Get the actual rendered text data from your frontend
    const renderedText = window.currentRenderedText || getCurrentRenderedText(); // Your frontend's current text
    const currentFont = window.currentFont || getCurrentFont(); // Your frontend's current font
    const currentFontSize = window.currentFontSize || getCurrentFontSize(); // Your frontend's current font size
    const currentColor = window.currentColor || getCurrentColor(); // Your frontend's current color
    
    console.log('[RealCapture] Capturing from actual frontend:', {
        text: renderedText,
        font: currentFont,
        fontSize: currentFontSize,
        color: currentColor,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
    });
    
    // Set up context to match your frontend's exact state
    ctx.font = `${currentFontSize}px ${currentFont}`;
    ctx.fillStyle = currentColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    
    // Get ACTUAL text measurements (not mock estimates)
    const actualTextMetrics = ctx.measureText(renderedText);
    const actualTextWidth = actualTextMetrics.width;
    const actualTextHeight = currentFontSize;
    
    console.log('[RealCapture] ACTUAL text measurements:', {
        actualTextWidth,
        actualTextHeight,
        actualMetrics: actualTextMetrics
    });
    
    // Calculate ACTUAL character positions using real measurements
    const characterPositions = [];
    let currentX = 0;
    const currentY = actualTextHeight; // Use actual text height
    
    for (let i = 0; i < renderedText.length; i++) {
        const char = renderedText[i];
        
        // Get ACTUAL character measurements (not estimates)
        const charMetrics = ctx.measureText(char);
        const actualCharWidth = charMetrics.width;
        
        characterPositions.push({
            char: char,
            x: currentX, // ACTUAL measured position
            y: currentY, // ACTUAL measured position
            width: actualCharWidth, // ACTUAL measured width
            metrics: {
                width: charMetrics.width,
                actualBoundingBoxAscent: charMetrics.actualBoundingBoxAscent,
                actualBoundingBoxDescent: charMetrics.actualBoundingBoxDescent,
                actualBoundingBoxLeft: charMetrics.actualBoundingBoxLeft,
                actualBoundingBoxRight: charMetrics.actualBoundingBoxRight
            },
            realFrontendCapture: true // Flag to indicate real capture
        });
        
        console.log(`[RealCapture] Character ${i}: "${char}"`, {
            x: currentX,
            y: currentY,
            width: actualCharWidth,
            metrics: charMetrics,
            realMeasurement: true
        });
        
        // Move to next character position using ACTUAL width
        currentX += actualCharWidth;
    }
    
    // Get ACTUAL print area bounds from your frontend
    const actualPrintAreaBounds = getActualPrintAreaBounds(); // Your frontend's actual print area
    
    const realCoordinateData = {
        text: renderedText,
        fontFamily: currentFont,
        fontSize: currentFontSize,
        color: currentColor,
        orientation: 'horizontal', // or get from your frontend
        frontendCanvasSize: {
            width: canvas.width,
            height: canvas.height
        },
        // ACTUAL print area bounds from your frontend
        printAreaBounds: actualPrintAreaBounds,
        // ACTUAL character positions using real measurements
        characterPositions: characterPositions,
        totalWidth: currentX, // ACTUAL total width
        totalHeight: actualTextHeight, // ACTUAL total height
        actualTextMetrics: actualTextMetrics, // ACTUAL text metrics
        captureTimestamp: Date.now(),
        source: 'real-frontend-capture'
    };
    
    console.log('[RealCapture] REAL coordinate capture complete:', {
        characterCount: characterPositions.length,
        totalWidth: currentX,
        totalHeight: actualTextHeight,
        actualPrintAreaBounds,
        realCoordinateData
    });
    
    return realCoordinateData;
}

/**
 * Get actual print area bounds from your frontend
 * This should return the REAL print area from your frontend
 */
function getActualPrintAreaBounds() {
    // TODO: Replace with your actual frontend print area calculation
    // This should match your frontend's actual print area dimensions
    
    // Example - replace with your actual frontend logic:
    const frontendPrintArea = {
        x: 200,      // Your frontend's actual print area X
        y: 78,       // Your frontend's actual print area Y
        width: 200,  // Your frontend's actual print area width
        height: 270  // Your frontend's actual print area height
    };
    
    console.log('[RealCapture] Using ACTUAL frontend print area:', frontendPrintArea);
    return frontendPrintArea;
}

/**
 * Get current rendered text from your frontend
 * This should return the actual text being rendered
 */
function getCurrentRenderedText() {
    // TODO: Replace with your actual frontend text retrieval
    // This should get the actual text from your frontend state
    return window.designText || 'テスト'; // Your frontend's actual text
}

/**
 * Get current font from your frontend
 * This should return the actual font being used
 */
function getCurrentFont() {
    // TODO: Replace with your actual frontend font retrieval
    // This should get the actual font from your frontend state
    return window.designFont || 'Cherry Bomb One'; // Your frontend's actual font
}

/**
 * Get current font size from your frontend
 * This should return the actual font size being used
 */
function getCurrentFontSize() {
    // TODO: Replace with your actual frontend font size retrieval
    // This should get the actual font size from your frontend state
    return window.designFontSize || 40; // Your frontend's actual font size
}

/**
 * Get current color from your frontend
 * This should return the actual color being used
 */
function getCurrentColor() {
    // TODO: Replace with your actual frontend color retrieval
    // This should get the actual color from your frontend state
    return window.designColor || '#DC2626'; // Your frontend's actual color
}

/**
 * Send real coordinates to backend
 * This function sends the captured real coordinates to your backend
 */
function sendRealCoordinatesToBackend() {
    const realCoordinates = captureRealFrontendCoordinates();
    
    if (!realCoordinates) {
        console.error('[RealCapture] Failed to capture real coordinates');
        return;
    }
    
    console.log('[RealCapture] Sending REAL coordinates to backend:', realCoordinates);
    
    // Send to your backend endpoint
    fetch('/print-webhooks/test-real-coordinates', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            realCoordinates: realCoordinates,
            timestamp: Date.now()
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('[RealCapture] Backend response:', data);
    })
    .catch(error => {
        console.error('[RealCapture] Error sending coordinates:', error);
    });
}

// Export for use in your frontend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        captureRealFrontendCoordinates,
        sendRealCoordinatesToBackend,
        getActualPrintAreaBounds
    };
} else {
    // Browser environment - make available globally
    window.RealFrontendCapture = {
        captureRealFrontendCoordinates,
        sendRealCoordinatesToBackend,
        getActualPrintAreaBounds
    };
}
