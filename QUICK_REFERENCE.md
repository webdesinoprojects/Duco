# Quick Reference - Printrove Fixes

## Console Commands for Testing

### Check Product Variant Mappings
```javascript
// On product/design page
console.log("Product:", productDetails);
console.log("Variant Map:", productDetails?.variant_mapping);
console.log("Pricing:", productDetails?.pricing);
```

### Check Cart Data
```javascript
// On any page
const cart = JSON.parse(localStorage.getItem('cart'));
console.log("Cart:", cart);
cart.forEach(item => console.log({
  id: item.id,
  printroveProductId: item.printroveProductId,
  printroveVariantsBySize: item.printroveVariantsBySize,
  printroveLineItems: item.printroveLineItems
}));
```

### Check Location Pricing
```javascript
// On cart page
console.log("Price Increase:", priceIncrease);
console.log("Conversion Rate:", conversionRate);
console.log("Currency:", currency);
```

## Expected Console Logs

### When Designing T-Shirt
```
🔍 Product Details for Variant Mapping: {...}
🧭 Variant Map: { S: "VAR_123", M: "VAR_456", ... }
📦 Selected Quantities: { S: 1, M: 2, ... }
✅ Product has valid Printrove mappings: {...}
```

### When Adding to Cart
```
🧾 FINAL PRODUCT BEFORE ADDING TO CART: {
  printroveProductId: "PRD_123",
  printroveVariantsBySize: { S: "VAR_S", M: "VAR_M" },
  lineItems: [{size: "S", qty: 1, printroveVariantId: "VAR_S"}]
}
```

## Warning Messages

### Missing Product ID
```
⚠️ Printrove Product ID is missing!
This product cannot be synced with Printrove without a Product ID.
```
**Action**: Contact admin to add Printrove Product ID

### Missing Variant IDs
```
⚠️ No Printrove Variant IDs found!
Selected sizes: S, M, L
Available mappings: S, M
```
**Action**: Contact admin to add variant mappings for missing sizes

### Partial Mapping
```
⚠️ Missing Printrove Variant IDs for sizes: XL, 2XL
Mapped sizes: S, M, L
```
**Action**: Either remove unmapped sizes or contact admin

## Files to Check

### Frontend
- `Duco_frontend/src/Pages/TShirtDesigner.jsx` - Variant mapping logic
- `Duco_frontend/src/Pages/Cart.jsx` - Location pricing logic
- `Duco_frontend/src/ContextAPI/CartContext.jsx` - Cart state management
- `Duco_frontend/src/ContextAPI/PriceContext.jsx` - Location pricing state

### Backend (if needed)
- `Duco_Backend/Controller/printroveHelper.js` - Printrove API integration
- `Duco_Backend/Service/PrintroveSyncService.js` - Variant sync logic

## Common Fixes

### Product Missing Variant Mappings
**Database Update Needed:**
```javascript
{
  "variant_mapping": [
    { "size": "S", "printrove_variant_id": "VAR_S_123" },
    { "size": "M", "printrove_variant_id": "VAR_M_123" },
    { "size": "L", "printrove_variant_id": "VAR_L_123" }
  ]
}
```

### Location Pricing Not Working
**Check PriceContext:**
1. Verify `setLocation()` is called
2. Check `priceIncrease` and `currency` are set
3. Ensure `conversionRate` is fetched from API

## Testing Checklist

- [ ] Product has variant mappings in database
- [ ] Console shows variant map with all sizes
- [ ] No errors when adding to cart
- [ ] Cart localStorage has Printrove IDs
- [ ] Location pricing applied to items
- [ ] Currency symbol matches location
- [ ] Grand total calculation is correct
- [ ] Payment payload includes variant IDs

## Emergency Contacts

- Divyansh: 9810841411
- Praveen: 9720533883

## Important Reminders

⚠️ **NEVER create real orders during testing**
⚠️ **Always check console before proceeding**
⚠️ **Verify variant IDs match Printrove's actual IDs**
⚠️ **Get team approval before production**
