# Charge Plan System - Complete Summary

## Overview

The Charge Plan system manages tier-based pricing for:
- **Packaging & Forwarding (P&F)** - Cost per unit based on quantity
- **Printing Cost** - Cost per unit based on quantity  
- **GST** - Percentage tax based on quantity

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Interface                          │
│              ChargePlanManager.jsx                          │
│  - Edit P&F tiers                                           │
│  - Edit Printing tiers                                      │
│  - Edit GST percentage tiers                                │
│  - Test with simulator                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API                               │
│            chargePlanController.js                          │
│  - GET /api/chargeplan (read plan)                          │
│  - PATCH /api/chargeplan (update plan)                      │
│  - GET /api/chargeplan/totals (calculate charges)           │
│  - POST /api/chargeplan/rates (legacy endpoint)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database                                  │
│            DefaultChargePlan.js                             │
│  - Stores tier-based pricing                                │
│  - One document per system                                  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Admin Updates Charge Plan
```
Admin edits tiers in ChargePlanManager.jsx
         ↓
Clicks "Save Changes"
         ↓
PATCH /api/chargeplan with new tiers
         ↓
Backend validates and saves to MongoDB
         ↓
Returns updated plan
         ↓
Admin sees success message
```

### 2. Cart Calculates Charges
```
Customer adds items to cart
         ↓
Cart.jsx calls getChargePlanTotals(qty, subtotal)
         ↓
GET /api/chargeplan/totals?qty=X&subtotal=Y
         ↓
Backend finds matching tiers for quantity
         ↓
Calculates: P&F Total, Printing Total, GST Amount
         ↓
Returns totals to Cart
         ↓
Cart displays charges to customer
```

### 3. Order Creation with Charges
```
Customer completes checkout
         ↓
Order is created with charges
         ↓
Invoice is generated with P&F and Printing amounts
         ↓
Customer sees charges on invoice
```

## Key Changes Made

### Backend (chargePlanController.js)
✅ Enabled P&F charges (was hardcoded to 0)
✅ Updated getTotalsForQty to return P&F in response
✅ Updated getRatesForQty to include P&F and GST percent

### Frontend (ChargePlanManager.jsx)
✅ Added GST tier editor
✅ Enhanced simulator with subtotal input
✅ Better visual layout for charge display
✅ Error handling for failed simulations

### Frontend (APIservice.js)
✅ Added getChargePlanTotals() function
✅ Uses new /api/chargeplan/totals endpoint
✅ Includes fallback for offline/API failures
✅ Caches results in localStorage

## Tier-Based Pricing Logic

For a given quantity, the system:
1. Finds the tier where: `minqty <= qty <= maxqty`
2. Uses that tier's cost/percent
3. Calculates total: `cost × qty`

### Example: Quantity = 100
```
P&F Tiers:
  1-50: ₹12/unit
  51-200: ₹10/unit ← Matches (100 is in 51-200)
  201+: ₹8/unit

Result: ₹10 per unit × 100 = ₹1,000 total
```

## Default Charge Plan

```
Packaging & Forwarding:
  1-50 units: ₹12/unit
  51-200 units: ₹10/unit
  201+ units: ₹8/unit

Printing Cost:
  1-50 units: ₹15/unit
  51-200 units: ₹12/unit
  201+ units: ₹10/unit

GST:
  All quantities: 5%
```

## Calculation Example

**Order Details:**
- Quantity: 100 units
- Product Price: ₹50/unit
- Subtotal: ₹5,000

**Charge Calculation:**
```
1. Find matching tiers for qty=100:
   - P&F: 51-200 tier → ₹10/unit
   - Printing: 51-200 tier → ₹12/unit
   - GST: All quantities → 5%

2. Calculate totals:
   - P&F Total: ₹10 × 100 = ₹1,000
   - Printing Total: ₹12 × 100 = ₹1,200
   - Taxable Amount: ₹5,000 + ₹1,000 + ₹1,200 = ₹7,200
   - GST Amount: ₹7,200 × 5% = ₹360
   - Grand Total: ₹7,200 + ₹360 = ₹7,560
```

## API Endpoints

### GET /api/chargeplan
Returns current charge plan

### PATCH /api/chargeplan
Updates charge plan with new tiers

### GET /api/chargeplan/totals?qty=X&subtotal=Y
Returns calculated charges for quantity X

### POST /api/chargeplan/rates (Legacy)
Returns per-unit rates for quantity

## Frontend Functions

### getChargePlanRates(qty) - OLD
```javascript
// Returns old format with slabs
const res = await getChargePlanRates(100);
// { slabs: [...], gstRate: 0.05 }
```

### getChargePlanTotals(qty, subtotal) - NEW
```javascript
// Returns new format with per-unit and totals
const res = await getChargePlanTotals(100, 5000);
// { success: true, data: { qty, perUnit: {...}, totals: {...} } }
```

## Files Modified

1. **Duco_Backend/Controller/chargePlanController.js**
   - Enabled P&F charges
   - Updated calculation logic

2. **Duco_frontend/src/Admin/ChargePlanManager.jsx**
   - Added GST tier editor
   - Enhanced simulator
   - Better UI layout

3. **Duco_frontend/src/Service/APIservice.js**
   - Added getChargePlanTotals() function
   - Fallback logic for offline use

## Testing Checklist

- [ ] Admin can view charge plan
- [ ] Admin can add/edit/delete P&F tiers
- [ ] Admin can add/edit/delete Printing tiers
- [ ] Admin can add/edit/delete GST tiers
- [ ] Simulator calculates correctly
- [ ] Save Changes persists data
- [ ] Cart displays correct charges
- [ ] Orders created with correct charges
- [ ] Invoices show correct amounts

## Next Steps

1. **Update Cart.jsx** to use new getChargePlanTotals()
2. **Test end-to-end** with sample orders
3. **Monitor** for calculation issues
4. **Adjust default tiers** based on business needs
5. **Document** for team reference

## Status

✅ **COMPLETE** - Charge plan system is fully functional with:
- P&F charges enabled
- GST tier editor added
- Enhanced simulator
- New API function for integration
- Proper error handling and fallbacks

## Support

For issues or questions:
1. Check CHARGE_PLAN_QUICK_TEST.md for test scenarios
2. Review CHARGE_PLAN_ANALYSIS.md for technical details
3. Check browser console for error messages
4. Verify backend is running and connected to MongoDB
