# Preset Image Composition Implementation

## Overview

This document describes the implementation of preset image composition functionality that allows the backend to composite custom text onto preset background images for Printful orders.

## Architecture

### Product Types

1. **CUSTOM Products**: Text-only designs (existing implementation)
   - Generates transparent PNG with text only
   - Uses existing Puppeteer-based text rendering
   - No background image compositing

2. **PRESET_IMAGE Products**: Background image + custom text overlay (new implementation)
   - Fetches background image from Printful sync products
   - Generates text PNG using existing system
   - Composites text onto background using Sharp library
   - Outputs final composited image

## Implementation Details

### 1. Configuration

**File**: `config/preset-mapping.json`
```json
{
  "preset_printful_mapping": {
    "wave-vertical": "12348",
    "wave-horizontal": "12349",
    "geometric-pattern": "12350",
    "minimalist-lines": "12351",
    "japanese-motif": "12352"
  }
}
```

### 2. Printful Client Extensions

**File**: `services/printful-client.js`

New methods added:
- `fetchBackgroundImage(presetId)` - Downloads background image from Printful
- `isPresetProduct(presetId)` - Checks if preset ID exists
- `getAvailablePresets()` - Returns all available preset IDs

### 3. Image Compositor Service

**File**: `services/image-compositor.js`

New service using Sharp library for image composition:
- `compositeImages(backgroundPath, textBuffer)` - Main composition method
- `compositeWithPosition()` - Custom positioning support
- `cleanupTempFiles()` - Temporary file cleanup
- `validateImage()` - Image validation

### 4. Print Generator Extensions

**File**: `services/print-generator.js`

New methods added:
- `generatePresetPrintFile()` - Handles preset product generation
- `extractPresetId()` - Extracts preset ID from design params
- `isPresetProduct()` - Detects preset products

### 5. Order Processor Updates

**File**: `services/order-processor.js`

Updated to:
- Detect preset vs custom products
- Route to appropriate generation method
- Include preset information in design parameters

## Data Flow

### Custom Products (Existing)
```
Frontend → Shopify → Webhook → OrderProcessor → PrintGenerator → S3 → Printful
```

### Preset Products (New)
```
Frontend → Shopify → Webhook → OrderProcessor → PrintGenerator → PrintfulClient → ImageCompositor → S3 → Printful
```

## Frontend Integration

### Design Parameters Structure

For preset products, the frontend should include:

```javascript
const designParams = {
  _design_params: {
    translatedText: "こんにちは",
    originalText: "Hello",
    fontStyle: "Yuji Syuku",
    fontSize: 40,
    fontColor: "#000000",
    orientation: "horizontal",
    presetId: "wave-vertical",        // NEW: Preset identifier
    productType: "PRESET_IMAGE",      // NEW: Product type
    textCoordinates: {
      coordinates: [...],             // Existing coordinate data
      printArea: {...},               // Existing print area data
      source: "frontend-capture"
    }
  }
};
```

### Product Type Detection

The backend detects preset products by checking for:
1. `presetId` field in design parameters
2. `productType === "PRESET_IMAGE"`
3. Presence of preset ID in mapping configuration

## Error Handling & Fallbacks

### Robust Error Handling

1. **Background Image Fetch Failure**
   - Logs error with details
   - Falls back to text-only generation
   - Continues processing without failing

2. **Image Composition Failure**
   - Logs error with details
   - Falls back to text-only generation
   - Continues processing without failing

3. **Printful API Failures**
   - Retries with exponential backoff
   - Falls back to text-only if all retries fail
   - Maintains order processing continuity

4. **File System Errors**
   - Automatic cleanup of temporary files
   - Graceful handling of disk space issues
   - Continues processing with available resources

### Fallback Strategy

```
Preset Product Request
    ↓
Try Background + Text Composition
    ↓ (if fails)
Fallback to Text-Only Generation
    ↓
Continue with Printful Integration
```

## Performance Considerations

### Optimization Features

1. **Temporary File Management**
   - Files stored in OS temp directory
   - Automatic cleanup after processing
   - Memory-efficient streaming for large files

2. **Image Processing**
   - Sharp library for high-performance composition
   - Optimized PNG output settings
   - Proper memory management

3. **API Efficiency**
   - Cached preset mappings
   - Efficient Printful API usage
   - Minimal redundant requests

### Resource Usage

- **Memory**: Sharp processes images in chunks to minimize memory usage
- **Disk**: Temporary files cleaned up immediately after use
- **Network**: Background images downloaded only when needed
- **CPU**: Image composition optimized for speed

## Testing

### Test Script

**File**: `test-preset-composition.js`

Comprehensive test suite covering:
- Custom product processing (regression test)
- Preset product processing (new functionality)
- Printful client methods
- Image compositor functionality
- Error handling and fallbacks

### Test Scenarios

1. **Custom Product Test**
   - Verifies existing functionality still works
   - Ensures no regression in text-only generation

2. **Preset Product Test**
   - Tests background image fetching
   - Verifies image composition
   - Checks S3 upload functionality

3. **Error Handling Test**
   - Simulates background fetch failures
   - Tests composition error handling
   - Verifies fallback behavior

4. **Component Tests**
   - Individual service testing
   - Method validation
   - Configuration verification

## Deployment Checklist

### Pre-Deployment

- [ ] Update `config/preset-mapping.json` with actual Printful sync product IDs
- [ ] Verify Sharp library is installed (`npm install sharp`)
- [ ] Test with sample preset products
- [ ] Verify S3 permissions for preset file uploads

### Post-Deployment

- [ ] Monitor logs for preset product processing
- [ ] Verify background image downloads are working
- [ ] Check image composition quality
- [ ] Monitor error rates and fallback usage

### Configuration Updates

When adding new presets:

1. Add preset ID to `config/preset-mapping.json`
2. Update Printful sync product IDs
3. Test with sample orders
4. Deploy configuration changes

## Monitoring & Debugging

### Log Points

Key log messages to monitor:

```
[PrintfulClient] Fetching background image for preset: wave-vertical
[ImageCompositor] Starting image composition
[PrintGenerator] Processing preset product: wave-vertical
[OrderProcessor] Processing preset product for order
```

### Debug Information

- Preset ID extraction and validation
- Background image download status
- Image composition metrics
- Fallback usage statistics
- Processing time comparisons

### Common Issues

1. **Preset ID Not Found**
   - Check mapping configuration
   - Verify frontend is sending correct preset ID
   - Check Printful sync product exists

2. **Background Image Download Fails**
   - Verify Printful API credentials
   - Check network connectivity
   - Verify sync product has files

3. **Image Composition Errors**
   - Check Sharp library installation
   - Verify image file formats
   - Check available disk space

## Future Enhancements

### Potential Improvements

1. **Background Image Caching**
   - Cache frequently used backgrounds
   - Reduce API calls and download time

2. **Advanced Positioning**
   - Custom text positioning options
   - Multiple text placement areas

3. **Background Variations**
   - Color variations of backgrounds
   - Size-specific background images

4. **Performance Optimization**
   - Parallel processing for multiple items
   - Batch background downloads
   - Optimized image compression

### API Extensions

1. **Preset Management API**
   - List available presets
   - Preview preset backgrounds
   - Manage preset configurations

2. **Custom Background Upload**
   - Allow custom background images
   - User-uploaded preset support

## Conclusion

The preset image composition system successfully extends the existing custom text generation functionality to support background images while maintaining backward compatibility and robust error handling. The implementation provides a solid foundation for future enhancements and maintains the high-quality output standards of the existing system.
