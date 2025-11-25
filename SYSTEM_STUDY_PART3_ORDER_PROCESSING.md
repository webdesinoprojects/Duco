# Complete System Logic Study - Part 3: Order Processing

## Order Flow Architecture

### Complete Order Lifecycle

```
User Cart → Payment → Order Creation → Printrove → Tracking → Delivery
```

### 1. Order Creation Flow

**Frontend (PaymentButton.jsx):**
```javascript
handlePayment() {
  // 1. Detect country
  country = address.country || 'India'
  isInternational = country !== 'India'
  
  // 2. Create Razorpay order
  razorpayOrder = await createRazorpayOrder({
    amount: totalAmount,
    currency: 'INR'
  })
  
  // 3. Open Razorpay checkout
  razorpay.open({
    key: RAZORPAY_KEY,
    amount: razorpayOrder.amount,
    order_id: razorpayOrder.id,
    handler: (response) => {
      // 4. On success, navigate to processing
      navigate('/order-processing', {
        paymentId: response.razorpay_payment_id,
        orderData: { items, address, user, totalPay }
      })
    }
  })
}
```

**Frontend (OrderProcessing.jsx):**
```javascript
async processOrder() {
  // 1. Compress order data (if large)
  compressed = LZString.compressToBase64(JSON.stringify(orderData))
  
  // 2. Send to backend
  response = await axios.post('/api/complete-order', {
    paymentId,
    orderData: compressed,
    compressed: true,
    paymentmode: 'online'
  })
  
  // 3. Handle response
  if (response.status === 200) {
    // Success - navigate to success page
    navigate('/order-success', { orderId: response.data.order._id })
  } else if (response.status === 202) {
    // Still processing - retry after 2 seconds
    await sleep(2000)
    retry() // Max 10 retries
  } else {
    // Error - show error message
    showError(response.data.message)
  }
}
```



### 2. Backend Order Processing

**completeOrderController.js:**
```javascript
async completeOrder(req, res) {
  const { paymentId, orderData, paymentmode, compressed } = req.body
  
  // 1. DUPLICATE PREVENTION
  const cacheKey = `${paymentId}_${paymentmode}`
  if (processingCache.has(cacheKey)) {
    // Check if order already exists
    existingOrder = await Order.findOne({ razorpayPaymentId: paymentId })
    if (existingOrder) {
      return res.status(200).json({
        success: true,
        order: existingOrder,
        duplicate: true
      })
    }
    // Still processing
    return res.status(202).json({
      success: false,
      processing: true,
      duplicate: true
    })
  }
  
  // 2. Mark as processing
  processingCache.set(cacheKey, Date.now())
  
  // 3. Decompress if needed
  if (compressed) {
    orderData = JSON.parse(LZString.decompressFromBase64(orderData))
  }
  
  // 4. Detect order type (B2B vs B2C)
  isCorporateOrder = orderData.items.some(item => item.isCorporate === true)
  orderType = isCorporateOrder ? 'B2B' : 'B2C'
  
  // 5. Create order in database
  order = await Order.create({
    products: items,
    price: totalPay,
    totalPay: totalPay,
    address,
    user,
    razorpayPaymentId: paymentId,
    status: 'Pending',
    paymentmode,
    orderType,
    pf: pfCharge,
    printing: printingCharge,
    gst: gstRate
  })
  
  // 6. Handle Printrove routing
  await handlePrintroveRouting(order, isCorporateOrder)
  
  // 7. Generate invoice
  await createInvoice(invoicePayload)
  
  // 8. Clean up cache
  processingCache.delete(cacheKey)
  
  // 9. Return success
  return res.status(200).json({ success: true, order })
}
```

**Printrove Routing Logic:**
```javascript
async handlePrintroveRouting(order, isCorporateOrder) {
  if (isCorporateOrder) {
    // B2B orders - managed by Duco
    console.log('🏢 B2B Order - Managed by Duco')
    order.printroveStatus = 'Corporate Order - No Printrove'
    await order.save()
    return
  }
  
  // B2C orders - send to Printrove
  console.log('🛍️ B2C Order - Sending to Printrove')
  try {
    printData = await createPrintroveOrder(order)
    order.printroveOrderId = printData.order.id
    order.printroveStatus = printData.order.status
    order.printroveItems = printData.order.order_products
    order.printroveTrackingUrl = printData.order.tracking_url
    await order.save()
  } catch (err) {
    console.error('❌ Printrove sync failed:', err.message)
    order.printroveStatus = 'Error'
    await order.save()
  }
}
```



### 3. Tax Calculation Logic

**TaxCalculationService.js:**
```javascript
calculateTax(amount, customerState, customerCountry, isB2B) {
  // 1. Check if in India
  inIndia = isInIndia(customerCountry) || isInIndia(customerState)
  
  if (!inIndia) {
    // INTERNATIONAL: 1% TAX
    taxAmount = (amount * 1) / 100
    return {
      type: 'INTERNATIONAL',
      taxRate: 1,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      taxAmount: taxAmount,
      totalTax: taxAmount,
      label: 'TAX (1%)',
      isIndia: false
    }
  }
  
  // 2. Extract customer state
  custState = extractState(customerState)
  isSameState = custState === COMPANY_STATE // Chhattisgarh
  
  if (isSameState) {
    // SAME STATE: CGST 2.5% + SGST 2.5% = 5%
    cgstAmount = (amount * 2.5) / 100
    sgstAmount = (amount * 2.5) / 100
    return {
      type: 'INTRASTATE',
      taxRate: 5,
      cgstRate: 2.5,
      sgstRate: 2.5,
      igstRate: 0,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      totalTax: cgstAmount + sgstAmount,
      label: 'GST (5%)',
      isSameState: true,
      isIndia: true
    }
  } else {
    // DIFFERENT STATE: IGST 5%
    igstAmount = (amount * 5) / 100
    return {
      type: 'INTERSTATE',
      taxRate: 5,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 5,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
      totalTax: igstAmount,
      label: 'GST (5%)',
      isSameState: false,
      isIndia: true
    }
  }
}
```

**Order Total Calculation:**
```javascript
calculateOrderTotal(subtotal, charges, customerState, customerCountry, isB2B) {
  // 1. Calculate taxable amount
  taxableAmount = subtotal + charges.pf + charges.printing
  
  // 2. Calculate tax
  taxInfo = calculateTax(taxableAmount, customerState, customerCountry, isB2B)
  
  // 3. Calculate grand total
  grandTotal = taxableAmount + taxInfo.totalTax
  
  // 4. Round off (always round up)
  roundedTotal = Math.ceil(grandTotal)
  roundOff = roundedTotal - grandTotal // Always positive
  
  return {
    subtotal,
    pfCharges: charges.pf,
    printingCharges: charges.printing,
    taxableAmount,
    ...taxInfo,
    grandTotal,
    roundOff,
    finalTotal: roundedTotal,
    isB2B
  }
}
```

### 4. Payment Modes

The system supports multiple payment modes:

**1. Online Payment (Full):**
- Razorpay integration
- Full amount paid upfront
- Immediate order creation
- Status: 'Paid'

**2. Netbanking:**
- Similar to online payment
- Different display name
- Same processing flow

**3. Store Pickup:**
- Pay at store
- Order created immediately
- Status: 'Pending'
- No Razorpay verification

**4. 50% Advance:**
- Half payment upfront
- Remaining on delivery
- Wallet transaction created
- Status: 'Paid' (partial)

**5. Manual Payment:**
- Admin-initiated orders
- No Razorpay verification
- Direct order creation

