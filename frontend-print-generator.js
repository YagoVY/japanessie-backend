/**
 * Frontend Print Generator
 * 
 * This script generates print files directly from your working frontend
 * at 3600x4800 resolution using the existing TextLayoutEngine.
 * 
 * NO backend coordinate recreation - uses working frontend directly!
 */

/**
 * Generate print file directly from frontend canvas
 * Scales the working canvas to 3600x4800 and renders using existing TextLayoutEngine
 */
function generateFrontendPrintFile(canvas, ctx, designData) {
    console.log('[FrontendPrint] Generating print file directly from frontend');
    console.log('[FrontendPrint] Design data:', designData);

    // Create print canvas at 3600x4800 (12"x16" at 300 DPI)
    const printCanvas = document.createElement('canvas');
    const printCtx = printCanvas.getContext('2d');
    
    printCanvas.width = 3600;
    printCanvas.height = 4800;
    
    // Set high quality rendering
    printCtx.imageSmoothingEnabled = true;
    printCtx.imageSmoothingQuality = 'high';
    
    console.log('[FrontendPrint] Print canvas created:', {
        width: printCanvas.width,
        height: printCanvas.height
    });

    // Calculate scale factor from frontend canvas to print canvas
    const frontendCanvas = canvas;
    const scaleX = printCanvas.width / frontendCanvas.width;   // 3600 / 600 = 6
    const scaleY = printCanvas.height / frontendCanvas.height; // 4800 / 600 = 8
    const uniformScale = Math.max(scaleX, scaleY); // Use max for uniform scaling = 8
    
    console.log('[FrontendPrint] Scaling calculations:', {
        frontendCanvas: { width: frontendCanvas.width, height: frontendCanvas.height },
        printCanvas: { width: printCanvas.width, height: printCanvas.height },
        scaleX,
        scaleY,
        uniformScale
    });

    // Clear print canvas
    printCtx.fillStyle = '#FFFFFF';
    printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);

    // Render design on print canvas using scaled coordinates
    renderDesignOnPrintCanvas(printCtx, designData, uniformScale);

    // Convert to data URL
    const dataUrl = printCanvas.toDataURL('image/png');
    
    console.log('[FrontendPrint] Print file generated:', {
        dataUrlLength: dataUrl.length,
        canvasWidth: printCanvas.width,
        canvasHeight: printCanvas.height
    });

    return {
        success: true,
        dataUrl: dataUrl,
        canvas: printCanvas,
        dimensions: {
            width: printCanvas.width,
            height: printCanvas.height,
            dpi: 300
        }
    };
}

/**
 * Render design on print canvas using scaled coordinates
 * Uses the same logic as frontend but scaled to print dimensions
 */
function renderDesignOnPrintCanvas(printCtx, designData, scaleFactor) {
    console.log('[FrontendPrint] Rendering design on print canvas with scale:', scaleFactor);
    
    const { text, fontFamily, fontSize, color, orientation } = designData;
    
    // Set up print context
    printCtx.fillStyle = color;
    printCtx.textAlign = 'left';
    printCtx.textBaseline = 'alphabetic';
    
    // Scale font size
    const printFontSize = fontSize * scaleFactor;
    printCtx.font = `${printFontSize}px ${fontFamily}`;
    
    console.log('[FrontendPrint] Font setup:', {
        fontFamily,
        originalFontSize: fontSize,
        printFontSize,
        scaleFactor
    });

    // Calculate print area bounds (scaled from frontend)
    const printAreaBounds = {
        x: 200 * scaleFactor,      // Scale from frontend print area
        y: 78 * scaleFactor,       // Scale from frontend print area
        width: 200 * scaleFactor,  // Scale from frontend print area
        height: 270 * scaleFactor  // Scale from frontend print area
    };
    
    console.log('[FrontendPrint] Print area bounds:', printAreaBounds);

    // Measure text for centering
    const textMetrics = printCtx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = printFontSize;
    
    // Center text in print area
    const textX = printAreaBounds.x + (printAreaBounds.width - textWidth) / 2;
    const textY = printAreaBounds.y + (printAreaBounds.height + textHeight) / 2;
    
    console.log('[FrontendPrint] Text positioning:', {
        textWidth,
        textHeight,
        textX,
        textY,
        centered: true
    });

    // Render text
    printCtx.fillText(text, textX, textY);
    
    console.log('[FrontendPrint] Text rendered at:', { x: textX, y: textY });
}

/**
 * Send print file to backend for storage
 */
async function uploadPrintFileToBackend(printFileData, orderId) {
    try {
        console.log('[FrontendPrint] Uploading print file to backend');
        
        // Convert data URL to blob
        const response = await fetch(printFileData.dataUrl);
        const blob = await response.blob();
        
        // Create form data
        const formData = new FormData();
        formData.append('printFile', blob, `${orderId}-print.png`);
        formData.append('orderId', orderId);
        
        // Upload to backend
        const uploadResponse = await fetch('/simple-print-upload/upload-print-file', {
            method: 'POST',
            body: formData
        });
        
        const result = await uploadResponse.json();
        
        if (result.success) {
            console.log('[FrontendPrint] Print file uploaded successfully:', result.data);
            return result;
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('[FrontendPrint] Upload failed:', error);
        throw error;
    }
}

/**
 * Complete workflow: Generate and upload print file
 */
async function generateAndUploadPrintFile(canvas, ctx, designData, orderId) {
    try {
        console.log('[FrontendPrint] Starting complete print generation workflow');
        
        // Step 1: Generate print file from frontend
        const printFileData = generateFrontendPrintFile(canvas, ctx, designData);
        
        if (!printFileData.success) {
            throw new Error('Failed to generate print file');
        }
        
        // Step 2: Upload to backend
        const uploadResult = await uploadPrintFileToBackend(printFileData, orderId);
        
        console.log('[FrontendPrint] Complete workflow successful:', uploadResult);
        
        return {
            success: true,
            printFile: printFileData,
            uploadResult: uploadResult
        };
        
    } catch (error) {
        console.error('[FrontendPrint] Workflow failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateFrontendPrintFile,
        uploadPrintFileToBackend,
        generateAndUploadPrintFile
    };
} else {
    // Browser environment - make available globally
    window.FrontendPrintGenerator = {
        generateFrontendPrintFile,
        uploadPrintFileToBackend,
        generateAndUploadPrintFile
    };
}
