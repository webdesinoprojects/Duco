# Billing & Shipping Address Implementation Guide

## Overview

The system now supports separate billing and shipping addresses with a "Same as Billing" checkbox for convenience. This implementation is backward compatible with existing orders that use a single address.

## Features

✅ Separate billing and shipping addresses
✅ "Same as Billing" checkbox for convenience
✅ Visual distinction (billing = yellow, shipping = green)
✅ Backward compatible with legacy single-address orders
✅ Works with invoices and shipping labels
✅ Printrove integration uses shipping address
✅ Tab-based UI (Saved Addresses / Add New)

## Frontend Implementation

### New Component: AddressManagerEnhanced.jsx

**Location:** `Duco_frontend/src/Components/AddressManagerEnhanced.jsx`

**Props:**
```javascript
{
  billingAddress,      // Selected billing address
  setBillingAddress,   // Function to set billing address
  shippingAddress,     // Selected shipping address
  setShippingAddress,  // Function to set shipping address
  user,                // User object with saved addresses
  setUser              // Function to update user
}
```

**Usage Example:**
```jsx
import AddressManagerEnhanced from '../Components/AddressManagerEnhanced';

function Cart() {
  const [billingAddress, setBillingAddress] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [user, setUser] = useState(null);

  return (
    <AddressManagerEnhanced
      billingAddress={billingAddress}
      setBillingAddress={setBillingAddress}
      shippingAddress={shippingAddress}
      setShippingAddress={setShippingAddress}
      user={user}
      setUser={setUser}
    />
  );
}
```

### UI Features

**1. Tab Navigation:**
- "Saved Addresses" - Select from existing addresses
- "Add New Address" - Create a new address

**2. Billing Address Section:**
- Yellow border for selected address
- Checkmark indicator
- Shows all saved addresses

**3. Same as Billing Checkbox:**
- Automatically syncs shipping with billing
- Hides shipping address selection when checked
- Unchecking reveals shipping address section

**4. Shipping Address Section:**
- Green border for selected address
- Only visible when "Same as Billing" is unchecked
- Independent selection from billing

**5. Add New Address Form:**
- All required fields marked with *
- Email field (optional)
- Address type selector (Home/Office/Other)
- Validation before submission



## Backend Implementation

### Database Schema Updates

**OrderModel.js** now supports both formats:

```javascript
// New format (separate billing/shipping)
addresses: {
  billing: AddressSchema,
  shipping: AddressSchema,
  sameAsBilling: Boolean
}

// Legacy format (single address)
address: AddressSchema
```

### Address Helper Utilities

**Location:** `Duco_Backend/utils/addressHelper.js`

**Functions:**

1. **getBillingAddress(order)** - Get billing address (supports both formats)
2. **getShippingAddress(order)** - Get shipping address (supports both formats)
3. **isSameAsBilling(order)** - Check if addresses are same
4. **formatAddress(address)** - Format address for display
5. **formatAddressMultiline(address)** - Format for invoice/label
6. **normalizeOrderAddresses(orderData)** - Convert legacy to new format
7. **getPrintroveAddress(order)** - Get address for Printrove (always shipping)

**Usage Example:**
```javascript
const { getShippingAddress, getBillingAddress } = require('../utils/addressHelper');

// Get addresses from order
const billingAddr = getBillingAddress(order);
const shippingAddr = getShippingAddress(order);

// Format for display
const formatted = formatAddress(shippingAddr);
// Output: "123, Main Street, Landmark, City, State - 110001, India"

// Format for invoice
const multiline = formatAddressMultiline(billingAddr);
// Output:
// John Doe
// 123, Main Street
// Near Park
// City, State - 110001
// India
// Phone: 9876543210
// Email: john@example.com
```

### Order Creation

**completeOrderController.js** handles both formats:

```javascript
// Frontend sends either:
// 1. New format
orderData.addresses = {
  billing: { fullName, email, ... },
  shipping: { fullName, email, ... },
  sameAsBilling: true/false
}

// 2. Legacy format
orderData.address = { fullName, email, ... }

// Backend automatically handles both
```

### Printrove Integration

**PrintroveIntegrationService.js** always uses shipping address:

```javascript
async createOrder(orderData) {
  // Get shipping address (works with both formats)
  const shippingAddress = getShippingAddress(orderData);
  
  // Use shipping address for Printrove
  const printroveOrder = {
    customer: {
      name: shippingAddress.fullName,
      email: shippingAddress.email,
      address1: `${shippingAddress.houseNumber} ${shippingAddress.street}`,
      // ... rest of shipping address
    }
  };
}
```

## Invoice Generation

Invoices use **billing address** for "Bill To" section:

```javascript
const { getBillingAddress } = require('../utils/addressHelper');

const billingAddr = getBillingAddress(order);

const invoice = {
  billTo: {
    name: billingAddr.fullName,
    address: formatAddressMultiline(billingAddr),
    state: billingAddr.state,
    country: billingAddr.country
  }
};
```

## Shipping Labels

Shipping labels use **shipping address**:

```javascript
const { getShippingAddress } = require('../utils/addressHelper');

const shippingAddr = getShippingAddress(order);

const label = {
  shipTo: {
    name: shippingAddr.fullName,
    address: formatAddressMultiline(shippingAddr),
    phone: shippingAddr.mobileNumber
  }
};
```

