# Printful Sync Variant System Implementation

## Overview

Replaced manual variant mapping with Printful's sync variant system. Since products are synced FROM Printful TO Shopify, Printful already maintains the mapping between Shopify external IDs and Printful sync variants.

---

## Problem Solved

### Before (Manual Mapping)
```json
// config/preset-mapping.json
{
  "48529384756373": 12346  // ← Had to manually map each variant
}
```

**Issues:**
- ❌ Manual maintenance required for every new variant
- ❌ Error-prone (easy to get wrong IDs)
- ❌ Didn't scale well with multiple products/colors/sizes

### After (Sync Variant System)
```javascript
// Automatically looks up sync variant from Printful using Shopify variant ID
syncVariantId = await printfulClient.getSyncVariantId(shopifyVariantId);
// Returns: Printful sync variant ID that already knows its catalog variant
```

**Benefits:**
- ✅ No manual mapping needed
- ✅ Always accurate (uses Printful's source of truth)
- ✅ Works for ALL synced products automatically
- ✅ Easy to maintain

---

## How It Works

### Architecture

```
Frontend sends: shopifyVariantId
       ↓
Backend receives: extract from designParams.shopifyVariantId or lineItem.variant_id
       ↓
Call Printful API: GET /store/products → search for variant
       ↓
Find matching variant: where external_id === shopifyVariantId
       ↓
Extract: sync_variant.id
       ↓
Cache result: for future lookups
       ↓
Create order: using sync_variant_id
```

---

## Implementation Details

### 1. PrintfulClient - Sync Variant Lookup

**File:** `services/printful-client.js`

#### Method: `getSyncVariantId(shopifyVariantId)`

**Purpose:** Look up Printful sync variant ID from Shopify variant ID

**Flow:**
```javascript
1. Check cache first (instant if cached)
2. If not cached:
   a. GET /store/products (list all synced products)
   b. For each product:
      - GET /store/products/{id} (get variant details)
      - Find variant where external_id matches shopifyVariantId
      - Return sync variant ID
   c. Cache the result
3. Return sync variant ID or null
```

**Performance:**
- First lookup: ~2-5 seconds (searches all products)
- Subsequent lookups: Instant (cached)
- Cache persists for server lifetime

#### Method: `buildSyncVariantCache()`

**Purpose:** Pre-populate cache on server startup

**Flow:**
```javascript
1. GET /store/products (all synced products)
2. For each product:
   - GET /store/products/{id}
   - Extract all sync_variants
   - Map external_id → sync_variant.id
3. Store in this.syncVariantCache
```

**Benefits:**
- Builds cache in background on startup
- All subsequent orders use cache (instant)
- Reduces API calls during order processing

---

### 2. PrintfulClient - Order Creation

**File:** `services/printful-client.js` - `createDraftOrder()`

**Updated to support both systems:**

```javascript
const item = {
  quantity: orderData.quantity || 1,
  files: [{ url: printFileUrl, type: 'default' }]
};

// Prefer sync_variant_id (synced products), fallback to variant_id (catalog)
if (orderData.syncVariantId) {
  item.sync_variant_id = orderData.syncVariantId;  // ← NEW: Uses sync system
} else {
  item.variant_id = orderData.printfulVariantId;    // ← FALLBACK: Old method
}
```

**Printful API Accepts:**
- `sync_variant_id` - For synced products (preferred)
- `variant_id` - For catalog products (fallback)

---

### 3. Order Processor - Variant Selection

**File:** `services/order-processor.js`

**New Priority System:**

```
Priority 1: Sync Variant Lookup (NEW!)
  └─ Call getSyncVariantId(shopifyVariantId)
  └─ Use Printful's sync variant system
  └─ Cache results for performance
  
Priority 2: Fallback to Legacy Mapping
  └─ Only if sync variant not found
  └─ Use extractVariantInfo() with manual mappings
  └─ Ensures backward compatibility
```

**Code Flow:**
```javascript
// Try sync variant lookup first
const syncVariantId = await printfulClient.getSyncVariantId(shopifyVariantId);

if (syncVariantId) {
  // Use sync variant ✅
  printfulOrderData = { syncVariantId: syncVariantId };
} else {
  // Fallback to manual mapping ⚠️
  const variantInfo = extractVariantInfo(orderData, designParams);
  printfulOrderData = { printfulVariantId: variantInfo.variantId };
}
```

---

## Test Cases

### Test 1: Successful Sync Variant Lookup

**Input:**
```javascript
shopifyVariantId: "48529384756373"  // Blue Umbrella from Shopify
```

**Expected Flow:**
```
1. Check cache → Not found
2. Call Printful API → GET /store/products
3. Search products for variant with external_id: "48529384756373"
4. Find sync_variant.id: 12345
5. Cache: { "48529384756373": 12345 }
6. Return: 12345
```

**Order Creation:**
```javascript
{
  items: [{
    sync_variant_id: 12345,  // ✅ Uses sync variant
    files: [{ url: "s3://umbrella-image.png" }]
  }]
}
```

**Result:** ✅ Printful receives correct Blue Umbrella variant

---

### Test 2: Cached Lookup (Subsequent Order)

**Input:**
```javascript
shopifyVariantId: "48529384756373"  // Same variant, second order
```

**Expected Flow:**
```
1. Check cache → Found: 12345
2. Return immediately: 12345 (no API call)
```

**Performance:** Instant (< 1ms)

**Result:** ✅ Fast order processing

---

### Test 3: Variant Not Found (Fallback)

**Input:**
```javascript
shopifyVariantId: "99999999999"  // Not a synced product
```

**Expected Flow:**
```
1. Check cache → Not found
2. Call Printful API → Search all products
3. No matching variant found
4. Return: null
5. Fallback: Use extractVariantInfo() → 4016
```

**Order Creation:**
```javascript
{
  items: [{
    variant_id: 4016,  // ⚠️ Uses fallback catalog variant
    files: [{ url: "s3://image.png" }]
  }]
}
```

**Result:** ⚠️ Order created with fallback variant

---

## Logging

### Successful Sync Variant Lookup

```
[Printful] Looking up sync variant for Shopify variant: 48529384756373
[Printful] Searching through 25 synced products...
[Printful] Found sync variant: 12345 for Shopify variant: 48529384756373
  productName: "Japanese Umbrella"
  variantName: "Blue"
✅ Using Printful sync variant system
  shopifyVariantId: 48529384756373
  syncVariantId: 12345
  productType: preset_image
[PrintfulClient] Using sync_variant_id: 12345
[PrintfulClient] Draft order created successfully: 67890
```

### Cached Lookup (Fast Path)

```
[Printful] Using cached sync variant: 12345 for Shopify variant: 48529384756373
✅ Using Printful sync variant system
  shopifyVariantId: 48529384756373
  syncVariantId: 12345
[PrintfulClient] Using sync_variant_id: 12345
```

### Fallback to Manual Mapping

```
⚠️ Sync variant not found for Shopify variant 99999999999, will use fallback
⚠️ Using fallback variant mapping
  fallbackVariantId: 4016
  selectionMethod: preset_fallback
[PrintfulClient] Using catalog variant_id: 4016
```

---

## Cache Building (Background Process)

On server startup, the system automatically builds a cache:

```
[Printful] Building sync variant cache...
[Printful] Found 25 synced products, building cache...
  (searches each product for variants)
[Printful] Sync variant cache built successfully: 150 variants cached
```

**Performance:**
- Runs in background (non-blocking)
- Takes ~30-60 seconds depending on product count
- Saves time on all subsequent orders

---

## API Endpoints Used

### GET /store/products
**Purpose:** List all synced products

**Response:**
```json
{
  "result": [
    { "id": 123, "name": "Japanese Umbrella" },
    { "id": 124, "name": "Custom T-Shirt" }
  ]
}
```

### GET /store/products/{id}
**Purpose:** Get detailed product info including variants

**Response:**
```json
{
  "result": {
    "sync_product": { "name": "Japanese Umbrella" },
    "sync_variants": [
      {
        "id": 12345,              // ← Sync variant ID (what we need)
        "external_id": "48529384756373",  // ← Shopify variant ID (what we search by)
        "variant_id": 9999,       // ← Catalog variant ID
        "name": "Blue"
      }
    ]
  }
}
```

---

## Configuration

### Minimal Required

**File:** `.env`
```
PRINTFUL_API_KEY=your_api_key_here
PRINTFUL_STORE_ID=your_store_id_here  # Optional but recommended
```

### Optional Fallback Mappings

**File:** `config/preset-mapping.json`

Keep fallback mappings for when sync variant lookup fails:

```json
{
  "preset_fallbacks": {
    "ja-umbrella": 12345,
    "ja-panda-horizontal": 4016
  }
}
```

**Note:** These are only used if:
1. Printful API is down
2. Shopify variant not found in Printful
3. API credentials are invalid

---

## Migration from Manual Mapping

### Phase 1: Dual System (Current)
- ✅ Try sync variant lookup first
- ⚠️ Fallback to manual mapping if needed
- Both systems work in parallel

### Phase 2: Monitor & Verify
- Test with real orders
- Monitor logs for fallback usage
- Verify all variants resolve via sync system

### Phase 3: Cleanup (Future)
- Remove `shopify_to_printful_variants` from config
- Remove `extractVariantInfo()` preset logic
- Keep only sync variant system

---

## Files Modified

1. ✅ `services/printful-client.js`
   - Added `syncVariantCache` property
   - Added `getSyncVariantId()` method
   - Added `buildSyncVariantCache()` method
   - Updated `createDraftOrder()` to use `sync_variant_id`

2. ✅ `services/order-processor.js`
   - Updated order creation to fetch sync variant
   - Added fallback to legacy mapping
   - Enhanced logging

3. ✅ `config/preset-mapping.json`
   - Kept `preset_fallbacks` for safety
   - Can remove `shopify_to_printful_variants` after testing

---

## Testing Instructions

### Step 1: Verify API Credentials

```bash
# Check .env file has:
PRINTFUL_API_KEY=your_actual_key
```

### Step 2: Test Cache Building

```bash
node -e "const pc = require('./services/printful-client'); const client = new pc(); setTimeout(() => { console.log('Cache size:', Object.keys(client.syncVariantCache).length); }, 60000);"
```

**Expected:** Cache builds with your variant count

### Step 3: Test Individual Lookup

```bash
node -e "const pc = require('./services/printful-client'); const client = new pc(); client.getSyncVariantId('YOUR_SHOPIFY_VARIANT_ID').then(id => console.log('Sync variant:', id));"
```

**Replace:** `YOUR_SHOPIFY_VARIANT_ID` with real Shopify variant from your store

**Expected:** Returns Printful sync variant ID

### Step 4: Test Full Order Flow

Place a test order from your frontend and check logs for:

```
✅ Using Printful sync variant system
  shopifyVariantId: [YOUR_ID]
  syncVariantId: [PRINTFUL_SYNC_ID]
[PrintfulClient] Using sync_variant_id: [ID]
[PrintfulClient] Draft order created successfully: [ORDER_ID]
```

---

## Advantages Over Manual Mapping

| Aspect | Manual Mapping | Sync Variant System |
|--------|----------------|---------------------|
| **Maintenance** | Manual updates needed | Automatic |
| **Accuracy** | Prone to errors | Always correct |
| **New Products** | Must add mappings | Works automatically |
| **API Calls** | None | Cached after first lookup |
| **Scalability** | Poor (grows with variants) | Excellent (automatic) |
| **Reliability** | Config file errors | Printful source of truth |

---

## Error Handling

### Scenario 1: Printful API Down
```
Error getting sync variant → Use fallback mapping → Order still processes
```

### Scenario 2: Shopify Variant Not Synced
```
Sync variant not found → Use preset fallback → Order uses default variant
```

### Scenario 3: Invalid API Key
```
Cache build fails → getSyncVariantId fails → Fallback mapping used
```

**Result:** System degrades gracefully, orders still process

---

## Performance Metrics

### Cache Building (Server Startup)
- **Time:** 30-60 seconds (depends on product count)
- **Frequency:** Once per server restart
- **API Calls:** 1 + N (where N = number of products)

### Sync Variant Lookup (Per Order)
- **First lookup:** 2-5 seconds (searches products, then caches)
- **Cached lookup:** < 1ms (instant)
- **API Calls:** 0 if cached, 1 + N if not cached

### Order Processing Impact
- **Before:** Instant (used hardcoded variant)
- **After (cached):** Instant (cache lookup)
- **After (uncached):** +2-5 seconds (one-time lookup, then cached)

---

## Monitoring & Debugging

### Check Cache Status

```javascript
// In Node REPL or debug script:
const PrintfulClient = require('./services/printful-client');
const client = new PrintfulClient();

// Wait for cache to build (or check later)
setTimeout(() => {
  console.log('Cache entries:', Object.keys(client.syncVariantCache).length);
  console.log('Sample mappings:', Object.entries(client.syncVariantCache).slice(0, 5));
}, 10000);
```

### Check Specific Variant

```javascript
const syncId = await client.getSyncVariantId('YOUR_SHOPIFY_VARIANT_ID');
console.log('Sync variant ID:', syncId);
```

### Monitor Logs

Watch for these log patterns:

**Success:**
```
✅ Using Printful sync variant system
[Printful] Using cached sync variant: 12345
```

**Fallback:**
```
⚠️ Sync variant not found, will use fallback
⚠️ Using fallback variant mapping
```

---

## Backward Compatibility

The system includes complete fallback chain:

```
1. Try sync variant lookup ← NEW, preferred
2. Use preset fallback mapping
3. Use legacy Shopify mapping
4. Use manual variant mapping
5. Use global fallback (4016)
```

**This ensures:**
- ✅ Existing orders continue working
- ✅ No disruption during deployment
- ✅ Safe gradual migration
- ✅ Can remove old mappings after verification

---

## Configuration Required

### Required Environment Variables

```bash
PRINTFUL_API_KEY=your_printful_api_key_here
```

### Optional Configuration

**File:** `config/preset-mapping.json`

Keep fallback mappings for safety:
```json
{
  "preset_fallbacks": {
    "ja-umbrella": 12345,
    "ja-panda-horizontal": 4016
  }
}
```

---

## Next Steps

### Step 1: Verify API Access
```bash
# Test Printful API access
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.printful.com/store/products
```

**Expected:** List of your synced products

### Step 2: Monitor Cache Building

After server starts, check logs for:
```
[Printful] Building sync variant cache...
[Printful] Found [N] synced products, building cache...
[Printful] Sync variant cache built successfully: [N] variants cached
```

### Step 3: Place Test Orders

Test with:
1. ✅ Umbrella (Blue) - Should use sync variant
2. ✅ T-shirt with preset design - Should use sync variant
3. ✅ Custom T-shirt - Should use sync variant
4. ✅ Unmapped product - Should use fallback

### Step 4: Verify in Printful Dashboard

Check that orders show correct:
- Product type (Umbrella, not T-shirt)
- Color/size (Blue, not Red)
- Print file (custom text + preset background)

---

## Success Criteria

After deployment:

✅ Cache builds successfully on server startup  
✅ First order for each variant looks up sync variant  
✅ Subsequent orders use cached sync variant (instant)  
✅ Printful receives correct product variant  
✅ No manual variant mapping needed  
✅ Fallback system works if API fails  
✅ All product types (custom, preset, static) work correctly

---

## Troubleshooting

### Issue: Cache not building

**Symptoms:**
```
[Printful] Error building sync variant cache: Request failed with status code 400
```

**Causes:**
1. Invalid `PRINTFUL_API_KEY`
2. Missing API permissions
3. No synced products in Printful

**Fix:**
- Verify API key in `.env`
- Check Printful dashboard has synced products
- Verify API key has read permissions

---

### Issue: Sync variant not found

**Symptoms:**
```
⚠️ Sync variant not found for Shopify variant [ID]
⚠️ Using fallback variant mapping
```

**Causes:**
1. Product not synced from Printful to Shopify
2. Shopify variant ID doesn't match external_id in Printful
3. Cache not built yet

**Fix:**
- Verify product is synced in Printful dashboard
- Check Shopify variant ID matches Printful external_id
- Wait for cache to build (or manually trigger lookup)

---

### Issue: Orders using fallback variant

**Symptoms:**
```
[PrintfulClient] Using catalog variant_id: 4016
```

**This is normal if:**
- Product not synced in Printful
- First order before cache built
- API temporarily unavailable

**Check logs for:**
- Did sync variant lookup complete?
- Was it cached?
- What was the error?

---

## Files Changed

1. ✅ `services/printful-client.js` - Added sync variant system
2. ✅ `services/order-processor.js` - Updated to use sync variants
3. ✅ `config/preset-mapping.json` - Restructured for dual system
4. ✅ `SYNC_VARIANT_SYSTEM.md` - This documentation

---

## Benefits Summary

1. **Zero Manual Mapping** - Printful maintains the mapping automatically
2. **Always Accurate** - Uses Printful's source of truth
3. **Scalable** - Works for any number of products/variants
4. **Fast** - Cache makes lookups instant after first use
5. **Reliable** - Fallback system ensures orders always process
6. **Easy Maintenance** - New products work without config changes

---

## Future Enhancements

### Optional: Manual Cache Refresh Endpoint

Add to `routes/debug.js` or similar:
```javascript
router.post('/admin/refresh-sync-cache', async (req, res) => {
  const client = new PrintfulClient();
  const cache = await client.buildSyncVariantCache();
  res.json({ 
    success: true, 
    variantsCached: Object.keys(cache).length 
  });
});
```

### Optional: Scheduled Cache Refresh

Add to server.js:
```javascript
// Refresh cache every 24 hours
setInterval(async () => {
  console.log('[Server] Refreshing Printful sync variant cache...');
  await printfulClient.buildSyncVariantCache();
}, 24 * 60 * 60 * 1000);
```

**Benefit:** Keep cache fresh without restarting server

