# Complete System Logic Study - Part 4: Admin Panel Logic

## Admin Panel Architecture

### Authentication System

**Admin Login Flow:**
```javascript
// AdminLogin.jsx
handleLogin() {
  // 1. Submit credentials
  response = await axios.post('/api/admin/check', {
    userid: employeeId,
    password: password
  })
  
  // 2. Store auth token
  if (response.data.ok) {
    localStorage.setItem('adminAuth', 'true')
    localStorage.setItem('adminId', userid)
    navigate('/admin/home')
  }
}

// Backend (index.js)
app.post('/api/admin/check', async (req, res) => {
  const { userid, password } = req.body
  
  // 1. Find employee
  user = await EmployeesAcc.findOne({ employeeid: userid })
  if (!user) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' })
  }
  
  // 2. Verify password (bcrypt)
  ok = await bcrypt.compare(password, user.password)
  if (ok) {
    return res.status(200).json({ ok: true, message: 'Admin authenticated' })
  }
  
  return res.status(401).json({ ok: false, message: 'Invalid credentials' })
})
```

**Admin Guard:**
```javascript
// AdminGuard.jsx
function AdminGuard({ children }) {
  const isAuthenticated = localStorage.getItem('adminAuth') === 'true'
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" />
  }
  
  return children
}
```



### Admin Dashboard Features

#### 1. Order Management (OderSection.jsx)

**Order Listing:**
```javascript
async fetchOrders() {
  // 1. Fetch with pagination
  response = await axios.get('/api/orders', {
    params: {
      page: currentPage,
      limit: 50,
      lightweight: false
    }
  })
  
  // 2. Display orders
  orders = response.data.orders
  pagination = response.data.pagination
  
  // 3. Show order details
  orders.map(order => ({
    orderId: order.orderId,
    customer: order.address.fullName,
    total: order.totalPay,
    status: order.status,
    printroveStatus: order.printroveStatus,
    createdAt: order.createdAt
  }))
}
```

**Order Status Update:**
```javascript
async updateOrderStatus(orderId, newStatus) {
  // 1. Update in backend
  await axios.patch(`/api/orders/${orderId}`, {
    status: newStatus
  })
  
  // 2. Refresh order list
  await fetchOrders()
}

// Backend (OrderController.js)
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params
  const { status, paymentmode } = req.body
  
  // Validate status
  validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  
  // Update order
  order = await Order.findByIdAndUpdate(id, { status }, { new: true })
  
  return res.json({ message: 'Order updated', order })
}
```

**Order Details View:**
```javascript
async viewOrderDetails(orderId) {
  // 1. Fetch full order
  response = await axios.get(`/api/orders/${orderId}`)
  order = response.data
  
  // 2. Display enriched data
  return {
    orderId: order.orderId,
    customer: {
      name: order.address.fullName,
      email: order.address.email,
      phone: order.address.mobileNumber,
      address: formatAddress(order.address)
    },
    products: order.items.map(item => ({
      name: item.name,
      quantity: sumQuantity(item.quantity),
      price: item.price,
      design: item.design // Includes base64 images
    })),
    pricing: {
      subtotal: order.price,
      pf: order.pf,
      printing: order.printing,
      tax: order.gst,
      total: order.totalPay
    },
    printrove: {
      orderId: order.printroveOrderId,
      status: order.printroveStatus,
      trackingUrl: order.printroveTrackingUrl
    }
  }
}
```



#### 2. Product Management (ProdcutsCreated.jsx)

**Create Product:**
```javascript
async createProduct(productData) {
  // 1. Prepare product data
  payload = {
    products_name: name,
    image_url: [
      {
        url: imageUrls,
        color: color,
        colorcode: colorCode,
        videolink: videoUrl,
        content: [
          { size: 'S', minstock: 10 },
          { size: 'M', minstock: 10 },
          { size: 'L', minstock: 10 },
          { size: 'XL', minstock: 10 }
        ],
        designtshirt: designImages
      }
    ],
    pricing: [
      { quantity: 1, price_per: 499, discount: 0 },
      { quantity: 10, price_per: 450, discount: 10 },
      { quantity: 50, price_per: 400, discount: 20 }
    ],
    Desciptions: descriptions,
    subcategory: subcategoryId,
    gender: 'Male',
    isCorporate: false, // B2C by default
    printroveProductId: printroveId,
    printroveVariantId: printroveVariantId
  }
  
  // 2. Send to backend
  await axios.post('/api/products', payload)
}

// Backend (ProdcutsController.js)
exports.CreateProdcuts = async (req, res) => {
  const { products_name, image_url, pricing, Desciptions, subcategory, 
          gender, printroveProductId, printroveVariantId, isCorporate } = req.body
  
  // Validate required fields
  if (!products_name || !image_url || !pricing || !Desciptions || !subcategory) {
    return res.status(400).send({ message: 'All required fields must be provided' })
  }
  
  // Create product
  product = new Product({
    products_name,
    image_url,
    pricing,
    Desciptions,
    subcategory,
    gender,
    printroveProductId,
    printroveVariantId,
    isCorporate: Boolean(isCorporate)
  })
  
  savedProduct = await product.save()
  
  return res.status(201).send({ message: 'Product created', product: savedProduct })
}
```

