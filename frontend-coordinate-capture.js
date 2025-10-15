/**
 * Frontend Coordinate Capture System
 * 
 * This function captures exact pixel coordinates from the frontend's working
 * text layout and sends them to the backend for uniform scaling.
 * 
 * CRITICAL: Captures coordinates relative to PRINT AREA, not full canvas
 */

function captureFrontendCoordinates(canvas, ctx, text, fontFamily, fontSize, color, printAreaBounds, orientation = 'horizontal') {
    console.log('[FrontendCapture] Starting coordinate capture', {
        text, fontFamily, fontSize, color, orientation, printAreaBounds
    });

    // Set up the canvas context exactly as frontend does
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Get canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Extract print area dimensions (CRITICAL for correct scaling)
    const printAreaWidth = printAreaBounds.width;
    const printAreaHeight = printAreaBounds.height;
    const printAreaX = printAreaBounds.x || 0;
    const printAreaY = printAreaBounds.y || 0;

    console.log('[FrontendCapture] Canvas and print area setup', {
        canvasWidth, canvasHeight, 
        printAreaWidth, printAreaHeight, printAreaX, printAreaY,
        fontString: ctx.font
    });

    // CRITICAL: Calculate text layout within PRINT AREA dimensions, not full canvas
    // This ensures all measurements (positioning, spacing, line height) use print area as reference
    
    // Set up context for print area measurements
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Measure the text to get character positions
    // CRITICAL: All calculations use PRINT AREA dimensions as reference
    const characterPositions = [];
    
    // Calculate text positioning within print area bounds
    const textWidth = ctx.measureText(text).width;
    const textHeight = fontSize; // Approximate text height
    
    // Center text within print area (not full canvas)
    const startX = (printAreaWidth - textWidth) / 2; // Center horizontally in print area
    const startY = (printAreaHeight + textHeight) / 2; // Center vertically in print area
    
    console.log('[FrontendCapture] Print area text positioning', {
        printAreaWidth, printAreaHeight,
        textWidth, textHeight,
        startX, startY,
        note: 'All calculations relative to print area dimensions'
    });

    // For horizontal text (most common case)
    if (orientation === 'horizontal') {
        let currentX = startX; // Start at print area center
        const currentY = startY; // Use print area center Y
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Measure this character
            const charMetrics = ctx.measureText(char);
            const charWidth = charMetrics.width;
            
            // Store character data with coordinates relative to PRINT AREA
            characterPositions.push({
                char: char,
                x: currentX, // Relative to print area
                y: currentY, // Relative to print area
                width: charWidth,
                metrics: {
                    width: charMetrics.width,
                    actualBoundingBoxAscent: charMetrics.actualBoundingBoxAscent,
                    actualBoundingBoxDescent: charMetrics.actualBoundingBoxDescent,
                    actualBoundingBoxLeft: charMetrics.actualBoundingBoxLeft,
                    actualBoundingBoxRight: charMetrics.actualBoundingBoxRight
                }
            });

            console.log(`[FrontendCapture] Character ${i}: "${char}"`, {
                x: currentX, // Print area relative
                y: currentY, // Print area relative
                width: charWidth,
                printAreaReference: true,
                metrics: charMetrics
            });

            // Move to next character position
            currentX += charWidth;
        }
    }

    // Create the coordinate data package
    const coordinateData = {
        text: text,
        fontFamily: fontFamily,
        fontSize: fontSize,
        color: color,
        orientation: orientation,
        // CRITICAL: Include both canvas and print area dimensions
        frontendCanvasSize: {
            width: canvasWidth,
            height: canvasHeight
        },
        printAreaBounds: {
            x: printAreaX,
            y: printAreaY,
            width: printAreaWidth,
            height: printAreaHeight
        },
        characterPositions: characterPositions,
        totalWidth: currentX,
        totalHeight: fontSize,
        captureTimestamp: Date.now()
    };

    console.log('[FrontendCapture] Coordinate capture complete', {
        characterCount: characterPositions.length,
        totalWidth: currentX,
        totalHeight: fontSize,
        coordinateData
    });

    return coordinateData;
}

/**
 * Alternative: Capture coordinates from existing frontend TextLayoutEngine
 * This function extracts coordinates from a working frontend layout
 */
function captureFromTextLayoutEngine(layoutResult, text, fontFamily, fontSize, color, orientation = 'horizontal') {
    console.log('[FrontendCapture] Capturing from TextLayoutEngine', {
        layoutResult, text, fontFamily, fontSize, color, orientation
    });

    const characterPositions = [];
    
    // Extract positions from the layout result
    if (layoutResult.positions && layoutResult.positions.length > 0) {
        for (let i = 0; i < layoutResult.positions.length; i++) {
            const position = layoutResult.positions[i];
            
            // For each character in the line
            const line = position.line || text;
            let charX = position.x;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                characterPositions.push({
                    char: char,
                    x: charX,
                    y: position.y,
                    width: 0, // Will be calculated by backend
                    lineIndex: i,
                    charIndex: j
                });
                
                // Estimate character width (backend will use actual measurement)
                charX += fontSize * 0.6; // Rough estimate
            }
        }
    }

    const coordinateData = {
        text: text,
        fontFamily: fontFamily,
        fontSize: fontSize,
        color: color,
        orientation: orientation,
        frontendCanvasSize: {
            width: 600, // Standard frontend canvas size
            height: 600
        },
        characterPositions: characterPositions,
        layoutMetadata: {
            fits: layoutResult.fits,
            fontSize: layoutResult.fontSize,
            lines: layoutResult.lines,
            textArea: layoutResult.textArea,
            printArea: layoutResult.printArea
        },
        captureTimestamp: Date.now()
    };

    console.log('[FrontendCapture] TextLayoutEngine capture complete', {
        characterCount: characterPositions.length,
        coordinateData
    });

    return coordinateData;
}

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        captureFrontendCoordinates,
        captureFromTextLayoutEngine
    };
} else {
    // Browser environment
    window.FrontendCoordinateCapture = {
        captureFrontendCoordinates,
        captureFromTextLayoutEngine
    };
}
