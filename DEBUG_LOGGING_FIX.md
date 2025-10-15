# Debug Logging Fix

## Problem

The debug logs were printing large arrays of numbers and buffer data, causing log spam like:
```
[PrintRenderer] Design parameters extracted: {
  "buffer": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,244,12,242,40,39,110,91,90,229,41,0,0,0,0,73,69,78,68,174,66,96,130]
}
```

This made debug logs unreadable and caused performance issues.

## Solution

Added intelligent data filtering to `debugLog` functions in:
- `print-renderer.html`
- `print-renderer-coordinate-capture.html`

### Filtering Logic

The `filterDebugData` function now:

1. **Truncates large arrays**: Shows first 10 items + count
   ```javascript
   "[Array with 1000 items - showing first 10]: [0,1,2,3,4,5,6,7,8,9]..."
   ```

2. **Truncates long strings**: Shows first 100 chars + total count
   ```javascript
   "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==... [9600 chars]"
   ```

3. **Omits buffer-like data**: Large arrays of numbers
   ```javascript
   "[Large array with 2000 numbers - omitted]"
   ```

4. **Preserves normal data**: Small objects, strings, and arrays remain unchanged

### Example Output

**Before (spam):**
```javascript
{
  "text": "テスト",
  "fontSize": 11,
  "buffer": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,244,12,242,40,39,110,91,90,229,41,0,0,0,0,73,69,78,68,174,66,96,130]
}
```

**After (clean):**
```javascript
{
  "text": "テスト",
  "fontSize": 11,
  "buffer": "[Large array with 1000 numbers - omitted]",
  "coordinates": [
    {"x": 245.5, "y": 158.2, "char": "テ"},
    {"x": 253.3, "y": 158.2, "char": "ス"},
    {"x": 261.1, "y": 158.2, "char": "ト"}
  ]
}
```

## Benefits

1. **📖 Readable logs**: Only relevant information is shown
2. **⚡ Better performance**: No more massive string concatenation
3. **🔍 Easier debugging**: Important data is preserved and visible
4. **💾 Reduced log size**: Smaller log files and better storage efficiency
5. **🚀 Faster processing**: Less I/O overhead from logging

## Implementation Details

### Filtering Parameters
- **Max array length**: 10 items (configurable)
- **Max string length**: 100 characters (configurable)
- **Buffer detection**: Arrays with >50 numbers are considered buffers

### Recursive Filtering
The function recursively processes nested objects, ensuring all levels are filtered appropriately.

### Backward Compatibility
- Normal debug logging still works as before
- Only large data structures are filtered
- Debug mode can still be enabled/disabled

## Files Modified

1. **`print-renderer.html`**
   - Added `filterDebugData()` method
   - Updated `debugLog()` to use filtering

2. **`print-renderer-coordinate-capture.html`**
   - Added `filterDebugData()` method
   - Updated `debugLog()` to use filtering

## Testing

Created and ran comprehensive tests to verify:
- ✅ Large arrays are truncated correctly
- ✅ Long strings are truncated correctly
- ✅ Buffer-like data is omitted
- ✅ Normal data is preserved
- ✅ Nested structures are filtered recursively

The debug logging system is now clean, readable, and efficient! 🎉
