# Complete System Logic Study - Part 5: Database Schema

## MongoDB Collections

### 1. Orders Collection

**Schema (OrderModel.js):**
```javascript
{
  orderId: String (unique, auto-generated: "ducoart2025/26/01"),
  
  products: [Mixed] // Array of product objects with design data
  
  price: Number, // Subtotal
  totalPay: Number, // Final total with tax
  currency: String (default: 'INR'),
  
  address: {
    fullName: String,
    email: String,
    mobileNumber: String,
    houseNumber: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String (default: 'India'),
    landmark: String,
    addressType: Enum ['Home', 'Office', 'Other']
  },
  
  user: ObjectId (ref: 'User'),
  
  orderType: Enum ['B2B', 'B2C'] (default: 'B2C'),
  
  deliveryExpectedDate: Date (default: +7 days),
  
  status: Enum ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
  
  razorpayPaymentId: String,
  
  paymentStatus: Enum ['Pending', 'Paid', 'Failed', 'Refunded'],
  
  paymentmode: Enum [
    'online', 'Online Payment',
    'netbanking', 'Paid via Netbanking',
    'store_pickup', 'Pay on Store',
    'manual_payment', 'Manual Payment',
    '50%', 'COD', 'Prepaid'
  ],
  
  // Printrove Integration
  printroveOrderId: String,
  printroveStatus: Enum [
    'Pending', 'Processing', 'Received', 'Dispatched',
    'Delivered', 'Cancelled', 'Error', 'success',
    'Corporate Order - No Printrove', 'N/A'
  ],
  printroveItems: Array,
  printroveTrackingUrl: String,
  printroveReceivedDate: Date,
  printroveDispatchDate: Date,
  printroveShippedDate: Date,
  printroveDeliveredDate: Date,
  printroveEstimatedDelivery: Date,
  
  // Charges
  pf: Number (default: 0),
  gst: Number (default: 0),
  cgst: Number (default: 0),
  sgst: Number (default: 0),
  igst: Number (default: 0),
  printing: Number (default: 0),
  
  timestamps: true // createdAt, updatedAt
}
```

**Indexes:**
```javascript
OrderSchema.index({ createdAt: -1 })
OrderSchema.index({ user: 1, createdAt: -1 })
OrderSchema.index({ orderId: 1 })
OrderSchema.index({ printroveOrderId: 1 })
```

**Auto-generated Order ID:**
```javascript
// Format: ducoart{year}/{last2digits}/{sequential}
// Example: ducoart2025/26/01, ducoart2025/26/02, etc.

OrderSchema.pre('save', async function(next) {
  if (this.orderId) return next()
  
  const today = new Date()
  const yyyy = today.getFullYear()
  const yy = String(yyyy).slice(-2)
  
  // Count orders today
  const todayOrderCount = await Order.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay }
  })
  
  const sequentialNumber = String(todayOrderCount + 1).padStart(2, '0')
  
  this.orderId = `ducoart${yyyy}/${yy}/${sequentialNumber}`
  
  next()
})
```



### 2. Products Collection

**Schema (ProductsModel.js):**
```javascript
{
  products_name: String (required),
  
  image_url: [
    {
      url: [String] (required), // Multiple image URLs
      color: String (required),
      colorcode: String (required),
      videolink: String,
      content: [
        {
          minstock: Number (default: 1),
          size: String (required)
        }
      ],
      designtshirt: [String] // Design template images
    }
  ],
  
  pricing: [
    {
      quantity: Number (required), // Bulk pricing tiers
      price_per: Number (required),
      discount: Number (default: 0, min: 0, max: 100)
    }
  ],
  
  Stock: Number (required, default: 0, min: 0), // Auto-calculated
  
  Desciptions: [String] (required),
  
  gender: String (required, default: 'Male'),
  
  subcategory: ObjectId (ref: 'Subcategory', required),
  
  // B2B/B2C Segregation
  isCorporate: Boolean (default: false), // false = B2C, true = B2B
  
  // Printrove Integration
  printroveProductId: Number,
  printroveVariantId: Number,
  
  timestamps: true
}
```

**Auto-calculate Stock:**
```javascript
productSchema.pre('save', function(next) {
  let total = 0
  this.image_url.forEach(imageItem => {
    imageItem.content.forEach(contentItem => {
      total += contentItem.minstock || 0
    })
  })
  this.Stock = total
  next()
})
```

### 3. PrintroveMapping Collection

