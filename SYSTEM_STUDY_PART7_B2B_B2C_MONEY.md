# Complete System Logic Study - Part 7: B2B/B2C & Money Exchange

## B2B vs B2C Order System

### Overview
The system has a sophisticated dual-order system that handles both retail (B2C) and corporate/bulk (B2B) orders with different pricing, tax, and fulfillment logic.

### Order Type Detection

**Product Level:**
```javascript
// ProductsModel.js
{
  isCorporate: Boolean (default: false)
  // false = B2C (retail)
  // true = B2B (corporate/bulk)
}
```

**Order Level:**
```javascript
// OrderModel.js
{
  orderType: Enum ['B2B', 'B2C'] (default: 'B2C')
}
```

**Detection Logic:**
```javascript
// completeOrderController.js
const isCorporateOrder = orderData.items.some(item => item.isCorporate === true)
const orderType = isCorporateOrder ? 'B2B' : 'B2C'
```

### B2C (Business-to-Consumer) Orders

**Characteristics:**
- Regular retail customers
- Individual/small quantity orders
- Standard pricing from product catalog
- ALL B2C orders sent to Printrove for fulfillment
- Includes custom designer t-shirts
- Tax: 5% GST (India) or 1% TAX (International)

**Fulfillment Flow:**
```javascript
if (orderType === 'B2C') {
  // 1. Create order in database
  order = await Order.create({ ...orderData, orderType: 'B2C' })
  
  // 2. Send to Printrove
  printData = await createPrintroveOrder(order)
  order.printroveOrderId = printData.order.id
  order.printroveStatus = printData.order.status
  
  // 3. Printrove handles production and shipping
  // 4. Track via Printrove API
}
```



### B2B (Business-to-Business) Orders

**Characteristics:**
- Corporate/bulk orders
- Minimum order quantity requirement (default: 100 units)
- Bulk discount tiers
- NEVER sent to Printrove
- Managed internally by Duco
- Custom GST rate (default: 18%)
- Multiple payment options including 50% advance

**Corporate Settings (CorporateSettings.js):**
```javascript
{
  minOrderQuantity: 100, // Minimum units for corporate order
  
  bulkDiscountTiers: [
    { minQty: 100, maxQty: 499, discount: 5 },    // 5% off
    { minQty: 500, maxQty: 999, discount: 10 },   // 10% off
    { minQty: 1000, maxQty: 9999, discount: 15 }, // 15% off
    { minQty: 10000, maxQty: 999999, discount: 20 } // 20% off
  ],
  
  corporateGstRate: 18, // 18% GST for B2B
  
  enablePrintroveIntegration: false, // B2B orders don't use Printrove
  
  corporatePaymentMethods: [
    'online',
    'netbanking',
    '50%',           // 50% advance payment
    'manual_payment'
  ]
}
```

**Discount Calculation:**
```javascript
// corporateSettingsController.js
async function getDiscountForQuantity(quantity) {
  const settings = await CorporateSettings.getSingletonSettings()
  
  // Check minimum order quantity
  if (quantity < settings.minOrderQuantity) {
    return {
      discount: 0,
      meetsMinimum: false,
      minimumRequired: settings.minOrderQuantity,
      message: `Minimum order quantity is ${settings.minOrderQuantity}`
    }
  }
  
  // Find applicable discount tier
  const tier = settings.bulkDiscountTiers.find(
    t => quantity >= t.minQty && quantity <= t.maxQty
  )
  
  return {
    discount: tier ? tier.discount : 0,
    meetsMinimum: true,
    tier: tier
  }
}
```

**Fulfillment Flow:**
```javascript
if (orderType === 'B2B') {
  // 1. Create order in database
  order = await Order.create({ ...orderData, orderType: 'B2B' })
  
  // 2. Mark as corporate (NO Printrove)
  order.printroveStatus = 'Corporate Order - No Printrove'
  await order.save()
  
  // 3. Duco handles production internally
  // 4. Admin manages fulfillment manually
}
```



## Charge Plan System (Pricing Tiers)

### Overview
The system uses quantity-based pricing tiers for packaging, printing, and GST calculations.

### Charge Plan Model (DefaultChargePlan.js)

```javascript
{
  pakageingandforwarding: [
    { minqty: 1, maxqty: 50, cost: 12 },      // ₹12 per unit
    { minqty: 51, maxqty: 200, cost: 10 },    // ₹10 per unit
    { minqty: 201, maxqty: 1000000000, cost: 8 } // ₹8 per unit
  ],
  
  printingcost: [
    { minqty: 1, maxqty: 50, cost: 15 },      // ₹15 per unit
    { minqty: 51, maxqty: 200, cost: 12 },    // ₹12 per unit
    { minqty: 201, maxqty: 1000000000, cost: 10 } // ₹10 per unit
  ],
  
  gst: [
    { minqty: 1, maxqty: 1000000000, percent: 5 } // 5% GST
  ]
}
```

