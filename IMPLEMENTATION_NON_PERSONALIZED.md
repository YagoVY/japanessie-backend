# Non-Personalized Products Implementation Summary

## Problem Statement

Products like Mugs that don't have personalization (no custom text input) were not being pushed to Printful when orders were received. The webhook would detect no design data and exit early with "No design processing needed".

## Solution Implemented

Added a complete system to detect and process non-personalized products with preset designs.

## Changes Made

### 1. Configuration File (`config/non-personalized-products.json`)

Created a configuration system that allows you to:
- Define product categories (e.g., Mugs, Posters, Stickers)
- Map each category to a preset design
- Configure how products are identified (by product type, title keywords, or SKU)
- Set default design parameters

**Example Configuration:**
```json
{
  "productMapping": {
    "Mugs": {
      "presetId": "wave-horizontal",
      "productType": "PRESET_IMAGE",
      "description": "Mugs with horizontal wave pattern",
      "identifiers": {
        "productType": "Mugs",
        "titleContains": ["Mug", "Coffee", "Tea"]
      }
    }
  }
}
```

### 2. Updated Webhook Files

Modified both `routes/webhooks.js` and `routes/print-webhooks.js` to:

#### Added Helper Functions:
- `isNonPersonalizedProduct(lineItem)`: Detects if a product should be fulfilled based on configured rules
- `createDefaultDesignData(lineItem, productConfig)`: Creates design data structure with preset information

#### Updated Logic Flow:
1. First checks for personalization data (existing behavior)
2. If no personalization found, checks if it's a non-personalized product
3. If matched, creates default design data with preset ID
4. Processes order with preset design

### 3. Documentation

Created comprehensive documentation in `docs/NON_PERSONALIZED_PRODUCTS.md` covering:
- How the system works
- Configuration options
- Shopify setup instructions
- Testing procedures
- Troubleshooting guide
- Example workflows

## How to Use

### Step 1: Configure Your Products

Edit `config/non-personalized-products.json`:

```json
{
  "productMapping": {
    "Mugs": {
      "presetId": "wave-horizontal",
      "productType": "PRESET_IMAGE",
      "description": "Mugs with horizontal wave pattern",
      "identifiers": {
        "productType": "Mugs",
        "titleContains": ["Mug", "Coffee", "Tea"]
      }
    }
  },
  "identificationRules": {
    "checkProductType": true,
    "checkTitle": true,
    "checkSKU": false
  },
  "defaults": {
    "text": "",
    "fontFamily": "Yuji Syuku",
    "fontSize": 40,
    "color": "#000000",
    "orientation": "horizontal"
  }
}
```

### Step 2: Set Up Shopify Products

In Shopify admin for your Mug product:

1. **Set Product Type** to "Mugs" (matches `identifiers.productType`)
2. **Or** include keywords like "Mug", "Coffee", or "Tea" in the title
3. **Set Variant SKUs** to Printful variant IDs (e.g., `19_11oz`)

### Step 3: Ensure Preset Exists

Make sure the preset ID exists in `config/preset-mapping.json`:

```json
{
  "preset_printful_mapping": {
    "wave-horizontal": "12349"
  }
}
```

### Step 4: Restart Server

Restart your server to load the new configuration:

```bash
# If using npm
npm start

# If using pm2
pm2 restart server

# If using Docker
docker-compose restart
```

### Step 5: Test with an Order

1. Place a test order for a Mug product in Shopify
2. Check server logs for confirmation:

```
Non-personalized products config loaded successfully
Matched non-personalized product by type: Mugs
Detected non-personalized product, creating default design data
Processing preset product for order...
```

## Expected Behavior

### Before Implementation:
```
🔥 WEBHOOK: Order created webhook received
📋 Order ID: 7086965948756
📋 Line items count: 1
📋 Properties: []
📋 Extracted design data: None
No design processing needed for order
```
❌ **Order stops here - not sent to Printful**

### After Implementation:
```
🔥 WEBHOOK: Order created webhook received
📋 Order ID: 7086965948756
📋 Line items count: 1
📋 Properties: []
Matched non-personalized product by type: Mugs
Detected non-personalized product, creating default design data
Created default design data with presetId: wave-horizontal
Starting order processing for 7086965948756
Processing preset product for order 7086965948756
Generating text PNG for preset product
Using preset ID wave-horizontal for background fetch
Background image fetched successfully from S3
Compositing text onto background image
Preset print file uploaded to S3
Creating Printful draft order for 7086965948756
```
✅ **Order successfully processed and sent to Printful**

## Product Identification Methods

The system can identify products in three ways:

### 1. Product Type (Recommended)
- Set in Shopify: Products > [Product] > Product type
- Exact match (case-insensitive)
- Most reliable method

### 2. Title Keywords
- Matches if product title contains any configured keyword
- Flexible but less precise
- Good for products with varying titles

### 3. SKU Pattern
- Uses regex to match SKU patterns
- Disabled by default
- Enable in `identificationRules` if needed

## Adding More Product Types

To add Posters, Stickers, or other products:

```json
{
  "productMapping": {
    "Mugs": {
      "presetId": "wave-horizontal",
      ...
    },
    "Posters": {
      "presetId": "japanese-motif",
      "productType": "PRESET_IMAGE",
      "description": "Posters with Japanese motif",
      "identifiers": {
        "productType": "Posters",
        "titleContains": ["Poster", "Print"]
      }
    },
    "Stickers": {
      "presetId": "minimalist-lines",
      "productType": "PRESET_IMAGE",
      "description": "Stickers with minimalist design",
      "identifiers": {
        "productType": "Stickers",
        "titleContains": ["Sticker", "Decal"]
      }
    }
  }
}
```

## Troubleshooting

### Issue: Product Not Detected

**Check:**
1. Product type in Shopify matches config exactly
2. Or title contains one of the keywords
3. Identification rules are enabled
4. Server was restarted after config changes

**Solution:**
Add more keywords or use product type for exact matching.

### Issue: Wrong Preset Applied

**Check:**
1. PresetId in config matches preset-mapping.json
2. Background image exists in S3 for that preset

**Solution:**
Update presetId or add missing preset.

### Issue: Order Not Sent to Printful

**Check:**
1. Printful variant ID is correct in SKU
2. S3 credentials are configured
3. Printful API key is valid

**Solution:**
Check server error logs for specific failure reason.

## Files Modified

1. ✅ `config/non-personalized-products.json` (new)
2. ✅ `routes/webhooks.js` (updated)
3. ✅ `routes/print-webhooks.js` (updated)
4. ✅ `docs/NON_PERSONALIZED_PRODUCTS.md` (new)
5. ✅ `IMPLEMENTATION_NON_PERSONALIZED.md` (this file)

## Next Steps

1. ✅ Configuration file created
2. ✅ Webhook logic updated
3. ✅ Helper functions added
4. ✅ Documentation created
5. 🔄 **TEST**: Place a real Mug order to verify

## Testing Checklist

- [ ] Restart server
- [ ] Check logs for "Non-personalized products config loaded successfully"
- [ ] Place test Mug order in Shopify
- [ ] Verify "Matched non-personalized product" in logs
- [ ] Verify "Processing preset product" in logs
- [ ] Confirm order created in Printful dashboard
- [ ] Check order has correct preset design

## Notes

- The system maintains backward compatibility with personalized products
- Non-personalized products are only processed if no design data exists
- Configuration is loaded once at server startup
- Multiple product types can coexist with different presets
- Each preset must exist in preset-mapping.json and have S3 background

