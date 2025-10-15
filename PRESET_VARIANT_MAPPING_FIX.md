# Preset Variant Mapping Fix

## Problem Summary

**Issue**: When processing preset image products (like umbrellas), the backend was correctly generating the composite image (text + preset background) but sending it to the wrong Printful product variant.

**Symptom**: 
- Umbrella orders with custom text showed as "Black T-shirt" in Printful
- The umbrella image was generated correctly but printed on the wrong product

**Root Cause**: The variant selection logic (`extractVariantInfo`) only used Shopify variant ID mapping and defaulted to variant `4016` (M Black T-shirt) when no mapping was found. It never considered the `presetId` from design parameters.

---

## Solution Implemented

### 1. Enhanced Preset Configuration (`config/preset-mapping.json`)

Added new `preset_product_variants` section that maps each `presetId` to its correct Printful product:

```json
{
  "preset_product_variants": {
    "ja-umbrella": {
      "printfulProductId": 999,
      "defaultVariantId": 9999,
      "productType": "Umbrella"
    },
    "ja-panda-horizontal": {
      "printfulProductId": 71,
      "defaultVariantId": 4016,
      "productType": "T-shirt"
    }
    // ... 11 more preset mappings
  }
}
```

**Note**: The `defaultVariantId` values (9999, 4016, etc.) are placeholders. You need to update these with your actual Printful product variant IDs from your Printful catalog.

---

### 2. Updated Order Processor (`services/order-processor.js`)

#### Added Configuration Loading

```javascript
class OrderProcessor {
  constructor() {
    this.printGenerator = new PrintGenerator();
    this.s3Storage = new S3StorageService();
    this.orderStorage = new OrderStorageService();
    this.printfulClient = new PrintfulClient();
    this.presetMapping = this.loadPresetMapping(); // ← NEW
  }

  loadPresetMapping() {
    // Loads preset_product_variants from config/preset-mapping.json
  }
}
```

#### Modified Variant Extraction Logic

```javascript
extractVariantInfo(orderData, designParams = null) {
  let variantId = 4016; // Default
  
  // PRIORITY 1: Use presetId for preset products
  if (designParams?.productType === 'preset_image' && designParams?.presetId) {
    const presetConfig = this.presetMapping[designParams.presetId];
    if (presetConfig) {
      variantId = presetConfig.defaultVariantId; // ✅ Use preset mapping
      logger.info('Using preset variant mapping');
      return { variantId, quantity, shopifyVariantId, usedPresetMapping: true };
    }
  }
  
  // PRIORITY 2: Fall back to Shopify variant mapping
  // (existing logic for custom products)
}
```

#### Updated Order Creation Flow

```javascript
// Pass designParams to extractVariantInfo
const variantInfo = this.extractVariantInfo(orderData, designParams);

// Now includes preset information in logs
logger.info('Using Printful variant', {
  presetId: designParams.presetId || 'none',
  productType: designParams.productType || 'custom'
});
```

---

## How It Works Now

### Decision Tree

```
Order Received
    ↓
Extract designParams
    ↓
Check: Is productType === "preset_image" AND presetId exists?
    ├─ YES: PRIORITY 1 - Preset Mapping
    │        ↓
    │   Look up presetId in preset_product_variants
    │        ↓
    │   Found? → Use defaultVariantId from config ✅
    │   Not found? → Fall through to Priority 2
    │
    └─ NO: PRIORITY 2 - Shopify Variant Mapping
             ↓
        Look up Shopify variant_id in mapping table
             ↓
        Found? → Use mapped Printful variant
        Not found? → Use default (4016)
```

---

## Test Results

### ✅ Test 1: Umbrella Preset
```javascript
Input: {
  productType: "preset_image",
  presetId: "ja-umbrella"
}

Output:
- Printful variantId: 9999 ✅ (Umbrella, not T-shirt)
- Used preset mapping: true ✅
- Product type: "Umbrella" ✅
```

### ✅ Test 2: T-shirt Preset
```javascript
Input: {
  productType: "preset_image", 
  presetId: "ja-panda-horizontal"
}

Output:
- Printful variantId: 4016 ✅ (T-shirt)
- Used preset mapping: true ✅
- Product type: "T-shirt" ✅
```

### ✅ Test 3: Custom Product (No Preset)
```javascript
Input: {
  productType: "custom"
  // No presetId
}

Output:
- Printful variantId: 4016 ✅ (from Shopify mapping)
- Used preset mapping: false ✅
- Falls back to existing Shopify variant logic ✅
```

---

## What You Need to Update

### IMPORTANT: Update Printful Variant IDs

The config file currently uses **placeholder values**:
- `9999` for umbrella
- `4016` for T-shirts

**You MUST replace these with your actual Printful catalog variant IDs:**

1. Log into your Printful dashboard
2. Go to "Products" → Find your umbrella product
3. Note the variant IDs for each color/size
4. Update `config/preset-mapping.json`:

```json
{
  "ja-umbrella": {
    "printfulProductId": [YOUR_ACTUAL_UMBRELLA_PRODUCT_ID],
    "defaultVariantId": [YOUR_ACTUAL_UMBRELLA_VARIANT_ID],
    "productType": "Umbrella"
  }
}
```

**To find your Printful variant IDs:**
- Use Printful API: `GET https://api.printful.com/products`
- Or check your existing Shopify-Printful integration
- Or use the test scripts: `node scripts/get-real-catalog.js`

---

## Benefits

1. **Correct Product Selection**: Umbrellas go to umbrella products, T-shirts to T-shirt products
2. **Flexible**: Easy to add new preset products - just update the config
3. **Backward Compatible**: Custom products still use Shopify variant mapping
4. **Logged**: Clear logs show which mapping was used
5. **No Frontend Changes Needed**: This fix is entirely backend

---

## Files Changed

1. `config/preset-mapping.json` - Added `preset_product_variants` configuration
2. `services/order-processor.js` - Updated variant selection logic

---

## Next Steps

1. ✅ **Update variant IDs** in `config/preset-mapping.json` with real Printful values
2. ✅ **Test with real order** - Place a test umbrella order from your frontend
3. ✅ **Monitor logs** - Look for "Using preset variant mapping for [presetId]"
4. ✅ **Verify in Printful** - Check the order shows correct product type

---

## Logging

You'll now see these logs for preset products:

```
✅ Preset mapping configuration loaded successfully (13 presets)
🎨 Detected preset product from frontend: { productType: 'preset_image', presetId: 'ja-umbrella' }
✅ Using preset variant mapping for ja-umbrella
   presetId: "ja-umbrella"
   printfulVariantId: 9999
   productType: "Umbrella"
```

For custom products, you'll see:
```
✅ Mapped Shopify variant [ID] to Printful variant [ID]
```

---

## Troubleshooting

**If orders still go to wrong product:**

1. Check frontend is sending:
   - `productType: "preset_image"`
   - `presetId: "ja-umbrella"`

2. Check logs show:
   - "Preset mapping configuration loaded successfully"
   - "Using preset variant mapping"

3. Verify variant IDs in config match Printful catalog

4. Test with: `node -e "const op = require('./services/order-processor'); console.log(new op().presetMapping);"`