## Migration Strategy

### Backward Compatibility

**Existing orders (single address):**
- Continue to work without changes
- Helper functions automatically handle legacy format
- Single address used for both billing and shipping

**New orders (separate addresses):**
- Use new `addresses` field
- Support "Same as Billing" checkbox
- Independent billing and shipping addresses

### No Database Migration Required

The system automatically handles both formats:

```javascript
// Old order
{
  address: { fullName: "John", ... }
}

// New order
{
  addresses: {
    billing: { fullName: "John", ... },
    shipping: { fullName: "Jane", ... },
    sameAsBilling: false
  }
}

// Both work seamlessly!
```

## Testing

### Test Scenarios

**1. Same as Billing (Checked):**
```javascript
// Frontend sends
{
  addresses: {
    billing: { fullName: "John Doe", city: "Mumbai", ... },
    shipping: { fullName: "John Doe", city: "Mumbai", ... },
    sameAsBilling: true
  }
}

// Result: Both addresses identical
```

**2. Different Addresses:**
```javascript
// Frontend sends
{
  addresses: {
    billing: { fullName: "John Doe", city: "Mumbai", ... },
    shipping: { fullName: "Jane Doe", city: "Delhi", ... },
    sameAsBilling: false
  }
}

// Result: 
// - Invoice uses Mumbai address (billing)
// - Printrove ships to Delhi address (shipping)
```

**3. Legacy Order:**
```javascript
// Old format
{
  address: { fullName: "John Doe", city: "Mumbai", ... }
}

// Result: Works perfectly, address used for both
```

## Admin Panel Updates

### Order Details View

Display both addresses when different:

```jsx
{!isSameAsBilling(order) && (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <h4>Billing Address</h4>
      <p>{formatAddress(getBillingAddress(order))}</p>
    </div>
    <div>
      <h4>Shipping Address</h4>
      <p>{formatAddress(getShippingAddress(order))}</p>
    </div>
  </div>
)}
```

### Invoice Generation

```javascript
const billingAddr = getBillingAddress(order);
const shippingAddr = getShippingAddress(order);

// Show both on invoice if different
if (!isSameAsBilling(order)) {
  invoice.billTo = formatAddressMultiline(billingAddr);
  invoice.shipTo = formatAddressMultiline(shippingAddr);
} else {
  invoice.billTo = formatAddressMultiline(billingAddr);
  // No separate ship to section
}
```

## API Changes

### Order Creation Endpoint

**POST /api/complete-order**

**Request Body (New Format):**
```json
{
  "paymentId": "pay_abc123",
  "paymentmode": "online",
  "orderData": {
    "items": [...],
    "totalPay": 1500,
    "user": "user_id",
    "addresses": {
      "billing": {
        "fullName": "John Doe",
        "email": "john@example.com",
        "mobileNumber": "9876543210",
        "houseNumber": "123",
        "street": "Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "country": "India",
        "landmark": "Near Park",
        "addressType": "Home"
      },
      "shipping": {
        "fullName": "Jane Doe",
        "email": "jane@example.com",
        "mobileNumber": "9876543211",
        "houseNumber": "456",
        "street": "Park Avenue",
        "city": "Delhi",
        "state": "Delhi",
        "pincode": "110001",
        "country": "India",
        "landmark": "Near Mall",
        "addressType": "Office"
      },
      "sameAsBilling": false
    }
  }
}
```

**Request Body (Legacy Format - Still Supported):**
```json
{
  "paymentId": "pay_abc123",
  "paymentmode": "online",
  "orderData": {
    "items": [...],
    "totalPay": 1500,
    "user": "user_id",
    "address": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "mobileNumber": "9876543210",
      "houseNumber": "123",
      "street": "Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "landmark": "Near Park",
      "addressType": "Home"
    }
  }
}
```

## Benefits

1. **Flexibility** - Customers can ship to different address than billing
2. **Corporate Orders** - Office billing, home shipping
3. **Gifts** - Bill to buyer, ship to recipient
4. **Backward Compatible** - No breaking changes
5. **Clear UI** - Visual distinction between address types
6. **Convenience** - "Same as Billing" checkbox for quick checkout
7. **Accurate Invoicing** - Correct billing address on invoices
8. **Proper Shipping** - Correct shipping address to Printrove

## Troubleshooting

### Issue: Shipping address not syncing with billing

**Solution:** Check that `sameAsBilling` state is properly managed:
```javascript
useEffect(() => {
  if (sameAsBilling && billingAddress) {
    setShippingAddress(billingAddress);
  }
}, [sameAsBilling, billingAddress]);
```

### Issue: Legacy orders not displaying addresses

**Solution:** Use helper functions:
```javascript
const { getBillingAddress } = require('../utils/addressHelper');
const address = getBillingAddress(order); // Works for both formats
```

### Issue: Printrove receiving wrong address

**Solution:** Ensure using shipping address:
```javascript
const shippingAddr = getShippingAddress(orderData);
// Use shippingAddr for Printrove, not billing
```

## Summary

This implementation provides a robust, user-friendly way to handle separate billing and shipping addresses while maintaining full backward compatibility with existing orders. The system automatically detects and handles both old and new address formats seamlessly.

