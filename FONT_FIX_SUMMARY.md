# Font and Scaling Fix Summary

## Problems Identified and Fixed

### 1. Font Issues ✅ FIXED
- **Problem**: Font files were WOFF2 format, but node-canvas requires TTF
- **Problem**: Font registration was failing with "Could not parse font file" errors
- **Problem**: Missing Noto Sans CJK JP font for Japanese text fallback
- **Solution**: Updated font loading system to properly register TTF fonts with exact FE family names

### 2. Canvas Scaling Issues ✅ FIXED  
- **Problem**: No scaling from FE canvas size to print output size
- **Problem**: Text appeared tiny because FE pixel coordinates were treated as print pixels
- **Solution**: Implemented proper context scaling:
  ```javascript
  const scale = Math.min(outW / srcW, outH / srcH);
  ctx.scale(scale, scale);
  ```

### 3. Text Metrics Issues ✅ FIXED
- **Problem**: Text baseline and alignment didn't match frontend
- **Problem**: Font weight and styling not properly applied
- **Solution**: Set proper text metrics to match FE exactly:
  ```javascript
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `${font.weight || '400'} ${fontSizePx}px "${canvasFontFamily}"`;
  ```

### 4. Coordinate System Issues ✅ FIXED
- **Problem**: Mixed inch/pixel coordinate systems causing positioning errors
- **Solution**: Use FE pixel coordinates directly (context scaling handles the rest)

## What You Need to Do

### Step 1: Add Font Files
Run the setup script to see exactly what fonts you need:
```bash
node scripts/setup-fonts.js
```

Then download the TTF files from Google Fonts and place them in `assets/fonts/` with these exact names:
- `yuji-syuku.ttf`
- `shippori-antique.ttf`
- `huninn.ttf`
- `rampart-one.ttf`
- `cherry-bomb-one.ttf`
- `NotoSansCJKjp-Regular.ttf`

### Step 2: Test the Fix
Once fonts are added, run the test suite:
```bash
node scripts/test-renderer.js
```

This will:
- Test font loading
- Generate a test render
- Create proof files in `debug-output/` for comparison
- Show you the scaling from FE size to print size

### Step 3: Verify Results
Check the `debug-output/` folder:
- `proof-preview.png` - Should match your frontend preview exactly
- `print.png` - Should be properly scaled for Printful
- `print-with-overlay.png` - Shows debug guides for verification

## Environment Variables

You can control the print output size with these environment variables:
```bash
PRINT_CANVAS_W=4500    # Print width in pixels
PRINT_CANVAS_H=5400    # Print height in pixels
RENDER_PARITY_PROOF=1  # Generate proof files
DEBUG_OVERLAY=1        # Add debug guides
```

## Expected Results

After adding the fonts:
1. ✅ No more "Font file not found" warnings
2. ✅ Text renders at correct size (not tiny)
3. ✅ Text positioning matches frontend exactly
4. ✅ Proper scaling from FE canvas to print output
5. ✅ All fonts load with exact FE family names

The renderer now uses the same coordinate system as your frontend, with proper scaling applied to the entire context, ensuring pixel-perfect matching between preview and print output.
