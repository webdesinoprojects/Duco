# International Orders - Developer Guide

## Overview
The system now fully supports international orders with proper tax calculation, address formatting, and Printrove integration.

## How to Test

### Option 1: Run the Test Script
```bash
cd Duco_Backend
node test_international_order.js
```

This will test both international and domestic order flows.

### Option 2: Manual Testing via Frontend

#### Test International Order:
1. Go to Cart page
2. Add items to cart
3. In Address Manager, enter an international address:
   - Full Name: John Doe
   - Mobile: 1234567890
   - House Number: 123
   - Street: Main Street
   - City: New York
   - State: New York
   - Pincode: 10001
   - **Country: United States** (or any non-India country)
   - Landmark: Near Central Park

4. Proceed to checkout
5. Verify:
   - Tax shows as "TAX (1%)" instead of "GST (5%)"
   - Total is calculated with 1% tax
   - Payment can be completed
   - Order is created successfully
   - Printrove receives the order with correct country

#### Test Domestic Order:
1. Follow same steps but use Indian address:
   - Country: India
   - State: Chhattisgarh (or any Indian state)
   - Pincode: 492001 (6 digits)

2. Verify:
   - Tax shows as "GST (5%)"
   - For same state: CGST 2.5% + SGST 2.5%
   - For different state: IGST 5%
   - Order processes normally

## Key Differences: International vs Domestic

| Feature | Domestic (India) | International |
|---------|-----------------|---------------|
| Tax Type | GST (5%) | TAX (1%) |
| Tax Breakdown | CGST+SGST or IGST | Simple TAX |
| Pincode Format | Integer (6 digits) | String (any format) |
| Required Fields | Standard | State & City mandatory |
| Country Detection | India, IN, IND, Bharat | Any other country |

## API Payload Examples

### International Order Payload to Printrove:
```json
{
  "reference_number": "pay_abc123",
  "retail_price": 1575,
  "customer": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "number": 1234567890,
    "address1": "123 Main Street",
    "address2": "Near Central Park",
    "address3": "",
    "pincode": "10001",
    "state": "New York",
    "city": "New York",
    "country": "United States"
  },
  "cod": false,
  "order_products": [...]
}
```

### Domestic Order Payload to Printrove:
```json
{
  "reference_number": "pay_xyz789",
  "retail_price": 1575,
  "customer": {
    "name": "Raj Kumar",
    "email": "raj.kumar@example.com",
    "number": 9876543210,
    "address1": "456 MG Road",
    "address2": "Near City Mall",
    "address3": "",
    "pincode": 492001,
    "state": "Chhattisgarh",
    "city": "Raipur",
    "country": "India"
  },
  "cod": false,
  "order_products": [...]
}
```

## Debugging

### Enable Debug Logs
The system already has comprehensive logging. Check console for:

**Frontend (Browser Console):**
- `🌍 Tax Calculation Debug` - Shows country detection and tax calculation
- `🌍 Payment request` - Shows if order is detected as international
- `💰 Grand Total Calculation` - Shows pricing breakdown

**Backend (Server Console):**
- `🌍 Order type: INTERNATIONAL` or `DOMESTIC` - Shows order type detection
- `📦 Creating Printrove order` - Shows full payload sent to Printrove
- `✅ Printrove order created successfully` - Confirms order creation

### Common Issues and Solutions

#### Issue: International order showing 5% GST instead of 1% TAX
**Solution**: Check that country field is not empty and is not 'India' or variations

#### Issue: Printrove API error for international order
**Solution**: 
- Verify state and city are provided (mandatory for international)
- Check pincode is string format, not integer
- Verify country name is correct

#### Issue: Order created but not sent to Printrove
**Solution**: Check Printrove credentials in `.env` file

## Environment Variables

Ensure these are set in `Duco_Backend/.env`:
```env
PRINTROVE_BASE_URL=https://api.printrove.com/api
PRINTROVE_CLIENT_ID=your_client_id
PRINTROVE_CLIENT_SECRET=your_client_secret
```

## Tax Calculation Logic

The system uses `TaxCalculationService.js` which automatically determines tax based on:

1. **Check if in India**: 
   - Country contains 'India', 'Bharat', 'IN', 'IND'
   - If yes → Apply GST (5%)
   - If no → Apply TAX (1%)

2. **For GST (India only)**:
   - Same state as company (Chhattisgarh): CGST 2.5% + SGST 2.5%
   - Different state: IGST 5%

3. **For International**:
   - Simple 1% TAX
   - No GST breakdown

## Invoice Generation

Invoices are automatically generated with correct tax information:
- International invoices show "TAX (1%)"
- Domestic invoices show "GST (5%)" with breakdown
- All calculations are done by `invoiceService.js` using `TaxCalculationService.js`

## Support for Multiple Currencies

Currently, the system uses INR for all transactions. To add multi-currency support:

1. Update `PaymentButton.jsx` to pass currency code
2. Update `CreateOrder.js` to handle different currencies
3. Update Razorpay configuration for international payments
4. Update invoice generation to show correct currency

## Printrove API Compliance

The fix ensures compliance with Printrove API requirements:
- ✅ Pincode: Integer for India, String for international
- ✅ State: Mandatory for international orders
- ✅ City: Mandatory for international orders
- ✅ Country: Actual country name (not defaulted to 'India')

## Files to Monitor

If you make changes to order processing, check these files:
1. `Duco_Backend/Service/PrintroveIntegrationService.js` - Main integration
2. `Duco_Backend/Controller/printroveHelper.js` - Legacy fallback
3. `Duco_Backend/Service/TaxCalculationService.js` - Tax calculation
4. `Duco_frontend/src/Components/PaymentButton.jsx` - Payment initiation
5. `Duco_frontend/src/Pages/Cart.jsx` - Tax display

## Future Enhancements

Potential improvements for international orders:
1. Multi-currency support (USD, EUR, GBP, etc.)
2. International shipping cost calculation
3. Customs declaration support
4. Country-specific tax rules
5. Address validation for international addresses
6. International phone number validation

## Contact

For issues or questions about international orders:
- Check logs in browser console and server console
- Run test script: `node test_international_order.js`
- Review `INTERNATIONAL_ORDERS_FIX.md` for technical details