**Schema (PrintroveMappingModel.js):**
```javascript
{
  // Duco Product Reference
  ducoProductId: ObjectId (ref: 'Product', required, unique),
  
  // Printrove Product Info
  printroveProductId: Number (required),
  printroveProductName: String (required),
  
  // Variant Mappings
  variants: [
    {
      // Duco variant info
      ducoColor: String,
      ducoSize: String,
      
      // Printrove variant info
      printroveVariantId: Number (required),
      printroveVariantName: String,
      printroveSku: String,
      
      // Pricing
      printrovePrice: Number,
      
      // Availability
      isAvailable: Boolean (default: true)
    }
  ],
  
  // Design Upload Mappings
  designMappings: [
    {
      designType: Enum ['front', 'back', 'left', 'right'] (required),
      printroveDesignId: Number,
      printroveDesignName: String,
      uploadUrl: String
    }
  ],
  
  // Sync Information
  lastSynced: Date (default: Date.now),
  syncStatus: Enum ['active', 'inactive', 'error'] (default: 'active'),
  
  // Metadata
  notes: String,
  isActive: Boolean (default: true),
  
  timestamps: true
}
```

**Indexes:**
```javascript
printroveMappingSchema.index({ ducoProductId: 1 })
printroveMappingSchema.index({ printroveProductId: 1 })
printroveMappingSchema.index({ 'variants.printroveVariantId': 1 })
```



### 4. Users Collection

**Schema (UserModel.js):**
```javascript
{
  name: String (required),
  email: String (required, unique),
  phone: String,
  password: String, // Hashed with bcrypt
  
  isVerified: Boolean (default: false),
  
  address: [
    {
      fullName: String,
      mobileNumber: String,
      houseNumber: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String (default: 'India'),
      landmark: String,
      addressType: Enum ['Home', 'Office', 'Other']
    }
  ],
  
  timestamps: true
}
```

### 5. Design Collection

**Schema (DesignModel.js):**
```javascript
{
  user: ObjectId (ref: 'User', required),
  products: ObjectId (ref: 'Product'),
  cutomerprodcuts: String, // Custom product ID
  
  design: {
    front: Mixed, // Front design data
    back: Mixed, // Back design data
    left: Mixed,
    right: Mixed,
    uploadedLogo: String, // Base64 or URL
    extraFiles: [Mixed]
  },
  
  timestamps: true
}
```

### 6. Invoice Collection

**Schema (InvoiceModule.js):**
```javascript
{
  invoiceNumber: String (required, unique),
  invoiceDate: Date (required),
  
  company: {
    name: String,
    address: String,
    gstin: String,
    pan: String,
    email: String,
    phone: String,
    logo: String
  },
  
  billTo: {
    name: String (required),
    address: String (required),
    gstin: String,
    state: String,
    country: String
  },
  
  items: [
    {
      description: String (required),
      hsn: String,
      quantity: Number (required),
      unit: String,
      price: Number (required),
      amount: Number (required)
    }
  ],
  
  charges: {
    pf: Number (default: 0),
    printing: Number (default: 0)
  },
  
  tax: {
    type: Enum ['INTRASTATE', 'INTERSTATE', 'INTERNATIONAL'],
    cgst: Number (default: 0),
    sgst: Number (default: 0),
    igst: Number (default: 0),
    total: Number (required)
  },
  
  totals: {
    subtotal: Number (required),
    taxableAmount: Number (required),
    grandTotal: Number (required),
    roundOff: Number (default: 0),
    finalTotal: Number (required)
  },
  
  terms: String,
  
  order: ObjectId (ref: 'Order'),
  
  timestamps: true
}
```

### 7. Category & Subcategory Collections

**Category Schema:**
```javascript
{
  name: String (required),
  description: String,
  image: String,
  isActive: Boolean (default: true),
  timestamps: true
}
```

**Subcategory Schema:**
```javascript
{
  name: String (required),
  description: String,
  category: ObjectId (ref: 'Category', required),
  image: String,
  isActive: Boolean (default: true),
  timestamps: true
}
```

### 8. EmployeesAcc Collection

**Schema (EmployessAcc.js):**
```javascript
{
  employeeid: String (required, unique),
  name: String (required),
  email: String (required, unique),
  password: String (required), // Hashed with bcrypt
  role: Enum ['admin', 'manager', 'employee'] (default: 'employee'),
  permissions: [String],
  isActive: Boolean (default: true),
  timestamps: true
}
```

### 9. Wallet Collection

**Schema (Wallet.js):**
```javascript
{
  user: ObjectId (ref: 'User', required),
  order: ObjectId (ref: 'Order', required),
  amount: Number (required),
  paymentType: String, // '50%', 'full', etc.
  status: Enum ['pending', 'paid', 'refunded'] (default: 'pending'),
  transactionDate: Date (default: Date.now),
  timestamps: true
}
```

### 10. OTP Collection

**Schema (OtpModel.js):**
```javascript
{
  email: String (required),
  otp: String (required),
  createdAt: Date (default: Date.now, expires: 300) // TTL: 5 minutes
}
```

