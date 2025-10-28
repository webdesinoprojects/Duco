# Testing Guide: Printrove Variant ID & Location Pricing Fixes

## ⚠️ IMPORTANT: Read Before Testing

**DO NOT create real orders during testing!** Each order deducts money from the Printrove account which is non-refundable.

## What Was Fixed

### 1. Printrove Variant ID Mapping
- ✅ Enhanced logging to show variant mapping process
- ✅ Added validation before adding to cart
- ✅ Better error messages showing which sizes are missing variant IDs
- ✅ Confirmation dialogs to prevent accidental orders without proper mappings

### 2. Location-Based Pricing for Design T-Shirts
- ✅ Location pricing now applied to individual items (base + printing + design costs)
- ✅ Printing and P&F costs also get location adjustment
- ✅ GST calculated on location-adjusted amounts
- ✅ Display shows location pricing is applied

## Testing Steps

### Phase 1: Console Verification (Safe - No Orders Created)

#### Test 1: Check Product Data Structure
1. Open browser DevTools (F12)
2. Navigate to a product page
3. Open the design page for a product
4. In console, check:
   ```javascript
   // Check if product has variant mappings
   console.log("Product:", productDetails);
   console.log("Variant Mapping:", productDetails?.variant_mapping);
   console.log("Pricing:", productDetails?.pricing);
   console.log("Color Variants:", productDetails?.image_url);
   ```

**Expected Output:**
- Product should have `variant_mapping` array OR `pricing` array with `printrove_variant_id` for each size
- If missing, contact admin to add variant mappings to the product

#### Test 2: Verify Variant Map Building
1. On TShirtDesigner page, select sizes
2. Open console
3. Look for these logs:
   ```
   🔍 Product Details for Variant Mapping: {...}
   🧭 Variant Map: { S: "VAR_123", M: "VAR_456", ... }
   📦 Selected Quantities: { S: 1, M: 2, ... }
   ```

**Expected Output:**
- Variant Map should have entries for all available sizes
- Selected sizes should match sizes in variant map
- If mismatches, note which sizes are missing

#### Test 3: Test Variant Validation
1. Select sizes that DON'T have variant mappings (if any)
2. Click "Submit"
3. Check console for error logs
4. Should see confirmation dialog warning about missing variants

**Expected Behavior:**
- If NO variants mapped: Shows error with available vs selected sizes
- If SOME variants mapped: Shows warning about unmapped sizes
- If ALL variants mapped: No warnings, proceeds normally

#### Test 4: Check Cart Data
1. After adding to cart (with or without variants), check:
   ```javascript
   // In console
   const cart = JSON.parse(localStorage.getItem('cart'));
   console.log("Cart Items:", cart);
   
   // Check each item
   cart.forEach((item, i) => {
     console.log(`Item ${i}:`, {
       id: item.id,
       printroveProductId: item.printroveProductId,
       printroveVariantId: item.printroveVariantId,
       printroveVariantsBySize: item.printroveVariantsBySize,
       printroveLineItems: item.printroveLineItems,
       needsMapping: item.printroveNeedsMapping
     });
   });
   ```

**Expected Output:**
- `printroveProductId`: Should be present (string)
- `printroveVariantsBySize`: Object with size -> variant ID mappings
- `printroveLineItems`: Array with {size, qty, printroveVariantId}
- `printroveNeedsMapping`: Object showing what's missing

### Phase 2: Location Pricing Verification (Safe - No Orders Created)

#### Test 5: Check Location Pricing Application
1. Add a custom design T-shirt to cart
2. Go to cart page
3. Open console and check:
   ```javascript
   // Check pricing context
   console.log("Price Increase:", priceIncrease);
   console.log("Conversion Rate:", conversionRate);
   console.log("Currency:", currency);
   ```

**Expected Output:**
- `priceIncrease`: Should be a number (e.g., 10 for 10%)
- `conversionRate`: Should be > 0 (e.g., 1 for INR, 0.012 for USD)
- `currency`: Should be currency code (e.g., "INR", "USD")

#### Test 6: Verify Price Calculations
1. In cart, note the prices shown
2. Calculate manually:
   ```
   Base Price: ₹500
   Printing Cost (2 sides): ₹20
   Design Cost: ₹50
   Subtotal: ₹570
   
   With 10% location increase:
   Adjusted: ₹570 + (₹570 * 0.10) = ₹627
   
   With USD conversion (rate 0.012):
   Final: ₹627 * 0.012 = $7.52
   ```

3. Compare with displayed prices

**Expected Behavior:**
- Items Subtotal should include location pricing
- Printing and P&F should show adjusted prices
- GST should be calculated on adjusted amounts
- Grand Total should match manual calculation

