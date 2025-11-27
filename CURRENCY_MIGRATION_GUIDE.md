# 🔄 Currency Migration Guide - Update Existing Orders

## Current Situation

The currency auto-detection feature has been implemented and is working correctly for **new orders**. However, **existing orders** in the database still have `currency: "INR"` because they were created before this feature was added.

### Example from Screenshot:
```
Order: 6927b9d4e87d6d6d5e6b0f9
Customer: Jatin Garg
Address: gergerger, 12107, europe
Price: ₹273.00  ← Shows INR instead of EUR
```

This order has:
- Country: "europe"
- Currency in DB: "INR" (default from before)
- Should be: "EUR"

## Why This Happens

1. **Old Orders**: Created before currency detection was implemented
2. **Default Value**: Order model has `currency: { type: String, default: 'INR' }`
3. **No Retroactive Update**: Existing data wasn't updated when feature was added

## Solution: Run Migration Script

A migration script has been created to update all existing orders with the correct currency based on their billing address country.

### Migration Script Location:
```
Duco_Backend/scripts/update-order-currencies.js
```

### How to Run the Migration:

#### Step 1: Navigate to Backend Directory
```bash
cd Duco_Backend
```

#### Step 2: Run the Migration Script
```bash
node scripts/update-order-currencies.js
```

### What the Script Does:

1. **Connects to MongoDB**
2. **Fetches all orders** from the database
3. **For each order:**
   - Extracts billing country from address
   - Detects correct currency using `getCurrencyFromCountry()`
   - Compares with current currency in database
   - Updates if different
4. **Displays progress** with detailed logging
5. **Shows summary** of updates

### Expected Output:

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📦 Fetching all orders...
Found 150 orders

🔄 Processing orders...

✅ Updated Order 6927b9d4e87d6d6d5e6b0f9
   Country: europe
   Old Currency: INR
   New Currency: EUR

✅ Updated Order 6927b9d4e87d6d6d5e6b0f10
   Country: United States
   Old Currency: INR
   New Currency: USD

✅ Updated Order 6927b9d4e87d6d6d5e6b0f11
   Country: UAE
   Old Currency: INR
   New Currency: AED

==================================================
📊 MIGRATION SUMMARY
==================================================
Total Orders: 150
✅ Updated: 45
⏭️  Skipped (already correct): 105
❌ Errors: 0
==================================================

🔌 Disconnected from MongoDB

✨ Migration completed successfully!
```

## After Running Migration

### Before Migration:
```
┌────────────────────────────────────────────┐
│ Customer      │ Address        │ Price    │
├────────────────────────────────────────────┤
│ Jatin (Europe)│ gergerger, EU  │ ₹273.00 │ ❌
│ John (USA)    │ New York, USA  │ ₹3834.00│ ❌
│ Ahmed (UAE)   │ Dubai, UAE     │ ₹226.00 │ ❌
└────────────────────────────────────────────┘
```

### After Migration:
```
┌────────────────────────────────────────────┐
│ Customer      │ Address        │ Price    │
├────────────────────────────────────────────┤
│ Jatin (Europe)│ gergerger, EU  │ €273.00 │ ✅
│               │                │ (EUR)    │
├────────────────────────────────────────────┤
│ John (USA)    │ New York, USA  │ $3834.00│ ✅
│               │                │ (USD)    │
├────────────────────────────────────────────┤
│ Ahmed (UAE)   │ Dubai, UAE     │ د.إ226.00│ ✅
│               │                │ (AED)    │
└────────────────────────────────────────────┘
```

## Safety Features

### 1. **Read-Only First**
The script only reads and updates, never deletes

### 2. **Detailed Logging**
Shows exactly what's being changed for each order

### 3. **Error Handling**
Continues processing even if one order fails

### 4. **Idempotent**
Safe to run multiple times - skips already correct orders

### 5. **No Data Loss**
Only updates the `currency` field, all other data remains unchanged

## Verification

After running the migration, verify the changes:

### 1. Check Sales Dashboard
```
http://localhost:5173/admin/sales
```

Look for orders with international addresses - they should now show correct currency symbols.

### 2. Check Database Directly (Optional)
```javascript
// In MongoDB shell or Compass
db.orders.find({ 
  "addresses.billing.country": "europe" 
}).forEach(order => {
  print(`Order ${order._id}: Currency = ${order.currency}`);
});
```

Expected output:
```
Order 6927b9d4e87d6d6d5e6b0f9: Currency = EUR
```

## Future Orders

**New orders created after the currency detection feature** will automatically have the correct currency set based on the billing address country. No migration needed for future orders.

## Rollback (If Needed)

If you need to rollback all orders to INR:

```javascript
// In MongoDB shell
db.orders.updateMany(
  {},
  { $set: { currency: "INR" } }
);
```

## Country-Currency Mapping

The migration uses the same mapping as the order creation:

| Country/Region | Currency |
|----------------|----------|
| India | INR |
| United States, USA | USD |
| United Kingdom, UK | GBP |
| Europe, Germany, France, Spain, Italy, Netherlands, Belgium, Austria, Portugal, Greece, Ireland | EUR |
| UAE, Dubai, United Arab Emirates | AED |
| Australia | AUD |
| Canada | CAD |
| Singapore | SGD |
| New Zealand | NZD |
| Switzerland | CHF |
| Japan | JPY |
| China | CNY |
| Hong Kong | HKD |
| Malaysia | MYR |
| Thailand | THB |
| Saudi Arabia | SAR |
| Qatar | QAR |
| Kuwait | KWD |
| Bahrain | BHD |
| Oman | OMR |
| South Africa | ZAR |
| Pakistan | PKR |
| Sri Lanka | LKR |
| Bangladesh | BDT |
| Nepal | NPR |
| Philippines | PHP |
| Indonesia | IDR |
| South Korea, Korea | KRW |

## Troubleshooting

### Issue: "Cannot find module '../DataBase/Models/OrderModel'"
**Solution:** Make sure you're running from the `Duco_Backend` directory

### Issue: "MONGO_URI is not defined"
**Solution:** Check your `.env` file has `MONGO_URI` or `MONGODB_URI` set

### Issue: "Connection timeout"
**Solution:** Check your MongoDB connection string and network access

### Issue: "Some orders not updated"
**Solution:** Check the error messages in the output - the script will show which orders failed and why

## Summary

1. ✅ **Currency detection is working** for new orders
2. ❌ **Existing orders need migration** to update their currency
3. 🔄 **Run the migration script** to fix existing orders
4. ✅ **After migration**, all orders will show correct currency

**To fix the issue in the screenshot, run:**
```bash
cd Duco_Backend
node scripts/update-order-currencies.js
```

This will update all existing orders to have the correct currency based on their billing address country!
