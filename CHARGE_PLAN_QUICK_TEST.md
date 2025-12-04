# Charge Plan - Quick Test Guide

## Test Scenario 1: Basic Charge Calculation

**Setup:**
- Quantity: 100 units
- Subtotal: ₹5,000

**Expected Results:**
- P&F per-unit: ₹10 (matches 51-200 tier)
- P&F Total: ₹1,000 (10 × 100)
- Printing per-unit: ₹12 (matches 51-200 tier)
- Printing Total: ₹1,200 (12 × 100)
- Taxable Amount: ₹7,200 (5000 + 1000 + 1200)
- GST (5%): ₹360 (7200 × 5%)
- Grand Total: ₹7,560

**How to Test:**
1. Go to Admin → Charge Plan Manager
2. Scroll to "Quick Simulator"
3. Enter Quantity: 100
4. Enter Subtotal: 5000
5. Click "Compute Totals"
6. Verify all values match expected results

---

## Test Scenario 2: Small Order (1-50 units)

**Setup:**
- Quantity: 25 units
- Subtotal: ₹1,000

**Expected Results:**
- P&F per-unit: ₹12 (matches 1-50 tier)
- P&F Total: ₹300 (12 × 25)
- Printing per-unit: ₹15 (matches 1-50 tier)
- Printing Total: ₹375 (15 × 25)
- Taxable Amount: ₹1,675 (1000 + 300 + 375)
- GST (5%): ₹83.75 (1675 × 5%)
- Grand Total: ₹1,758.75

**How to Test:**
1. Go to Admin → Charge Plan Manager
2. Scroll to "Quick Simulator"
3. Enter Quantity: 25
4. Enter Subtotal: 1000
5. Click "Compute Totals"
6. Verify all values match expected results

---

## Test Scenario 3: Large Order (201+ units)

**Setup:**
- Quantity: 500 units
- Subtotal: ₹10,000

**Expected Results:**
- P&F per-unit: ₹8 (matches 201+ tier)
- P&F Total: ₹4,000 (8 × 500)
- Printing per-unit: ₹10 (matches 201+ tier)
- Printing Total: ₹5,000 (10 × 500)
- Taxable Amount: ₹19,000 (10000 + 4000 + 5000)
- GST (5%): ₹950 (19000 × 5%)
- Grand Total: ₹19,950

**How to Test:**
1. Go to Admin → Charge Plan Manager
2. Scroll to "Quick Simulator"
3. Enter Quantity: 500
4. Enter Subtotal: 10000
5. Click "Compute Totals"
6. Verify all values match expected results

---

## Test Scenario 4: Edit Charge Plan

**Steps:**
1. Go to Admin → Charge Plan Manager
2. In "Packaging & Forwarding (Draft)" section:
   - Click "Add Tier" to add a new tier
   - Set Min Qty: 1000, Max Qty: 5000, Cost: 5
   - Click "Sort" to organize
3. Click "Save Changes"
4. Verify success message appears
5. Click "Refresh from Server"
6. Verify new tier appears in "Saved on server" section

---

## Test Scenario 5: Edit GST Rate

**Steps:**
1. Go to Admin → Charge Plan Manager
2. Scroll to "GST Rate (%) (Draft)" section
3. Edit the existing GST tier:
   - Change percent from 5 to 8
4. Click "Save Changes"
5. Verify success message appears
6. Test simulator with new GST rate:
   - Quantity: 100, Subtotal: 5000
   - GST should now be 8% instead of 5%
   - Expected GST: ₹480 (6000 × 8%)

---

## Test Scenario 6: Cart Integration

**Steps:**
1. Add items to cart
2. Go to checkout
3. Verify charges are displayed:
   - P&F Charges
   - Printing Charges
   - GST
4. Verify total matches expected calculation
5. Complete order
6. Verify invoice shows correct charges

---

## Test Scenario 7: Order Creation with Charges

**Steps:**
1. Create a new order with 100 units
2. Go to Admin → Manage Orders
3. Click "🧾 Invoice" on the order
4. Verify invoice shows:
   - P&F Charges: ₹1,000
   - Printing Charges: ₹1,200
   - GST: ₹360 (or 8% if changed)
   - Grand Total: Correct sum

---

## API Testing (Using Postman/cURL)

### Test GET /api/chargeplan
```bash
curl -X GET "http://localhost:3000/api/chargeplan"
```

Expected: Returns current charge plan with all tiers

### Test GET /api/chargeplan/totals
```bash
curl -X GET "http://localhost:3000/api/chargeplan/totals?qty=100&subtotal=5000"
```

Expected: Returns calculated totals for qty=100

### Test PATCH /api/chargeplan
```bash
curl -X PATCH "http://localhost:3000/api/chargeplan" \
  -H "Content-Type: application/json" \
  -d '{
    "pakageingandforwarding": [
      {"minqty": 1, "maxqty": 50, "cost": 12},
      {"minqty": 51, "maxqty": 200, "cost": 10},
      {"minqty": 201, "maxqty": 1000000000, "cost": 8}
    ],
    "printingcost": [
      {"minqty": 1, "maxqty": 50, "cost": 15},
      {"minqty": 51, "maxqty": 200, "cost": 12},
      {"minqty": 201, "maxqty": 1000000000, "cost": 10}
    ],
    "gst": [
      {"minqty": 1, "maxqty": 1000000000, "percent": 5}
    ]
  }'
```

Expected: Returns updated charge plan

---

## Troubleshooting

### Issue: Simulator shows "Failed to simulate"
**Solution:**
1. Check browser console (F12 → Console tab)
2. Look for error message
3. Verify backend is running on port 3000
4. Try refreshing the page
5. Check that quantity is >= 1

### Issue: Charges not showing in Cart
**Solution:**
1. Verify charge plan has been saved
2. Clear browser cache (Ctrl+Shift+Delete)
3. Refresh cart page
4. Check browser console for API errors
5. Verify Cart.jsx is using new `getChargePlanTotals()` function

### Issue: GST calculation is wrong
**Solution:**
1. Verify GST tier is set for the quantity range
2. Check that GST percent is correct (e.g., 5 for 5%)
3. Verify taxable amount includes P&F and Printing
4. Test with simulator to verify calculation

### Issue: Tiers overlap error
**Solution:**
1. Ensure each tier's Max Qty < next tier's Min Qty
2. Example:
   - Tier 1: 1-50
   - Tier 2: 51-200 (NOT 50-200)
   - Tier 3: 201-1000000000
3. Click "Sort" to auto-organize tiers

---

## Success Indicators

✅ Simulator shows correct calculations
✅ Admin can save charge plan changes
✅ Cart displays correct charges
✅ Orders are created with correct charges
✅ Invoices show correct P&F and Printing amounts
✅ GST is calculated correctly
✅ No errors in browser console
✅ No errors in backend logs

---

## Next Steps After Testing

1. Update Cart.jsx to use new `getChargePlanTotals()` function
2. Update Order Creation to use new charge plan format
3. Monitor production for any issues
4. Gather feedback from admin users
5. Adjust default tiers based on business requirements
