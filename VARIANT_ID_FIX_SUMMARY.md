# Printrove Variant ID Mapping Fix

## Problem
The variant ID was not being properly passed from the frontend to the backend when creating orders, causing incorrect order details in the Printrove dashboard.

## Root Causes Identified

1. **Frontend Issue**: The `buildVariantMap` function was extracting variant IDs but the final payload wasn't properly structured
2. **Backend Issue**: The `printroveHelper.js` was using hardcoded fallback values instead of actual variant IDs from frontend
3. **Missing Fallback Logic**: No proper fallback when variant mapping wasn't found in product data

## Fixes Applied

### Frontend Changes (`src/Pages/TShirtDesigner.jsx`)

1. **Improved Line Items Creation**:
   ```javascript
   // OLD: Complex fallback logic with potential gaps
   // NEW: Simple, direct mapping for all sizes
   const finalPrintroveLineItems = Object.entries(finalQuantities).map(
     ([size, qty]) => {
       const canonicalSize = canonSize(size);
       const variantId = variantMap[canonicalSize];
       
       return {
         size,
         qty,
         printroveVariantId: variantId || null,
       };
     }
   );
   ```

2. **Enhanced Variant Map Building**:
   ```javascript
   // Added fallback logic for products without size-specific variants
   if (!Object.keys(map).length) {
     const directVariant = details?.printroveVariantId || 
                          details?.pricing?.[0]?.printrove_variant_id;
     if (directVariant) {
       const commonSizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
       commonSizes.forEach(size => {
         map[size] = directVariant;
       });
     }
   }
   ```

3. **Better Debugging**:
   - Added detailed logging for variant mapping results
   - Enhanced cart product debugging information

### Backend Changes (`Duco_Backend/Controller/printroveHelper.js`)

1. **Proper Variant ID Extraction**:
   ```javascript
   // Try to get variant ID from product's printrove mapping (from frontend)
   if (!printroveVariantId && p.printroveVariantsBySize) {
     printroveVariantId = p.printroveVariantsBySize[firstSize];
     
     // If not found for specific size, try any available variant
     if (!printroveVariantId) {
       const availableVariants = Object.values(p.printroveVariantsBySize).filter(Boolean);
       if (availableVariants.length > 0) {
         printroveVariantId = availableVariants[0];
       }
     }
   }
   
   // Try to get variant ID from printroveLineItems (from frontend)
   if (!printroveVariantId && p.printroveLineItems) {
     const lineItem = p.printroveLineItems.find(item => 
       item.size === firstSize || item.printroveVariantId
     );
     if (lineItem && lineItem.printroveVariantId) {
       printroveVariantId = lineItem.printroveVariantId;
     }
   }
   ```

2. **Use Actual Variant IDs Instead of Hardcoded Values**:
   ```javascript
   // OLD: Always used hardcoded values (1000, 22094474)
   // NEW: Use actual variant IDs from frontend
   orderProduct.product_id = productInfo.productId || 1000;
   orderProduct.variant_id = printroveVariantId; // Actual ID from frontend
   ```

3. **Enhanced Logging**:
   - Added detailed product mapping information
   - Better error tracking for variant ID resolution

## How It Works Now

1. **Frontend Flow**:
   - `buildVariantMap()` extracts variant IDs from product data (pricing, variant_mapping, etc.)
   - Creates `finalPrintroveLineItems` with proper variant IDs for each size
   - Stores variant mappings in `printroveVariantsBySize` and `printroveLineItems`

2. **Backend Flow**:
   - Receives order with `printroveVariantsBySize` and `printroveLineItems`
   - Extracts actual variant IDs from frontend data
   - Uses these IDs in Printrove order creation
   - Falls back to hardcoded values only if no mapping exists

3. **Data Structure**:
   ```javascript
   // Frontend sends:
   {
     printroveVariantsBySize: { "S": "12345", "M": "12346", "L": "12347" },
     printroveLineItems: [
       { size: "S", qty: 1, printroveVariantId: "12345" },
       { size: "M", qty: 2, printroveVariantId: "12346" }
     ]
   }
   
   // Backend uses these IDs in Printrove order:
   {
     order_products: [
       { variant_id: "12345", quantity: 1, is_plain: false },
       { variant_id: "12346", quantity: 2, is_plain: false }
     ]
   }
   ```

## Expected Results

1. **Correct Variant IDs**: Orders will now use actual variant IDs from product configuration
2. **Better Order Details**: Printrove dashboard will show correct product variants and sizes
3. **Proper Fallbacks**: System gracefully handles missing variant mappings
4. **Enhanced Debugging**: Better logging for troubleshooting variant mapping issues

## Testing

To verify the fix:

1. Create a product with variant mappings in the admin panel
2. Design a custom t-shirt with multiple sizes
3. Place an order and check the backend logs for variant ID usage
4. Verify the Printrove dashboard shows correct order details

## Next Steps

1. **Admin Panel Enhancement**: Consider adding size-specific variant mapping UI
2. **Product Data Migration**: Update existing products with proper variant mappings
3. **Monitoring**: Add alerts for orders with missing variant mappings