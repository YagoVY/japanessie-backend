# Frontend to Printful Design Workflow Summary

## Overview
This document summarizes how the system captures design data from the frontend, generates high-resolution print files, and submits them to Printful for fulfillment. This workflow enables AI systems to understand the complete data flow from user interaction to print production.

## Architecture Components

### 1. Frontend (User Interface)
- **Canvas-based Design Tool**: Users create designs on a 600x600px canvas
- **Text Layout Engine**: Handles Japanese text rendering with proper font metrics
- **Coordinate Capture System**: Captures exact pixel positions of rendered elements
- **Design Data Serialization**: Packages design parameters for backend processing

### 2. Backend Services
- **Webhook Handler**: Receives Shopify order data with design parameters
- **Print Generator**: Creates high-resolution print files using Puppeteer
- **S3 Storage**: Stores generated print files and order data
- **Printful Client**: Manages Printful API integration for order fulfillment

### 3. External Services
- **Shopify**: E-commerce platform sending order webhooks
- **Printful**: Print-on-demand fulfillment service
- **AWS S3**: Cloud storage for print files and order data

## Complete Workflow

### Phase 1: Frontend Design Creation

#### 1.1 User Interaction
```
User Input → Frontend Canvas → Text Layout Engine → Visual Preview
```

**Key Components:**
- User enters Japanese text in design interface
- Frontend applies font styling (family, size, color, orientation)
- Text Layout Engine calculates character positions and line breaks
- Canvas renders preview at 600x600px resolution

#### 1.2 Design Data Capture
```javascript
// Frontend captures design parameters
const designData = {
  _design_params: {
    translatedText: "こんにちは",
    originalText: "Hello",
    fontStyle: "Yuji Syuku",
    fontSize: 40,
    fontColor: "#DC2626",
    orientation: "horizontal",
    textCoordinates: {
      coordinates: [...], // Character positions
      printArea: {...},   // Print area bounds
      source: "frontend-capture"
    }
  }
};
```

**Coordinate Capture Process:**
1. **Real-time Measurement**: Frontend measures actual character positions using `ctx.measureText()`
2. **Print Area Reference**: All coordinates calculated relative to print area bounds (not full canvas)
3. **Character-level Precision**: Each character's position, width, and metrics captured
4. **Font Metrics**: Includes ascent, descent, and bounding box data

#### 1.3 Data Serialization
```javascript
// Design data packaged for backend
const orderProperties = [
  {
    name: "_design_params",
    value: JSON.stringify(designData._design_params)
  },
  {
    name: "_layout_snapshot_v2",
    value: JSON.stringify(layoutSnapshot)
  }
];
```

### Phase 2: Order Processing

#### 2.1 Webhook Reception
```javascript
// Shopify webhook endpoint: /webhooks/shopify/orders/created
router.post('/shopify/orders/created', async (req, res) => {
  const order = req.body;
  const designData = extractDesignData(order);
  
  // Process asynchronously
  setImmediate(async () => {
    await orderProcessor.processOrder({
      orderId: order.id.toString(),
      designData: designData,
      // ... customer and shipping data
    });
  });
});
```

**Data Extraction:**
- Parses order line items for design properties
- Extracts `_design_params` and `_layout_snapshot_v2`
- Maps Shopify variant IDs to Printful variant IDs
- Validates design data completeness

#### 2.2 Design Parameter Processing
```javascript
// OrderProcessor.extractDesignParams()
const rendererParams = {
  text: frontendParams.translatedText,
  fontFamily: frontendParams.fontStyle,
  color: frontendParams.fontColor,
  orientation: frontendParams.orientation,
  fontSize: frontendParams.fontSize,
  textCoordinates: frontendParams.textCoordinates // Critical for positioning
};
```

### Phase 3: Print File Generation

#### 3.1 High-Resolution Rendering
```javascript
// PrintGenerator.generatePrintFile()
const printResult = await this.printGenerator.generatePrintFile(designParams, {
  orderId: orderId,
  useFrontendLogic: true // Use exact frontend coordinates
});
```

**Rendering Process:**
1. **Puppeteer Browser**: Launches headless Chrome instance
2. **Print Renderer HTML**: Loads specialized rendering page
3. **Canvas Scaling**: Scales from 600x600px to 3600x4800px (12"x16" @ 300 DPI)
4. **Coordinate Translation**: Applies frontend coordinates to high-res canvas
5. **Font Rendering**: Uses exact font families and metrics from frontend

#### 3.2 Print Specifications
- **Output Resolution**: 3600x4800 pixels (12"x16" at 300 DPI)
- **Background**: Transparent PNG
- **Font Rendering**: Exact font families with proper metrics
- **Coordinate System**: Inches-based positioning from frontend

#### 3.3 File Storage
```javascript
// S3 upload with metadata
const uploadResult = await this.s3Storage.uploadBuffer(
  `prints/${orderId}/${Date.now()}-print.png`,
  printBuffer,
  'image/png',
  {
    orderId: orderId,
    type: 'print-file',
    dpi: 300,
    dimensions: '3600x4800'
  }
);
```

### Phase 4: Printful Integration