### Charge Calculation Logic

**Find Tier for Quantity:**
```javascript
function findTierValue(tiers, qty, label) {
  const tier = tiers.find(t => qty >= t.minqty && qty <= t.maxqty)
  
  if (!tier) {
    throw new Error(`No matching ${label} tier for qty=${qty}`)
  }
  
  // Return percent for GST, cost for others
  return tier.percent != null ? tier.percent : tier.cost
}
```

**Calculate Order Totals:**
```javascript
// chargePlanController.js
async function getTotalsForQty(qty, subtotal) {
  const plan = await getOrCreateSinglePlan()
  
  // Get per-unit costs based on quantity
  const packaging = findTierValue(plan.pakageingandforwarding, qty, 'P&F')
  const printing = findTierValue(plan.printingcost, qty, 'printing')
  const gstPercent = findTierValue(plan.gst, qty, 'gst')
  
  // Calculate totals
  const pfTotal = packaging * qty
  const printTotal = printing * qty
  const taxableAmount = subtotal + pfTotal + printTotal
  const gstAmount = (taxableAmount * gstPercent) / 100
  const grandTotal = taxableAmount + gstAmount
  
  return {
    qty,
    perUnit: {
      pakageingandforwarding: packaging,
      printingcost: printing
    },
    totals: {
      pakageingandforwarding: pfTotal,
      printingcost: printTotal,
      gstPercent,
      gstAmount,
      subtotal,
      grandTotal
    }
  }
}
```

**Example Calculation:**
```
Quantity: 150 units
Subtotal: ₹50,000

1. Find tiers:
   - P&F: 51-200 range → ₹10/unit
   - Printing: 51-200 range → ₹12/unit
   - GST: 5%

2. Calculate:
   - P&F Total: 150 × ₹10 = ₹1,500
   - Printing Total: 150 × ₹12 = ₹1,800
   - Taxable Amount: ₹50,000 + ₹1,500 + ₹1,800 = ₹53,300
   - GST (5%): ₹53,300 × 0.05 = ₹2,665
   - Grand Total: ₹53,300 + ₹2,665 = ₹55,965
```



## Wallet System (50% Advance Payment)

### Overview
The wallet system handles partial payments, primarily for 50% advance payment option.

### Wallet Model (Wallet.js)

```javascript
{
  user: ObjectId (ref: 'User', unique),
  balance: Number (default: 0, min: 0),
  
  transactions: [
    {
      order: ObjectId (ref: 'Order'),
      amount: Number (required), // Negative = debit, Positive = credit
      type: Enum ['50%', '100%'],
      createdAt: Date (default: Date.now)
    }
  ]
}
```

### Wallet Transaction Logic

**Create Transaction (50% Payment):**
```javascript
// walletController.js
async function createTransaction(userId, orderId, amount, type) {
  // Calculate balance (50% of total)
  const balance = amount / 2
  
  // Validate transaction type
  const allowedTypes = ['50%', '100%', 'MISC']
  if (!allowedTypes.includes(type)) {
    throw new Error(`Invalid transaction type: ${type}`)
  }
  
  // Find or create wallet
  let wallet = await Wallet.findOne({ user: userId })
  if (!wallet) {
    wallet = new Wallet({
      user: userId,
      balance: balance,
      transactions: []
    })
  }
  
  // Record transaction (negative = debit from balance)
  wallet.transactions.push({
    order: orderId,
    amount: -balance, // Debit the 50% from wallet
    type
  })
  
  await wallet.save()
  return true
}
```

**50% Payment Flow:**
```javascript
// completeOrderController.js
if (paymentmode === '50%') {
  // 1. Create order
  order = await Order.create({
    products: items,
    price: totalPay,
    user,
    razorpayPaymentId: paymentId,
    status: 'Pending',
    paymentmode: '50% Advance Payment'
  })
  
  // 2. Create wallet transaction
  await createTransaction(user, order._id, totalPay, '50%')
  
  // 3. Send to Printrove (if B2C)
  await handlePrintroveRouting(order, isCorporateOrder)
  
  // 4. Generate invoice
  await createInvoice(invoicePayload)
  
  // Remaining 50% to be paid on delivery
}
```

**Get Wallet Balance:**
```javascript
async function getWallet(userId) {
  const wallet = await Wallet.findOne({ user: userId })
    .populate('transactions.order')
  
  if (!wallet) {
    return { balance: 0, transactions: [] }
  }
  
  return wallet
}
```