**Update Product:**
```javascript
async updateProduct(productId, updates) {
  // 1. Prepare updates
  payload = {
    products_name: updates.name,
    pricing: updates.pricing,
    Desciptions: updates.descriptions,
    isCorporate: updates.isCorporate,
    printroveProductId: updates.printroveProductId
  }
  
  // 2. Send to backend
  await axios.put(`/api/products/${productId}`, payload)
}

// Backend
exports.updateProduct = async (req, res) => {
  const productId = req.params.productId
  const updates = req.body
  
  // Ensure isCorporate is boolean
  if (updates.hasOwnProperty('isCorporate')) {
    updates.isCorporate = Boolean(updates.isCorporate)
  }
  
  // Recalculate stock if image_url updated
  if (updates.image_url) {
    let total = 0
    updates.image_url.forEach(img => {
      img.content.forEach(item => {
        total += item.minstock || 0
      })
    })
    updates.Stock = total
  }
  
  updatedProduct = await Product.findByIdAndUpdate(productId, updates, {
    new: true,
    runValidators: true
  })
  
  return res.status(200).json({ message: 'Product updated', product: updatedProduct })
}
```

**Delete Product:**
```javascript
async deleteProduct(productId) {
  await axios.delete(`/api/products/${productId}`)
}

// Backend
exports.deleteProduct = async (req, res) => {
  const productId = req.params.productId
  
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid product id' })
  }
  
  deleted = await Product.findByIdAndDelete(productId)
  
  if (!deleted) {
    return res.status(404).json({ message: 'Product not found' })
  }
  
  return res.status(200).json({ message: 'Product deleted', product: deleted })
}
```



#### 3. Analytics Dashboard (AnalyticsDashboard.jsx)

**Sales Analytics:**
```javascript
async fetchSalesAnalytics(fromDate, toDate, groupBy, status) {
  // 1. Fetch analytics data
  response = await axios.get('/api/sales', {
    params: {
      from: fromDate, // YYYY-MM-DD
      to: toDate,
      groupBy: 'day' | 'month',
      status: 'Delivered,Shipped',
      includeCancelled: false
    }
  })
  
  // 2. Display summary
  summary = {
    totalOrders: response.data.summary.totalOrders,
    totalAmount: response.data.summary.totalAmount,
    avgOrderValue: response.data.summary.avgOrderValue
  }
  
  // 3. Display breakdown
  breakdown = response.data.breakdown.map(item => ({
    date: item._id,
    amount: item.totalAmount,
    count: item.count
  }))
  
  // 4. Display orders
  orders = response.data.orders
}

// Backend (analyticsController.js)
exports.getSalesAnalytics = async (req, res) => {
  const { from, to, groupBy, status, includeCancelled } = req.query
  
  // 1. Parse date range (IST timezone)
  const { start, end } = parseDateRangeIST(from, to)
  
  // 2. Build match query
  match = {
    createdAt: { $gte: start, $lte: end },
    razorpayPaymentId: { $nin: [null, ''] } // Paid orders only
  }
  
  // 3. Filter by status
  statusArray = status ? status.split(',') : null
  if (statusArray) {
    match.status = { $in: statusArray }
  } else if (!includeCancelled) {
    match.status = { $ne: 'Cancelled' }
  }
  
  // 4. Calculate summary
  summaryAgg = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalAmount: { $sum: { $toDouble: '$price' } }
      }
    },
    {
      $project: {
        totalOrders: 1,
        totalAmount: 1,
        avgOrderValue: { $divide: ['$totalAmount', '$totalOrders'] }
      }
    }
  ])
  
  // 5. Calculate breakdown
  if (groupBy === 'day' || groupBy === 'month') {
    dateFormat = groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m'
    breakdown = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt', timezone: 'Asia/Kolkata' } },
          totalAmount: { $sum: { $toDouble: '$price' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  }
  
  // 6. Get orders
  orders = await Order.find(match)
    .sort({ createdAt: -1 })
    .select('_id createdAt user price status razorpayPaymentId')
    .lean()
  
  return res.json({ range: { from, to }, summary, breakdown, orders })
}
```