#### 4.1 Variant Resolution
```javascript
// Map Shopify SKU to Printful variant
const variantInfo = this.extractVariantInfo(orderData);
const printfulVariantId = this.mapShopifyToPrintfulVariant(shopifyVariantId);
```

**Variant Mapping:**
- Shopify variant ID → Printful catalog variant ID
- Size and color combinations mapped to specific Printful products
- Fallback to default variant if mapping not found

#### 4.2 Draft Order Creation
```javascript
// PrintfulClient.createDraftOrder()
const orderRequest = {
  recipient: {
    name: orderData.shipping.name,
    address1: orderData.shipping.address1,
    // ... complete shipping address
  },
  items: [{
    variant_id: printfulVariantId,
    quantity: orderData.quantity,
    files: [{
      url: printFileS3Url, // High-res print file
      type: 'default'
    }],
    placements: [{
      placement: 'front_large',
      layers: [{
        type: 'file',
        url: printFileS3Url,
        position: { area: 'default' }
      }]
    }]
  }]
};
```

#### 4.3 Order Submission
```javascript
// Submit to Printful API
const response = await axios.post(
  `${this.baseUrl}/orders`,
  orderRequest,
  { 
    headers: { 
      'Authorization': `Bearer ${this.apiKey}`
    }
  }
);
```

## Data Flow Diagram

```
Frontend Canvas (600x600)
    ↓ [Design Parameters + Coordinates]
Shopify Order Webhook
    ↓ [Order Data + Design Data]
Order Processor
    ↓ [Extracted Design Params]
Print Generator (Puppeteer)
    ↓ [High-Res Canvas 3600x4800]
S3 Storage
    ↓ [Print File URL]
Printful API
    ↓ [Draft Order]
Printful Fulfillment
```

## Key Technical Details

### Coordinate System
- **Frontend**: 600x600px canvas with print area bounds
- **Backend**: 3600x4800px print file (12"x16" @ 300 DPI)
- **Scaling Factor**: 6x horizontal, 8x vertical (uniform scaling applied)
- **Reference Point**: All coordinates relative to print area, not full canvas

### Font Handling
- **Frontend**: Uses web fonts (WOFF2) with exact metrics
- **Backend**: Uses TTF fonts with identical family names
- **Metrics**: Character width, ascent, descent, bounding boxes preserved
- **Rendering**: Exact font size and positioning maintained

### Error Handling
- **Design Data Validation**: Ensures all required parameters present
- **Font Loading**: Graceful fallback if fonts unavailable
- **S3 Upload**: Continues processing even if S3 fails
- **Printful API**: Retries with exponential backoff
- **Order Storage**: Maintains processing state for debugging

### Performance Optimizations
- **Asynchronous Processing**: Webhook responds immediately, processing continues in background
- **Font Preloading**: Fonts loaded once on server startup
- **S3 Caching**: Print files cached for potential re-use
- **Puppeteer Pooling**: Browser instances reused for efficiency

## Integration Points for AI Systems

### 1. Design Data Input
AI systems can provide design parameters in the same format:
```javascript
const aiDesignData = {
  _design_params: {
    translatedText: "AI Generated Text",
    fontStyle: "Yuji Syuku",
    fontSize: 40,
    fontColor: "#000000",
    orientation: "horizontal"
  }
};
```

### 2. Coordinate Override
AI can provide custom coordinates for precise positioning:
```javascript
const customCoordinates = {
  textCoordinates: {
    coordinates: [
      { char: "A", x: 100, y: 200, width: 25 },
      { char: "I", x: 125, y: 200, width: 15 }
    ],
    printArea: { x: 200, y: 78, width: 200, height: 270 }
  }
};
```

### 3. Batch Processing
AI systems can process multiple designs:
```javascript
const batchOrder = {
  designs: [
    { text: "Design 1", ... },
    { text: "Design 2", ... }
  ],
  customer: { ... },
  shipping: { ... }
};
```

## Monitoring and Debugging

### Log Points
- **Frontend Capture**: Coordinate capture success/failure
- **Webhook Reception**: Order data validation
- **Print Generation**: Rendering success and timing
- **S3 Upload**: File storage confirmation
- **Printful API**: Order creation status

### Debug Tools
- **Test Endpoints**: `/webhooks/test-order` for manual testing
- **Coordinate Validation**: Frontend vs backend coordinate comparison
- **Print File Inspection**: Download and verify generated files
- **Order Status Tracking**: Complete processing pipeline visibility

## Security Considerations

### Data Protection
- **Webhook Verification**: HMAC signature validation (configurable)
- **API Keys**: Secure storage of Printful and AWS credentials
- **File Access**: S3 URLs with appropriate permissions
- **Order Data**: Sensitive customer information handled securely

### Error Recovery
- **Retry Logic**: Automatic retries for transient failures
- **Fallback Processing**: Manual review queue for failed orders
- **Data Backup**: Order data stored for audit and recovery
- **Monitoring**: Alerts for processing failures

This workflow ensures that designs created in the frontend are accurately reproduced in high-resolution print files and successfully submitted to Printful for fulfillment, with comprehensive error handling and monitoring throughout the process.
