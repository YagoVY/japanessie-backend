# Fulfillment Pipeline V2 Migration Guide

## Overview

This document describes the migration from the legacy fulfillment pipeline to the new V2 pipeline that renders from the FE's `_layout_snapshot_v2` and uses Printful's catalog API instead of sync items.

## Key Changes

### 🎯 Objective
- **Source of Truth**: Render from FE's `_layout_snapshot_v2` (no more BE↔FE mismatches)
- **Printful Integration**: Use catalog API instead of sync items and source="api"
- **Eliminate Issues**: No more empty file URLs, 404 sync variants, or patch loops

### 🧩 High-level Changes

1. **Renderer**: Generate 12"x16" @ 300 DPI transparent PNG from `_layout_snapshot_v2`
2. **S3**: Upload print PNG and return public URL
3. **Printful**: 
   - Resolve catalog variant_id from Shopify line item SKU
   - Add/replace order items as catalog with files + placements/front_large
   - Stop using source="api" and stop patching sync items
4. **Retry/Idempotency**: Robust but finite retries with jitter
5. **Types/Contracts**: Freeze `_layout_snapshot_v2` schema and validate server-side

## New File Structure

```
lib/
├── fonts/
│   └── index.ts                    # Font registration and utilities
├── printful/
│   ├── client.ts                   # Typed Printful API client
│   ├── catalog.ts                  # SKU to variant resolution
│   └── orders.ts                   # Order management
├── renderer/
│   └── printRenderer.ts            # PNG generation from snapshot
├── s3/
│   └── upload.ts                   # S3 upload service
└── webhooks/
    └── orders-create.ts            # New webhook handler

types/
└── snapshot.ts                     # LayoutSnapshotV2 schema and validation
```

## Data Contract

The FE sends `_layout_snapshot_v2` as the authoritative source. The BE must render from it exactly without reflow, re-measure, or "smart" layout.

```typescript
export type LayoutSnapshotV2 = {
  version: 2;
  printArea: { widthIn: number; heightIn: number; dpi: number }; // 12 x 16, 300
  origin: 'top-left';
  canvasPx: { w: number; h: number }; // 600 x 600 (FE preview basis)
  layers: Array<{
    type: 'text';
    font: {
      family: string;                // e.g., "Yuji Syuku"
      sizePt: number;                // FE computed (px * 0.75)
      lineHeight: number;            // 1.10
      letterSpacingEm: number;       // 0.12 for horizontal, 0 for vertical
      vertical: boolean;             // true for vertical flow
      textOrientation: 'upright';    // fixed
      hyphenPolicy: 'jp-long-vbar';  // FE's choice
    };
    color: string;                    // hex, e.g. "#FFFFFF"
    align: { h: 'center'; v: 'baseline' };
    textBlocks: Array<{
      text: string;                   // glyph or line
      xIn: number;                    // inches from top-left of print area
      yIn: number;                    // inches from top-left of print area
      anchor: 'center-baseline';      // FE anchor; we must respect this
    }>;
  }>;
  meta: { baseFontSizeRequested: number; orientation: 'horizontal'|'vertical' };
};
```

## Renderer Requirements