## Money Exchange & Currency System

### Money Model (MoneyModel.js)

```javascript
{
  location: String (required, unique, trim),
  aliases: [String], // Alternative names for location
  price_increase: Number (required, min: 0), // Additional charge
  
  currency: {
    country: String (required),
    toconvert: Number (required) // Conversion rate
  },
  
  time_stamp: Date (default: Date.now)
}
```

### Currency Conversion Logic

**Purpose:**
- Handle international orders with different currencies
- Apply location-based price increases
- Convert prices for different markets

**Example Data:**
```javascript
{
  location: "United States",
  aliases: ["USA", "US", "America"],
  price_increase: 50, // ₹50 additional charge
  currency: {
    country: "United States",
    toconvert: 83.5 // 1 USD = ₹83.5
  }
}
```

**Usage in Order Processing:**
```javascript
// When creating international order
const location = order.address.country
const moneyData = await PriceSchema.findOne({
  $or: [
    { location: location },
    { aliases: location }
  ]
})

if (moneyData) {
  // Apply price increase
  const additionalCharge = moneyData.price_increase
  
  // Convert currency if needed
  const conversionRate = moneyData.currency.toconvert
  const priceInLocalCurrency = (priceInINR / conversionRate)
  
  // Update order pricing
  order.price += additionalCharge
}
```

## Bank Details System

### Bank Details Model (BankDetails.js)

```javascript
{
  bankdetails: {
    bankname: String (required),
    accountnumber: String (required),
    ifsccode: String (required),
    branch: String (required)
  },
  
  upidetails: {
    upiid: String (required),
    upiname: String (required)
  },
  
  isactive: Boolean (default: false)
}
```

### Usage

**Purpose:**
- Store company bank account details
- Display on invoices
- Provide payment information to customers
- Support multiple bank accounts (only one active at a time)

**Admin Management:**
```javascript
// Create bank details
POST /api/bank-details
{
  bankdetails: {
    bankname: "State Bank of India",
    accountnumber: "1234567890",
    ifsccode: "SBIN0001234",
    branch: "Raipur Main Branch"
  },
  upidetails: {
    upiid: "ducoart@sbi",
    upiname: "DUCO ART PRIVATE LIMITED"
  },
  isactive: true
}

// Get active bank details
GET /api/bank-details
// Returns all bank details, filter by isactive: true

// Update bank details
PUT /api/bank-details/:id
{
  isactive: true // Activate this account
}

// Delete bank details
DELETE /api/bank-details/:id
```

**Display on Invoice:**
```javascript
// invoiceService.js
const activeBankDetails = await BankDetails.findOne({ isactive: true })

if (activeBankDetails) {
  invoice.paymentDetails = {
    bankName: activeBankDetails.bankdetails.bankname,
    accountNumber: activeBankDetails.bankdetails.accountnumber,
    ifscCode: activeBankDetails.bankdetails.ifsccode,
    branch: activeBankDetails.bankdetails.branch,
    upiId: activeBankDetails.upidetails.upiid,
    upiName: activeBankDetails.upidetails.upiname
  }
}
```



## Invoice System (Complete Billing Logic)

### Invoice Model (InvoiceModule.js)

```javascript
{
  invoiceNumber: String (required, unique),
  invoiceDate: Date (required),
  
  company: {
    name: String,
    address: String,
    gstin: String,
    cin: String,
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
      hsn: String, // HSN code for GST
      quantity: Number (required),
      unit: String,
      price: Number (required),
      amount: Number (required) // qty × price
    }
  ],
  
  charges: {
    pf: Number (default: 0),
    printing: Number (default: 0)
  },
  
  tax: {
    type: Enum ['INTRASTATE', 'INTERSTATE', 'INTERNATIONAL'],
    cgstRate: Number,
    sgstRate: Number,
    igstRate: Number,
    taxRate: Number, // For international
    cgstAmount: Number,
    sgstAmount: Number,
    igstAmount: Number,
    totalTax: Number (required),
    label: String // Display label
  },
  
  totals: {
    subtotal: Number (required),
    taxableAmount: Number (required),
    grandTotal: Number (required),
    roundOff: Number (default: 0),
    finalTotal: Number (required)
  },
  
  currency: String (default: 'INR'),
  
  terms: String,
  order: ObjectId (ref: 'Order')
}
```

### Invoice Generation Logic

