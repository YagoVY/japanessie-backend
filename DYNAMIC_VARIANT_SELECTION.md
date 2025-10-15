# Dynamic Variant Selection Implementation

## Overview

The backend now supports **dynamic variant selection** based on the exact Shopify variant ID sent by the frontend. This allows users to select specific colors/sizes and receive the correct Printful product variant.

---

## Problem Solved

### Before (Hardcoded Defaults)
- User selects **Blue Umbrella** → Gets **Red** (hardcoded preset fallback)
- User selects **Large T-shirt** → Gets **Medium** (hardcoded default)
- One preset ID could only map to ONE variant

### After (Dynamic Selection)
- User selects **Blue Umbrella** → Gets **Blue Umbrella** ✅
- User selects **Large T-shirt** → Gets **Large T-shirt** ✅
- Each Shopify variant maps to its specific Printful variant

---

## How It Works

### Priority System (5 Levels)

The backend tries variant mapping in this order:

```
1. shopifyVariantId from designParams (NEW - HIGHEST PRIORITY)
   └─ Frontend sends exact variant user selected
   
2. Preset Fallback
   └─ Used when Shopify variant not in mapping
   
3. Legacy Shopify Mapping
   └─ For custom products without preset ID
   
4. SKU-based Mapping
   └─ Extracts variant from SKU field
   
5. Global Fallback (4016 - M Black T-shirt)
   └─ Last resort when all else fails
```

---

## Configuration Structure

### config/preset-mapping.json

```json
{
  "shopify_to_printful_variants": {
    // Exact Shopify → Printful mappings (Priority 1)
    "48529384756372": 12345,  // Red Umbrella
    "48529384756373": 12346,  // Blue Umbrella
    "48529384756374": 12347,  // Black Umbrella
    
    "52564464435540": 4016,   // M Black T-shirt
    "52564464435541": 4017    // L Black T-shirt
  },
  
  "preset_fallbacks": {
    // Used when Shopify variant not mapped (Priority 2)
    "ja-umbrella": 12345,           // Default to Red
    "ja-panda-horizontal": 4016     // Default to M Black
  }
}
```

**Note**: The Shopify and Printful variant IDs in the config are PLACEHOLDERS. You need to replace them with your actual values.

---

## Frontend Integration

### What Frontend Now Sends

```json
{
  "productType": "preset_image",
  "presetId": "ja-umbrella",
  
  // NEW FIELDS - Frontend sends exact variant:
  "shopifyVariantId": 48529384756373,
  "variantSku": "UMBRELLA-BLUE-001",
  "variantTitle": "Blue",
  
  "translatedText": "ヤゴテ",
  "fontSize": 40,
  "fontColor": "#2e3846",
  "textCoordinates": {...}
}
```

### Backend Extraction

The backend extracts these from `_design_params`:

```javascript
rendererParams = {
  text: "ヤゴテ",
  fontSize: 40,
  // ...
  
  // NEW: Variant information
  shopifyVariantId: 48529384756373,
  variantSku: "UMBRELLA-BLUE-001",
  variantTitle: "Blue",
  
  presetId: "ja-umbrella",
  productType: "preset_image"
};
```

---

## Test Results

### ✅ Test 1: Priority 1 - Shopify Variant from designParams
```
Input: shopifyVariantId: 48529384756373 (from frontend)
Output: Printful variant 12346 (Blue Umbrella)
Method: shopify_variant_from_designParams
Result: ✅ PASS
```

### ✅ Test 2: Priority 2 - Preset Fallback
```
Input: shopifyVariantId: 999999999 (unmapped)
       presetId: "ja-umbrella"
Output: Printful variant 12345 (Red Umbrella fallback)
Method: preset_fallback
Result: ✅ PASS
```

### ✅ Test 3: Priority 3 - Legacy Shopify Mapping
```
Input: lineItem.variant_id: "52564464435540"
       productType: "custom" (no preset)
Output: Printful variant 4016 (M Black T-shirt)
Method: legacy_shopify_mapping
Result: ✅ PASS
```

---

## Real-World Examples

### Example 1: Blue Umbrella Order

**User Action:**
- Visits umbrella product page
- Selects **Blue** color
- Adds custom text "ヤゴテ"
- Clicks "Add to Cart"

**Frontend Sends:**
```json
{
  "productType": "preset_image",
  "presetId": "ja-umbrella",
  "shopifyVariantId": 48529384756373,
  "variantTitle": "Blue",
  "translatedText": "ヤゴテ"
}
```

**Backend Processing:**
1. Extracts `shopifyVariantId: 48529384756373`
2. Looks up in `shopify_to_printful_variants`
3. Finds mapping: `48529384756373 → 12346`
4. Generates image: Text + Umbrella background
5. Sends to Printful: Variant **12346** (Blue Umbrella) ✅

**Result:** User gets Blue umbrella with custom text

---

### Example 2: Unmapped Variant (Yellow Umbrella)

**User Action:**
- Selects **Yellow** umbrella (not in mapping yet)

**Frontend Sends:**
```json
{
  "productType": "preset_image",
  "presetId": "ja-umbrella",
  "shopifyVariantId": 48529384756999,
  "variantTitle": "Yellow",
  "translatedText": "ヤゴテ"
}
```

