# Printrove Variant ID & Location Pricing Fix

## Issues Identified

### 1. Printrove Variant ID Not Displaying in Payload
**Problem**: When ordering a custom design T-shirt from the frontend, the `printroveVariantId` is missing or not properly mapped to each size in the cart payload.

**Root Cause**:
- The `buildVariantMap()` function in `TShirtDesigner.jsx` tries to extract variant IDs from multiple sources, but the product data structure might not contain the mappings
- The variant IDs are stored at the product level but not properly passed to the cart with size-specific mappings
- The fallback logic assigns a single variant ID to all sizes, which is incorrect for products with multiple size variants

### 2. Location-Based Pricing Not Applied to Design T-Shirts
**Problem**: Location-based pricing (currency conversion + percentage increase) works for regular products but not for custom design T-shirts in the cart.

**Root Cause**:
- The `Cart.jsx` calculates `itemsSubtotal` using `item.price` directly
- For custom design T-shirts, the printing cost and design cost are added, but the location-based pricing is only applied at the grand total level
- The individual item prices don't reflect the location adjustment before being displayed

## Solutions

### Fix 1: Ensure Variant IDs are Properly Mapped in Product Data

**Backend**: Ensure all products have proper `variant_mapping` or `pricing` array with `printrove_variant_id` for each size.

**Example Product Structure**:
```json
{
  "_id": "product123",
  "products_name": "Custom T-Shirt",
  "printrove_product_id": "PRD123",
  "variant_mapping": [
    { "size": "S", "printrove_variant_id": "VAR_S_123" },
    { "size": "M", "printrove_variant_id": "VAR_M_123" },
    { "size": "L", "printrove_variant_id": "VAR_L_123" },
    { "size": "XL", "printrove_variant_id": "VAR_XL_123" },
    { "size": "2XL", "printrove_variant_id": "VAR_2XL_123" },
    { "size": "3XL", "printrove_variant_id": "VAR_3XL_123" }
  ],
  "image_url": [
    {
      "colorcode": "#FFFFFF",
      "variant_mapping": [
        { "size": "S", "printrove_variant_id": "VAR_S_WHITE_123" },
        { "size": "M", "printrove_variant_id": "VAR_M_WHITE_123" }
      ]
    }
  ]
}
```

### Fix 2: Enhanced Variant Mapping in TShirtDesigner.jsx

The current `buildVariantMap()` function is comprehensive, but we need to add better logging and validation.

**Add to TShirtDesigner.jsx** (after line 680):

```javascript
// Enhanced logging for variant mapping
console.log("🔍 Product Details for Variant Mapping:", {
  productId: productDetails?._id,
  printroveProductId: extractPrintroveProductId(productDetails),
  color: colorWithHash,
  availableVariantSources: {
    hasVariantMapping: !!productDetails?.variant_mapping,
    hasPricing: !!productDetails?.pricing,
    hasColorVariants: !!productDetails?.image_url?.find(e => e.colorcode === colorWithHash)?.variant_mapping,
  }
});

const variantMap = buildVariantMap(productDetails);
console.log("🗺️ Built Variant Map:", variantMap);

// Validate that all selected sizes have variant IDs
const selectedSizes = Object.keys(finalQuantities);
const missingVariants = selectedSizes.filter(size => !variantMap[canonSize(size)]);

if (missingVariants.length > 0) {
  console.error("❌ Missing Variant IDs for sizes:", missingVariants);
  console.log("📋 Available variant map:", variantMap);
  console.log("📦 Product details:", productDetails);
}
```

### Fix 3: Location-Based Pricing for Design T-Shirts in Cart

**Update Cart.jsx** to apply location pricing to individual items:

```javascript
// Add this helper function after the imports
const applyLocationPricing = (basePrice, priceIncrease, conversionRate) => {
  let price = safeNum(basePrice);
  
  // Apply percentage increase
  if (priceIncrease) {
    price += (price * safeNum(priceIncrease)) / 100;
  }
  
  // Apply currency conversion
  if (conversionRate && conversionRate !== 1) {
    price *= conversionRate;
  }
  
  return Math.round(price);
};

// Update the itemsSubtotal calculation (around line 180)
const itemsSubtotal = useMemo(() => {
  return actualData.reduce((sum, item) => {
    const qty = Object.values(item.quantity || {}).reduce(
      (a, q) => a + safeNum(q),
      0
    );
    const basePrice = safeNum(item.price);
    const printingCost = calculatePrintingCost(item);
    const designCost = calculateDesignCost(item);
    
    // Calculate total price per item
    const itemTotal = basePrice + printingCost + designCost;
    
    // Apply location pricing to each item
    const adjustedPrice = applyLocationPricing(itemTotal, priceIncrease, conversionRate);
    
    return sum + (adjustedPrice * qty);
  }, 0);
}, [actualData, priceIncrease, conversionRate]);
```