- **Output**: 3600 × 4800 px (12×16" @ 300 DPI) with transparent background
- **Canvas Library**: Uses `@napi-rs/canvas` or `node-canvas`
- **Fonts**: Bundle TTFs locally, register with exact family names FE uses
- **Text Rendering**:
  - Convert inches → px: `px = inches * 300`
  - Set font: `"{sizePx}px {family}"`, where `sizePx = Math.round(sizePt * 96/72)`
  - Anchor is "center-baseline": draw with `(xPx - textWidth/2, yPx)`
  - Implement manual letter spacing for horizontal text
  - For vertical text, FE sends one glyph per textBlock

## Printful Changes

### ❌ Stop Using
- `PATCH /orders/{id}/order-items/{id}` to tweak placements of sync items
- `source: "api"` on items (causes 400 errors)
- `/stores/{store_id}/sync/variants/{id}` for this flow
- `limit=200` (use `limit <= 100`)

### ✅ Use Instead
- `GET /catalog/variants?sku=${sku}&limit=100` for exact SKU match
- `GET /catalog/variants?search=${sku}&limit=100` as fallback
- Add catalog items with files + placement:
  ```json
  {
    "variant_id": <catalogVariantId>,
    "quantity": <qty>,
    "files": [{"type": "default", "url": "<s3PrintPngUrl>"}],
    "placements": [{
      "placement": "front_large",
      "layers": [{
        "type": "file",
        "url": "<s3PrintPngUrl>",
        "position": {"area": "default"}
      }]
    }],
    "external_id": "<shopifyLineItemId>"
  }
  ```

## Environment Variables

Add these to your `.env` file:

```bash
# Enable V2 pipeline (default: enabled)
PRINT_RENDERER_V2=1

# Existing variables (no changes needed)
PRINTFUL_API_KEY=your_api_key
PRINTFUL_STORE_ID=your_store_id
AWS_REGION=your_region
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket_name
```

## Migration Steps

### 1. Deploy New Code
- Deploy all new TypeScript files
- Ensure TTF fonts are available (convert from WOFF2 if needed)
- Set `PRINT_RENDERER_V2=1` in production

### 2. Test with Sample Order
Place a test order with:
- Horizontal text (two words → forced to two lines on FE)
- Vertical text (characters only)
- Different fonts / colors

### 3. Verify Logs
Check that logs show:
- `snapshot parsed` → `PNG rendered` → `S3 URL` → `catalog variant resolved` → `item added`

### 4. Check Printful Dashboard
- Verify draft order's item → mockup → file URL
- Download S3 PNG and manually overlay on FE preview

### 5. Rollback Plan
If issues occur, set `PRINT_RENDERER_V2=0` to revert to legacy pipeline.

## Edge Cases Handled

- **Missing `_layout_snapshot_v2`**: Log & skip; leave order for manual review
- **Unknown SKU**: Log & skip; do not attempt catalog calls
- **Fonts not found**: Fail item with explicit error
- **Multiple items**: Handle all independently, dedupe by external line-item id
- **Catalog variant not found**: Log & leave draft untouched for manual review

## Acceptance Criteria

✅ Adding a test order produces:
- S3 print at `orders/order-<id>-item-<id>/<hash>/print.png`
- Draft Printful order containing one catalog item (correct variant_id) with front_large placement pointing to S3 print URL
- No errors like "Invalid source specified 'api'", no limit=200 requests, no /sync/variants/** 404s, and no loops patching empty file URLs
- Generated print visually matches FE canvas overlay (spot-check with same text/font/orientation)

## Troubleshooting

### Common Issues

1. **Font Loading Errors**
   - Ensure TTF fonts are available in `assets/fonts/`
   - Check font family names match exactly what FE uses

2. **SKU Resolution Failures**
   - Verify SKU exists in Printful catalog
   - Check for typos in SKU values
   - Use search fallback if exact match fails

3. **S3 Upload Issues**
   - Verify AWS credentials and bucket permissions
   - Check S3 bucket region matches AWS_REGION

4. **Printful API Errors**
   - Ensure API key has proper permissions
   - Check rate limits and retry logic
   - Verify store ID is correct

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will show detailed logs for each step of the pipeline.

## Performance Considerations

- **Font Loading**: Fonts are preloaded on server startup
- **PNG Generation**: Typically takes 100-500ms per design
- **S3 Upload**: Usually completes in 1-3 seconds
- **Printful API**: Catalog lookups are cached, order operations are batched

## Monitoring

Key metrics to monitor:
- Order processing success rate
- Average processing time per order
- S3 upload success rate
- Printful API error rate
- Font loading success rate

## Future Improvements

- [ ] Add PNG compression optimization
- [ ] Implement font subsetting for smaller files
- [ ] Add retry logic with exponential backoff
- [ ] Cache catalog variant lookups
- [ ] Add metrics and alerting