**Create Invoice:**
```javascript
// invoiceService.js
async function createInvoice(data) {
  // 1. Validate required fields
  if (!data.company?.name) throw new Error('company.name required')
  if (!data.invoice?.number) throw new Error('invoice.number required')
  if (!data.billTo?.name) throw new Error('billTo.name required')
  if (!data.items?.length) throw new Error('items[] required')
  
  // 2. Calculate tax dynamically
  const { calculateTax } = require('../Service/TaxCalculationService')
  
  const customerState = data.invoice?.placeOfSupply || data.billTo?.state
  const customerCountry = data.billTo?.country || 'India'
  
  // Calculate taxable amount
  const subtotal = data.items.reduce((sum, item) => 
    sum + (item.price * item.qty), 0
  )
  const chargesTotal = (data.charges?.pf || 0) + (data.charges?.printing || 0)
  const taxableAmount = subtotal + chargesTotal
  
  // Get tax info
  const taxInfo = calculateTax(taxableAmount, customerState, customerCountry)
  
  data.tax = {
    type: taxInfo.type,
    cgstRate: taxInfo.cgstRate,
    sgstRate: taxInfo.sgstRate,
    igstRate: taxInfo.igstRate,
    taxRate: taxInfo.taxRate,
    cgstAmount: taxInfo.cgstAmount,
    sgstAmount: taxInfo.sgstAmount,
    igstAmount: taxInfo.igstAmount,
    totalTax: taxInfo.totalTax,
    label: taxInfo.label
  }
  
  // 3. Determine currency
  const countryCurrencyMap = {
    'india': 'INR',
    'united states': 'USD',
    'united kingdom': 'GBP',
    'uae': 'AED',
    // ... more mappings
  }
  data.currency = countryCurrencyMap[customerCountry.toLowerCase()] || 'INR'
  
  // 4. Create invoice
  const invoice = await Invoice.create(data)
  
  // 5. Compute totals
  const totals = computeTotals(invoice.toObject())
  
  return { invoice, totals }
}
```

**Compute Totals:**
```javascript
function computeTotals(invoiceDoc) {
  const items = invoiceDoc.items || []
  const charges = invoiceDoc.charges || {}
  const tax = invoiceDoc.tax || {}
  
  // Subtotal from items
  const subtotal = items.reduce((sum, item) => 
    sum + (item.price * item.qty), 0
  )
  
  // Charges total
  const chargesTotal = (charges.pf || 0) + (charges.printing || 0)
  
  // Taxable amount
  const taxableValue = subtotal + chargesTotal
  
  // Tax amounts
  const cgstAmt = (taxableValue * (tax.cgstRate || 0)) / 100
  const sgstAmt = (taxableValue * (tax.sgstRate || 0)) / 100
  const igstAmt = (taxableValue * (tax.igstRate || 0)) / 100
  const taxAmt = (taxableValue * (tax.taxRate || 0)) / 100
  
  // Total tax (GST or international TAX)
  const totalTaxAmt = tax.type === 'INTERNATIONAL' 
    ? taxAmt 
    : (cgstAmt + sgstAmt + igstAmt)
  
  // Grand total
  const grandTotal = taxableValue + totalTaxAmt
  
  return {
    subtotal: +subtotal.toFixed(2),
    chargesTotal: +chargesTotal.toFixed(2),
    taxableValue: +taxableValue.toFixed(2),
    cgstAmt: +cgstAmt.toFixed(2),
    sgstAmt: +sgstAmt.toFixed(2),
    igstAmt: +igstAmt.toFixed(2),
    taxAmt: +taxAmt.toFixed(2),
    totalTaxAmt: +totalTaxAmt.toFixed(2),
    grandTotal: +grandTotal.toFixed(2),
    totalQty: items.reduce((q, i) => q + (i.qty || 0), 0)
  }
}
```

### Invoice Display Examples

**Domestic Invoice (Same State):**
```
DUCO ART PRIVATE LIMITED
Invoice #: INV-2025-001
Date: 01-01-2025

Bill To: ABC Company
Address: Raipur, Chhattisgarh

Items:
1. T-Shirt (White, L) × 100 @ ₹500 = ₹50,000

Charges:
- Packaging & Forwarding: ₹1,000
- Printing Charges: ₹1,500

Taxable Amount: ₹52,500
CGST @ 2.5%: ₹1,312.50
SGST @ 2.5%: ₹1,312.50
Total Tax: ₹2,625

Grand Total: ₹55,125
```

**International Invoice:**
```
DUCO ART PRIVATE LIMITED
Invoice #: INV-2025-002
Date: 01-01-2025

Bill To: XYZ Corp
Address: New York, United States

Items:
1. T-Shirt (Black, M) × 50 @ $6 = $300

Charges:
- Packaging & Forwarding: $12
- Printing Charges: $18

Taxable Amount: $330
TAX @ 1%: $3.30

Grand Total: $333.30
Currency: USD
```

