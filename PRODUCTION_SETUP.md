# 🚀 Production Setup Guide - 100% Working Pipeline

## Step 1: Get Your Real Printful Catalog

### Option A: Use the Script (Recommended)
```bash
# Set your Printful API key
export PRINTFUL_API_KEY="your_actual_api_key_here"

# Run the catalog fetcher
node scripts/get-printful-catalog.js
```

This will:
- Fetch all your Printful products
- Find t-shirt products
- Show real variant IDs and SKUs
- Save to `printful-catalog.json`

### Option B: Manual Check
1. Go to [Printful Dashboard](https://www.printful.com/dashboard)
2. Navigate to **Products** → **Catalog**
3. Find your t-shirt products
4. Note the **Variant IDs** and **SKUs**

## Step 2: Update Your Shopify SKUs

Your Shopify product variants need SKUs that match Printful's format:

### Printful SKU Format:
- `{variant_id}_{color}` (e.g., `4016_Black`, `4017_White`)
- `{variant_id}_{size}_{color}` (e.g., `4016_M_Black`)

### Example Mapping:
```
Printful Variant ID: 4016 (Bella+Canvas 3001, M, Black)
Shopify SKU: 4016_Black

Printful Variant ID: 4017 (Bella+Canvas 3001, L, Black)  
Shopify SKU: 4017_Black
```

## Step 3: Set Environment Variables

Create a `.env` file with your real credentials:

```bash
# Printful Configuration
PRINTFUL_API_KEY=your_actual_printful_api_key
PRINTFUL_STORE_ID=your_actual_store_id

# AWS S3 Configuration  
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
S3_BUCKET_NAME=your_actual_bucket_name

# Pipeline Configuration
PRINT_RENDERER_V2=1

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Step 4: Test with Real Order

### Test Script:
```bash
node test-real-order.js
```

This tests with SKU `4016_Black` which should work if you have that variant in your catalog.

### Manual Test:
1. Create a test order in your Shopify store
2. Use a product with SKU format: `{variant_id}_{color}`
3. Add `_layout_snapshot_v2` to line item properties
4. Watch the server logs for successful processing

## Step 5: Verify End-to-End Flow

### Expected Logs:
```
[WebhookV2] Processing order X with Y line items
[WebhookV2] Extracting design data from Y line items
[WebhookV2] Property: _layout_snapshot_v2 = {...}
[WebhookV2] Rendering PNG for line item X
[WebhookV2] Uploading PNG to S3 for line item X
[WebhookV2] Resolving catalog variant for SKU: 4016_Black
[Catalog] Extracted variant ID: 4016 from SKU: 4016_Black
[Printful] 200 /catalog/variants/4016 { result: 'present', error: 'none' }
[Catalog] Found catalog variant: 4016 (Bella+Canvas 3001)
[WebhookV2] Successfully processed 1 items for order X
```

### Check Printful Dashboard:
1. Go to **Orders** → **Draft Orders**
2. Find your test order
3. Verify it has a catalog item (not sync item)
4. Check the file URL points to your S3 bucket
5. Verify the mockup shows your design

## Step 6: Common Issues & Solutions

### Issue: "Catalog variant not found"
**Solution**: 
- Check if the variant ID exists in your Printful catalog
- Verify your SKU format matches: `{variant_id}_{color}`
- Run the catalog fetcher script to see available variants

### Issue: "S3 upload failed"
**Solution**:
- Verify AWS credentials are correct
- Check S3 bucket permissions
- Ensure bucket exists in the specified region

### Issue: "Font rendering warnings"
**Solution**:
- This is normal - system fonts are used as fallbacks
- For production, consider converting WOFF2 fonts to TTF
- The rendering still works correctly

### Issue: "Rate limit warnings"
**Solution**:
- These are just warnings in development
- In production with proper proxy setup, they won't appear
- The pipeline still works correctly

## Step 7: Production Deployment

### Docker Deployment:
```bash
# Build the image
docker build -t tshirt-designer-backend .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e PRINTFUL_API_KEY=your_key \
  -e PRINTFUL_STORE_ID=your_store_id \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  -e S3_BUCKET_NAME=your_bucket \
  -e PRINT_RENDERER_V2=1 \
  tshirt-designer-backend
```

### Environment Variables:
Make sure all required environment variables are set in your production environment.

## Step 8: Monitoring

### Key Metrics to Monitor:
- Order processing success rate
- Average processing time
- S3 upload success rate
- Printful API error rate
- Font loading success rate

### Log Monitoring:
Watch for these success indicators:
- `[WebhookV2] Successfully processed X items for order Y`
- `[Catalog] Found catalog variant: X (Product Name)`
- `[Orders] Successfully added catalog item: X`

## 🎯 Success Criteria

Your pipeline is 100% working when you see:

1. ✅ **No "Catalog variant not found" errors**
2. ✅ **Successful S3 uploads** (PNG files in your bucket)
3. ✅ **Printful orders created** with catalog items
4. ✅ **File URLs pointing to S3** in Printful dashboard
5. ✅ **Mockups showing your designs** correctly

## 🚀 You're Ready!

Once you see the success criteria above, your fulfillment pipeline V2 is 100% operational and ready for production use!
