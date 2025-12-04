# Charge Plan System - Complete Analysis & Implementation Guide

## Current System Overview

### Architecture
The charge plan system has three main components:

1. **Frontend (ChargePlanManager.jsx)**
   - Allows admin to create/edit tier-based pricing for:
     - Packaging & Forwarding (P&F)
     - Printing Cost
     - GST (as percentage)
   - Each tier has: minqty, maxqty, cost (or percent for GST)
   - Includes simulator to test charges for a given quantity

2. **Backend (chargePlanController.js)**
   - Stores charge plans in MongoDB (DefaultChargePlan model)
   - Provides endpoints:
     - `GET /api/chargeplan` - Get current plan
     - `PATCH /api/chargeplan` - Update plan
     - `GET /api/chargeplan/totals?qty=X` - Calculate totals for quantity
     - `POST /api/chargeplan/rates` - Get per-unit rates (legacy)

3. **Database (DefaultChargePlan.js)**
   - Stores tiers for P&F, Printing, and GST
   - GST uses `percent` field (not cost)
   - P&F and Printing use `cost` field (per unit)

### Current Issues

1. **Packaging & Forwarding is DISABLED**
   - In `chargePlanController.js`, P&F is hardcoded to 0 for testing
   - Lines with TODO comments show this is temporary

2. **Frontend doesn't show GST tier editor**
   - ChargePlanManager.jsx only shows P&F and Printing tiers
   - GST tier editor is missing from the UI

3. **Simulator doesn't work properly**
   - The simulator section exists but may not be fully integrated
   - Needs to show all three charges (P&F, Printing, GST)

4. **Integration with Cart/Orders**
   - Cart.jsx fetches from `/api/chargeplan/rates` endpoint
   - But the endpoint returns old format (not the new totals format)
   - Needs to be updated to use new `/api/chargeplan/totals` endpoint

## How Charges Should Work

### Tier-Based Pricing
For a given quantity, find the matching tier:
- If qty >= minqty AND qty <= maxqty, use that tier's cost/percent
- Example: qty=75 matches tier with minqty=51, maxqty=200

### Calculation Flow
1. **Get quantity from order**
2. **Find matching tier for each charge type**
3. **Calculate totals:**
   - P&F Total = P&F per-unit × qty
   - Printing Total = Printing per-unit × qty
   - Taxable Amount = Subtotal + P&F Total + Printing Total
   - GST Amount = Taxable Amount × GST%
   - Grand Total = Taxable Amount + GST Amount

### Current Default Plan
```
P&F:
  1-50 units: ₹12/unit
  51-200 units: ₹10/unit
  201+ units: ₹8/unit

Printing:
  1-50 units: ₹15/unit
  51-200 units: ₹12/unit
  201+ units: ₹10/unit

GST:
  All quantities: 5%
```

## Files to Fix

### 1. Backend - Enable P&F Charges
**File:** `Duco_Backend/Controller/chargePlanController.js`
- Remove the hardcoded `packaging = 0` line
- Uncomment the actual P&F calculation
- Update `getTotalsForQty` to include P&F in response

### 2. Frontend - Add GST Tier Editor
**File:** `Duco_frontend/src/Admin/ChargePlanManager.jsx`
- Add GST tier table editor (similar to P&F and Printing)
- Show GST as percentage (not cost)
- Add GST to the simulator output

### 3. Frontend - Fix Simulator
**File:** `Duco_frontend/src/Admin/ChargePlanManager.jsx`
- Ensure simulator calls correct endpoint
- Display all three charges in output
- Show per-unit rates and totals

### 4. Frontend - Update Cart Integration
**File:** `Duco_frontend/src/Pages/Cart.jsx`
- Change from `/api/chargeplan/rates` to `/api/chargeplan/totals`
- Update how charges are extracted from response
- Ensure printing calculation matches new format

## Implementation Steps

1. ✅ Enable P&F in backend controller
2. ✅ Add GST tier editor to frontend
3. ✅ Fix simulator to show all charges
4. ✅ Update Cart to use new endpoint
5. ✅ Test end-to-end with sample orders

## Testing Checklist

- [ ] Admin can edit P&F tiers
- [ ] Admin can edit Printing tiers
- [ ] Admin can edit GST percentage
- [ ] Simulator shows correct totals for qty=50, 100, 200
- [ ] Cart displays correct charges
- [ ] Orders are created with correct charges
- [ ] Invoices show correct P&F and Printing amounts