#### Test 7: Test Different Locations
1. If possible, change location in PriceContext
2. Verify prices update accordingly
3. Check that currency symbol changes

**Expected Behavior:**
- Prices should recalculate when location changes
- Currency symbol should update
- Percentage increase should apply correctly

### Phase 3: Visual Verification (Safe - No Orders Created)

#### Test 8: Check Cart Display
1. Add multiple items to cart (regular + custom design)
2. Verify all items show:
   - Correct prices
   - Location pricing indicator (if applicable)
   - Proper currency symbols

#### Test 9: Check Order Summary
1. In cart, verify Order Summary shows:
   - Items Subtotal (with location pricing)
   - Printing cost (with location pricing)
   - P&F cost (with location pricing)
   - GST (calculated on adjusted amounts)
   - Location Adjustment indicator (if applicable)
   - Grand Total

**Expected Display:**
```
ORDER SUMMARY
Items Subtotal: ₹627
Printing (2 sides): ₹22
P&F: ₹55
GST (5%): ₹35
✓ Location Pricing Applied (Asia, INR): +10%
Total: ₹739
```

### Phase 4: Backend Payload Verification (⚠️ CAREFUL - Don't Submit!)

#### Test 10: Check Payment Payload
1. Add items to cart
2. Select address
3. Click "CHECK OUT"
4. On payment page, open DevTools Network tab
5. **DO NOT complete payment**
6. Check the payload that would be sent:
   ```javascript
   // In console on payment page
   console.log("Order Data:", orderData);
   console.log("Items:", orderData.items);
   
   // Check each item
   orderData.items.forEach(item => {
     console.log("Item:", {
       printroveProductId: item.printroveProductId,
       printroveVariantId: item.printroveVariantId,
       printroveLineItems: item.printroveLineItems,
       quantity: item.quantity
     });
   });
   ```

**Expected Output:**
- Each item should have `printroveProductId`
- Each item should have `printroveLineItems` array
- Line items should have `printroveVariantId` for each size
- Quantities should match selected sizes

## Common Issues & Solutions

### Issue 1: No Variant Map Generated
**Symptom**: Console shows empty variant map `{}`

**Solution**:
1. Check product data structure in database
2. Ensure product has one of:
   - `variant_mapping` array at product level
   - `pricing` array with `printrove_variant_id`
   - `variant_mapping` in color-specific `image_url` entry
3. Contact admin to add proper mappings

### Issue 2: Some Sizes Missing Variants
**Symptom**: Warning shows "Missing Variant IDs for sizes: XL, 2XL"

**Solution**:
1. Check which sizes are in the variant map
2. Verify product has mappings for all sizes
3. If sizes are missing, contact admin to add them
4. Don't proceed with order until all sizes are mapped

### Issue 3: Location Pricing Not Applied
**Symptom**: Prices don't change when location changes

**Solution**:
1. Check PriceContext is properly set up
2. Verify `priceIncrease` and `conversionRate` are set
3. Check console for any errors in price calculation
4. Ensure `usePriceContext()` is called in Cart component

### Issue 4: Wrong Currency Symbol
**Symptom**: Shows ₹ instead of $ for USD

**Solution**:
1. Check `currency` value in PriceContext
2. Verify `currencySymbols` object has the currency
3. Check if currency is being set from location API

## Success Criteria

✅ **Variant Mapping**:
- Console shows variant map with all sizes
- No errors when adding to cart
- Cart localStorage has `printroveVariantsBySize` and `printroveLineItems`
- Payment payload includes variant IDs for all sizes

✅ **Location Pricing**:
- Prices update when location changes
- Currency symbol matches location
- Percentage increase is applied
- GST calculated on adjusted amounts
- Grand total matches manual calculation

## Next Steps After Testing

1. **If All Tests Pass**:
   - Document which products have proper variant mappings
   - Create a list of products that need mapping
   - Share findings with team

2. **If Tests Fail**:
   - Note specific errors in console
   - Screenshot the issue
   - Share console logs with developers
   - Don't proceed with real orders

3. **Before Production**:
   - Ensure ALL products have variant mappings
   - Test with at least 3 different products
   - Verify location pricing works for all locations
   - Get approval from Divyansh or Praveen

## Contact

If you encounter issues:
- Divyansh: 9810841411
- Praveen: 9720533883

## Important Reminders

- ⚠️ **Never complete a real order during testing**
- ⚠️ **Always check console logs before proceeding**
- ⚠️ **Verify variant IDs match Printrove's actual IDs**
- ⚠️ **Get team approval before testing checkout flow**
- ⚠️ **Document all findings and share with team**