### Fix 4: Add Validation Before Adding to Cart

**Update TShirtDesigner.jsx** `saveSelectedViews()` function (around line 750):

```javascript
// Before adding to cart, validate Printrove IDs
if (!printroveProductId) {
  console.error("❌ Missing Printrove Product ID");
  const proceed = confirm(
    "⚠️ Printrove Product ID is missing!\n\n" +
    "This product cannot be synced with Printrove without a Product ID.\n" +
    "Do you want to add it to cart anyway? (You'll need to map it before checkout)"
  );
  if (!proceed) return;
}

if (printroveLineItems.length === 0) {
  console.error("❌ No variant IDs mapped for any size");
  const proceed = confirm(
    "⚠️ No Printrove Variant IDs found!\n\n" +
    "Selected sizes: " + Object.keys(finalQuantities).join(", ") + "\n" +
    "Available mappings: " + Object.keys(variantMap).join(", ") + "\n\n" +
    "This order cannot be placed with Printrove without variant IDs.\n" +
    "Do you want to add it to cart anyway? (You'll need to map variants before checkout)"
  );
  if (!proceed) return;
}
```

### Fix 5: Display Variant IDs in Cart for Debugging

**Update CartItem.jsx** to show Printrove IDs:

```javascript
// Add this section to display Printrove info (for debugging)
{process.env.NODE_ENV === 'development' && (
  <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
    <p className="text-yellow-400">🔍 Debug Info:</p>
    <p>Product ID: {item.printroveProductId || 'Missing'}</p>
    <p>Variant ID: {item.printroveVariantId || 'Missing'}</p>
    {item.printroveVariantsBySize && (
      <div>
        <p>Variants by Size:</p>
        <ul className="ml-4">
          {Object.entries(item.printroveVariantsBySize).map(([size, vid]) => (
            <li key={size}>{size}: {vid}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}
```

## Testing Checklist

### Before Testing (Important!)
- ⚠️ **DO NOT create real orders** - each order deducts money from Printrove account
- Use console.log extensively to verify data
- Test with products that have proper variant mappings first

### Test Steps

1. **Verify Product Data**:
   ```javascript
   // In browser console on product page
   console.log("Product Details:", productDetails);
   console.log("Variant Mapping:", productDetails?.variant_mapping);
   console.log("Pricing:", productDetails?.pricing);
   ```

2. **Test Variant Mapping**:
   - Select a product with known variant IDs
   - Choose multiple sizes
   - Check console for "Built Variant Map"
   - Verify all selected sizes have variant IDs

3. **Test Cart Addition**:
   - Add custom design T-shirt to cart
   - Check localStorage: `JSON.parse(localStorage.getItem('cart'))`
   - Verify `printroveProductId` and `printroveVariantsBySize` are present

4. **Test Location Pricing**:
   - Change location (if possible) or modify `priceIncrease` in context
   - Verify prices update in cart
   - Check that design costs are included

5. **Test Checkout Flow** (Console Only):
   - Go to payment page
   - Check the payload being sent
   - **DO NOT complete the order** unless approved by team

## Files Modified

### Frontend
- `Duco_frontend/src/Pages/TShirtDesigner.jsx` - Enhanced variant mapping and validation
- `Duco_frontend/src/Pages/Cart.jsx` - Location pricing for design T-shirts
- `Duco_frontend/src/Components/CartItem.jsx` - Debug display for Printrove IDs

### Backend (if needed)
- Ensure products have proper `variant_mapping` in database
- Update product creation/update endpoints to require variant mappings

## Contact

If issues persist:
- Divyansh: 9810841411
- Praveen: 9720533883

## Notes

- Always check console logs before creating orders
- Variant IDs must match Printrove's actual variant IDs
- Location pricing is applied at cart level, not product level
- Custom design costs (printing, text, images) are added separately
