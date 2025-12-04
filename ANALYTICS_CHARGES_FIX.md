# Analytics Dashboard - P&F and Printing Charges Fix

## Problem
P&F (Packing & Forwarding) and Printing charges were not showing in the Analytics Dashboard order details modal, even though they were visible in the Order Success page and invoices.

## Root Cause
The backend API endpoint `/api/sales` (in `analyticsController.js`) was using `.select()` to limit which fields were returned from the Order model. The select statement was missing critical fields:
- `pf` (Packing & Forwarding charges)
- `printing` (Printing charges)
- `cgst`, `sgst`, `igst`, `gst` (Tax fields)
- `products` (Product details)
- Other order details needed for the modal

## Solution

### Backend Fix (`Duco_Backend/Controller/analyticsController.js`)
Updated the `.select()` statement in the `getSalesAnalytics` function to include all necessary fields:

```javascript
// BEFORE
.select("_id createdAt user price status razorpayPaymentId address addresses currency displayPrice conversionRate")

// AFTER
.select("_id createdAt user price status razorpayPaymentId address addresses currency displayPrice conversionRate pf printing gst cgst sgst igst products orderId orderType paymentmode paymentStatus paymentMethod printroveOrderId printroveStatus printroveTrackingUrl totalPay")
```

### Frontend Fix (`Duco_frontend/src/Admin/AnalyticsDashboard.jsx`)
1. Fixed JSX syntax error by properly closing the ternary operator in the "Complete Bill Breakdown" section
2. Ensured charges are displayed correctly using `selectedOrder.pf` and `selectedOrder.printing`
3. Updated taxable amount calculation to use the correct charge fields

## Files Modified
1. `Duco_Backend/Controller/analyticsController.js` - Added missing fields to order select statement
2. `Duco_frontend/src/Admin/AnalyticsDashboard.jsx` - Fixed JSX structure and charge display logic

## Testing
After these changes:
1. Restart the backend server to apply the API changes
2. Refresh the Analytics Dashboard
3. Click on any order to view details
4. P&F and Printing charges should now be visible in the "Complete Bill Breakdown" section

## Impact
- ✅ P&F charges now display correctly
- ✅ Printing charges now display correctly
- ✅ Tax breakdown shows accurate information
- ✅ Product details are available in the modal
- ✅ All order information is complete and accurate
