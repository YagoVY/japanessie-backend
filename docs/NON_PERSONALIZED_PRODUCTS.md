# Non-Personalized Products Configuration

This document explains how to configure products that don't require customer personalization (like Mugs) but should still be fulfilled with preset designs.

## Overview

Some products in your store may not have a customization interface where users enter text or select designs. These products (like mugs, posters, stickers) can still be automatically fulfilled with preset designs when orders are received.

## How It Works

1. When an order webhook is received, the system checks if the product has personalization data
2. If no personalization data is found, it checks if the product matches any non-personalized product rules
3. If a match is found, default design data is created with the configured preset
4. The order is processed and sent to Printful with the preset design

## Configuration File

The configuration is stored in `config/non-personalized-products.json`:

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

## Configuration Options

### Product Mapping

Each entry in `productMapping` represents a product category:

- **Key** (e.g., "Mugs"): A unique identifier for this product type
- **presetId**: The ID of the preset design to use (must match an entry in `config/preset-mapping.json`)
- **productType**: Set to "PRESET_IMAGE" for preset products
- **description**: Human-readable description
- **identifiers**: Rules to identify this product type

### Identifiers

The system can identify products using multiple methods:

#### 1. Product Type
```json
"productType": "Mugs"
```
Matches the Shopify product's `product_type` field (case-insensitive).

#### 2. Title Contains
```json
"titleContains": ["Mug", "Coffee", "Tea"]
```
Matches if the product title contains any of these keywords (case-insensitive).

#### 3. SKU Pattern
```json
"skuPattern": "^MUG-"
```
Matches SKUs using a regular expression pattern. Enable by setting `checkSKU: true` in `identificationRules`.

### Identification Rules

Control which identification methods are active:

```json
"identificationRules": {
  "checkProductType": true,  // Check product_type field
  "checkTitle": true,        // Check product title
  "checkSKU": false          // Check SKU pattern (disabled by default)
}
```

### Defaults

Default design parameters for non-personalized products:

```json
"defaults": {
  "text": "",                    // Text to render (empty for preset-only)
  "fontFamily": "Yuji Syuku",   // Font family
  "fontSize": 40,                // Font size
  "color": "#000000",            // Text color
  "orientation": "horizontal"    // Text orientation
}
```

## Adding a New Product Type

To add a new non-personalized product:

1. Open `config/non-personalized-products.json`
2. Add a new entry in `productMapping`:

```json
"Posters": {
  "presetId": "japanese-motif",
  "productType": "PRESET_IMAGE",
  "description": "Posters with Japanese motif background",
  "identifiers": {
    "productType": "Posters",
    "titleContains": ["Poster", "Print", "Wall Art"]
  }
}
```

3. Ensure the `presetId` exists in `config/preset-mapping.json`
4. Restart your server for changes to take effect

## Preset Configuration

The preset IDs reference designs in `config/preset-mapping.json`:

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

Each preset should have:
- A corresponding background image stored in S3
- A Printful product ID for the background design

## Shopify Setup

In your Shopify admin:

1. **Set Product Type**: 
   - Go to Products > [Your Product]
   - Set the "Product type" field to match your identifier (e.g., "Mugs")

2. **Or Use Title Keywords**:
   - Include keywords from `titleContains` in your product title
   - Example: "Japanese Wave Coffee Mug"

3. **Variant SKUs**:
   - Ensure your product variants have proper Printful variant IDs in their SKUs
   - Format: `{printful_variant_id}_{color}` or `{printful_variant_id}_{size}_{color}`
   - Example: `4016_Black` for a specific mug variant

## Testing

To test if a product will be recognized:

1. Place a test order in Shopify
2. Check the server logs for these messages:
   ```
   Matched non-personalized product by type: Mugs
   Detected non-personalized product, creating default design data
   Processing preset product for order...
   ```

3. If not matched, verify:
   - Product type matches exactly (case-insensitive)
   - Or title contains one of the keywords
   - `identificationRules` are enabled for your method

## Troubleshooting

### Product Not Being Detected

**Check logs for:**
```
No design processing needed for order
```

**Solutions:**
1. Verify product type in Shopify matches config
2. Check that keywords exist in product title
3. Ensure `identificationRules` are enabled
4. Add more keywords to `titleContains`

### Wrong Preset Applied

**Solutions:**
1. Check the `presetId` in your product mapping
2. Verify preset exists in `config/preset-mapping.json`
3. Ensure S3 has the background image for that preset

### Order Not Sent to Printful

**Check:**
1. Preset background image is accessible in S3
2. Printful variant ID is correct in Shopify SKU
3. Server logs for error messages during order processing

## Example Workflows

### Scenario 1: Simple Mug Product

**Shopify Setup:**
- Product Title: "Japanese Wave Coffee Mug"
- Product Type: "Mugs"
- Variant SKU: `19_11oz` (Printful mug variant)

**Config:**
```json
"Mugs": {
  "presetId": "wave-horizontal",
  "productType": "PRESET_IMAGE",
  "identifiers": {
    "productType": "Mugs"
  }
}
```

**Result:** Order automatically fulfilled with wave-horizontal preset

### Scenario 2: Multiple Product Types

**Config:**
```json
{
  "productMapping": {
    "Mugs": {
      "presetId": "wave-horizontal",
      ...
    },
    "Posters": {
      "presetId": "japanese-motif",
      ...
    },
    "Stickers": {
      "presetId": "minimalist-lines",
      ...
    }
  }
}
```

Each product type gets its own preset design automatically.

## Notes

- **Restart Required**: Changes to the config file require a server restart
- **Multiple Matches**: First matching rule wins
- **Case Insensitive**: All text matching is case-insensitive
- **Empty Text**: Non-personalized products typically have empty text ("") and only use the preset background
- **Performance**: Product identification happens on every order, so keep rules simple and efficient