#### 4. User Management (UserInfo.jsx)

**User Listing:**
```javascript
async fetchUsers(page = 1, limit = 50) {
  response = await axios.get('/api/users', {
    params: { page, limit }
  })
  
  users = response.data.users
  pagination = response.data.pagination
  
  return {
    users: users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isVerified: user.isVerified,
      addresses: user.address,
      createdAt: user.createdAt
    })),
    pagination
  }
}

// Backend (UserController.js)
exports.getUser = async (req, res) => {
  // Pagination
  page = parseInt(req.query.page) || 1
  limit = parseInt(req.query.limit) || 50
  skip = (page - 1) * limit
  
  // Get total count
  totalUsers = await User.countDocuments()
  
  // Fetch users
  users = await User.find()
    .select('-password') // Exclude password
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
  
  return res.status(200).json({
    ok: true,
    users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
      hasNextPage: page < Math.ceil(totalUsers / limit),
      hasPrevPage: page > 1
    }
  })
}
```

#### 5. Invoice Management (Invoice.jsx)

**Invoice Generation:**
```javascript
// Backend (invoiceService.js)
async function createInvoice(invoicePayload) {
  const { company, invoice, billTo, items, charges, terms, order } = invoicePayload
  
  // 1. Calculate pricing with tax
  const orderTotal = calculateOrderTotal(
    calculateSubtotal(items),
    charges,
    billTo.state,
    billTo.country,
    false // isB2B
  )
  
  // 2. Create invoice document
  const invoiceDoc = new Invoice({
    invoiceNumber: invoice.number,
    invoiceDate: invoice.date,
    company: {
      name: company.name,
      address: company.address,
      gstin: company.gstin,
      pan: company.pan,
      email: company.email,
      phone: company.phone
    },
    billTo: {
      name: billTo.name,
      address: billTo.address,
      gstin: billTo.gstin,
      state: billTo.state,
      country: billTo.country
    },
    items: items.map(item => ({
      description: item.description,
      hsn: item.hsn,
      quantity: item.qty,
      unit: item.unit,
      price: item.price,
      amount: item.qty * item.price
    })),
    charges: {
      pf: charges.pf,
      printing: charges.printing
    },
    tax: {
      type: orderTotal.type,
      cgst: orderTotal.cgstAmount,
      sgst: orderTotal.sgstAmount,
      igst: orderTotal.igstAmount,
      total: orderTotal.totalTax
    },
    totals: {
      subtotal: orderTotal.subtotal,
      taxableAmount: orderTotal.taxableAmount,
      grandTotal: orderTotal.grandTotal,
      roundOff: orderTotal.roundOff,
      finalTotal: orderTotal.finalTotal
    },
    terms: terms,
    order: order
  })
  
  await invoiceDoc.save()
  
  return invoiceDoc
}
```

#### 6. Corporate Settings (CorporateSettings.jsx)

**Manage Company Info:**
```javascript
async updateCorporateSettings(settings) {
  payload = {
    company: {
      name: settings.companyName,
      address: settings.address,
      gstin: settings.gstin,
      pan: settings.pan,
      email: settings.email,
      phone: settings.phone,
      logo: settings.logoUrl
    },
    invoice: {
      placeOfSupply: settings.placeOfSupply,
      reverseCharge: settings.reverseCharge,
      copyType: settings.copyType
    },
    terms: settings.termsAndConditions,
    forCompany: settings.forCompany
  }
  
  await axios.put('/api/corporate-settings', payload)
}
```

#### 7. Tracking Management (TrackingManager.jsx)

**Sync Order Tracking:**
```javascript
async syncOrderTracking(orderId) {
  // 1. Trigger sync
  response = await axios.post(`/api/tracking/sync/${orderId}`)
  
  // 2. Get updated tracking info
  trackingInfo = await axios.get(`/api/tracking/${orderId}`)
  
  return {
    order: trackingInfo.order,
    timeline: trackingInfo.timeline,
    trackingUrl: trackingInfo.trackingUrl,
    printroveStatus: trackingInfo.order.printroveStatus
  }
}

// Backend (trackingController.js)
exports.syncOrderTracking = async (req, res) => {
  const { orderId } = req.params
  
  // Use PrintroveTrackingService
  result = await PrintroveTrackingService.syncOrderStatus(orderId)
  
  return res.json(result)
}
```