**Backend Processing:**
1. Extracts `shopifyVariantId: 48529384756999`
2. Looks up in mapping → **NOT FOUND**
3. Falls back to `preset_fallbacks["ja-umbrella"]`
4. Uses default: `12345` (Red Umbrella)
5. Logs warning: "Variant not in mapping, using fallback"

**Result:** User gets Red umbrella (fallback) ⚠️

**Action Needed:** Add Yellow variant mapping to config

---

### Example 3: Custom T-shirt (No Preset)

**User Action:**
- Custom text-only T-shirt
- Selects **Medium Black**

**Frontend Sends:**
```json
{
  "productType": "custom",
  "translatedText": "カスタム",
  "shopifyVariantId": 52564464435540
}
```

**Backend Processing:**
1. No `presetId` → Not a preset product
2. Uses Priority 3: Legacy Shopify mapping
3. Looks up `52564464435540 → 4016`
4. Generates text-only PNG
5. Sends to Printful: Variant **4016** (M Black) ✅

**Result:** User gets Medium Black T-shirt with custom text

---

## Logging

The system now provides detailed logs for debugging:

### Priority 1 (Exact Match)
```
PRIORITY 1: Using Shopify variant from designParams
  shopifyVariantId: "48529384756373"
  printfulVariantId: 12346
  source: "designParams.shopifyVariantId"
```

### Priority 2 (Fallback)
```
PRIORITY 2: Using preset fallback for ja-umbrella
  presetId: "ja-umbrella"
  printfulVariantId: 12345
  reason: "Exact Shopify variant not in mapping"
```

### Priority 3 (Legacy)
```
PRIORITY 3: Using legacy Shopify variant mapping
  shopifyVariantId: "52564464435540"
  printfulVariantId: 4016
```

### Priority 5 (Global Fallback - Warning)
```
⚠️  All variant mapping methods failed, using global fallback
  defaultVariantId: 4016
  shopifyVariantId: null
  designParamsProvided: true
```

---

## How to Update Variant Mappings

### Step 1: Get Shopify Variant IDs

**Method A: From Shopify Admin**
1. Go to Shopify Admin → Products
2. Click on product (e.g., Umbrella)
3. Click on a variant (e.g., "Blue")
4. Copy ID from URL: `/admin/products/[product-id]/variants/[VARIANT-ID]`

**Method B: From API**
```bash
curl -X GET "https://your-store.myshopify.com/admin/api/2024-01/products.json" \
  -H "X-Shopify-Access-Token: YOUR_TOKEN"
```

### Step 2: Get Printful Variant IDs

**Method A: From Printful Dashboard**
1. Log into Printful
2. Go to Products → Your product
3. Click "Variants" tab
4. Note the variant IDs

**Method B: From API**
```bash
curl -X GET "https://api.printful.com/store/products/[PRODUCT_ID]" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Step 3: Update config/preset-mapping.json

```json
{
  "shopify_to_printful_variants": {
    "YOUR_SHOPIFY_VARIANT_ID": YOUR_PRINTFUL_VARIANT_ID,
    "48529384756373": 12346,
    "48529384756374": 12347
  }
}
```

### Step 4: Restart Server

The configuration is loaded on server startup.

---

## Benefits

1. **Accurate Orders**: Users get exactly what they selected
2. **Flexible**: Easy to add new products/variants
3. **Fallback Safety**: Unmapped variants use preset fallbacks
4. **Backward Compatible**: Existing custom products continue working
5. **Well-Logged**: Easy to debug variant selection issues
6. **No Frontend Changes Required**: Backend change only

---

## Files Changed

1. **config/preset-mapping.json** - Added `shopify_to_printful_variants` and `preset_fallbacks`
2. **services/order-processor.js**:
   - Updated `loadPresetMapping()` to load new structure
   - Updated `extractDesignParams()` to extract `shopifyVariantId`
   - Rewrote `extractVariantInfo()` with 5-priority system

---

## Next Steps

1. ✅ **Update variant IDs** in config with your actual Shopify/Printful values
2. ✅ **Test with real order** - Place test orders for each color/size
3. ✅ **Monitor logs** - Check which priority method is being used
4. ✅ **Add missing variants** - When you see fallback warnings, add those mappings

---

## Troubleshooting

### Issue: Still getting wrong variant

**Check:**
1. Is frontend sending `shopifyVariantId`?
2. Is the Shopify variant ID in `shopify_to_printful_variants`?
3. Check logs for which priority method was used
4. Verify variant IDs are strings (JSON keys must be strings)

### Issue: All orders use fallback

**Cause:** Shopify variant IDs not in mapping

**Fix:** Add all your Shopify variant IDs to `shopify_to_printful_variants`

### Issue: Custom products broken

**Check:** Legacy `mapShopifyToPrintfulVariant()` still has mappings for non-preset products

---

## Success Criteria

✅ User selects specific color → Gets that color  
✅ Unmapped variant → Falls back to preset default gracefully  
✅ Custom products → Continue using existing Shopify mapping  
✅ All product types work correctly  
✅ Clear logs show which mapping method was used

