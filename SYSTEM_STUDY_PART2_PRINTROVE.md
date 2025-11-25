# Complete System Logic Study - Part 2: Printrove Integration

## Printrove Integration Architecture

### Authentication Flow

```javascript
// printroveAuth.js
1. Generate token using email/password
2. Cache token with expiry
3. Auto-refresh when expired
4. Token used in all API calls
```

**Token Management:**
- Cached in memory: `cachedToken`
- Expiry tracked: `tokenExpiry`
- Auto-regenerates before expiry
- Endpoint: `POST /api/external/token`

### Service Layer Architecture

The system uses 6 specialized services for Printrove:

#### 1. PrintroveIntegrationService
**Purpose:** Main integration orchestrator
**Key Methods:**
- `createOrder()` - Create Printrove order
- `getCategories()` - Fetch product categories
- `getCategoryProducts()` - Get products in category
- `getProductVariants()` - Get variant details
- `uploadDesign()` - Upload design images
- `getVariantId()` - Map Duco size/color to Printrove variant

**Order Creation Logic:**
```javascript
async createOrder(orderData) {
  // 1. Process each product
  for (product of orderData.products) {
    // 2. Get Printrove variant ID from mapping
    variantId = await getVariantId(productId, size, color)
    
    // 3. Build order product
    orderProducts.push({
      variant_id: variantId,
      quantity: qty,
      is_plain: !hasDesign
    })
  }
  
  // 4. Detect international vs domestic
  isInternational = country !== 'India'
  
  // 5. Format pincode correctly
  pincode = isInternational ? String(pincode) : parseInt(pincode)
  
  // 6. Send to Printrove API
  POST /api/external/orders
}
```



#### 2. PrintrovePricingService
**Purpose:** Handle pricing calculations and validation
**Key Methods:**
- `getVariantPricing(variantId)` - Get Printrove cost
- `calculateOrderCost(products)` - Calculate total cost
- `validatePricing(retail, cost, tolerance)` - Validate pricing

**Pricing Validation:**
```javascript
// Ensures retail price matches Printrove cost within tolerance
validatePricing(retailPrice, printroveCost, tolerance = 10%) {
  difference = abs(retailPrice - printroveCost)
  percentageDiff = (difference / printroveCost) * 100
  isValid = percentageDiff <= tolerance
}
```

#### 3. PrintroveProductCreationService
**Purpose:** Handle design uploads and product creation
**Key Methods:**
- `uploadDesign(imageData, name, token)` - Upload to Design Library
- `getOrCreateProduct(orderItem, token)` - Get/create product
- `processCustomDesign(productInfo, token)` - Process custom designs

**Design Upload Flow:**
```javascript
async uploadDesign(imageData, name, token) {
  if (isBase64) {
    // Convert base64 to buffer
    buffer = Buffer.from(base64String, 'base64')
    // Upload as multipart/form-data
    POST /api/external/designs
  } else if (isUrl) {
    // Upload from URL
    POST /api/external/designs/url
  }
  return designId
}
```

#### 4. PrintroveSyncService
**Purpose:** Sync products and variants between Duco and Printrove
**Key Methods:**
- `fetchAllPrintroveProducts()` - Get all products
- `fetchProductDetails(productId)` - Get product with variants
- `syncPrintroveProducts()` - Sync to mapping table
- `mapDucoToPrintrove(ducoId, printroveId)` - Create mapping
- `getPrintroveVariantId(ducoId, color, size)` - Get variant

**Sync Logic:**
```javascript
async syncPrintroveProducts() {
  // 1. Fetch all Printrove products
  products = await fetchAllPrintroveProducts()
  
  // 2. For each product
  for (product of products) {
    // 3. Get detailed variant info
    details = await fetchProductDetails(product.id)
    
    // 4. Create/update mapping
    await PrintroveMapping.findOneAndUpdate({
      printroveProductId: product.id
    }, {
      printroveProductName: product.name,
      variants: details.variants.map(v => ({
        printroveVariantId: v.id,
        printroveSku: v.sku,
        printrovePrice: v.price,
        isAvailable: v.is_available
      }))
    }, { upsert: true })
  }
}
```



#### 5. PrintroveTrackingService
**Purpose:** Track order status and delivery
**Key Methods:**
- `getOrderStatus(printroveOrderId)` - Get current status
- `updateOrderWithPrintroveData(orderId, data)` - Update local order
- `syncOrderStatus(orderId)` - Sync single order
- `syncAllOrderStatuses()` - Bulk sync all orders
- `getTrackingInfo(orderId)` - Get comprehensive tracking

**Status Mapping:**
```javascript
mapPrintroveStatusToLocal(printroveStatus) {
  statusMap = {
    'pending': 'Pending',
    'processing': 'Processing',
    'received': 'Processing',
    'dispatched': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled'
  }
  return statusMap[printroveStatus.toLowerCase()]
}
```

**Tracking Timeline:**
```javascript
async getTrackingInfo(orderId) {
  // 1. Get order from DB
  order = await Order.findById(orderId)
  
  // 2. Sync with Printrove
  printroveData = await getOrderStatus(order.printroveOrderId)
  
  // 3. Build timeline
  timeline = [
    { status: 'Order Placed', timestamp: order.createdAt },
    { status: 'Sent to Production', timestamp: order.updatedAt },
    { status: 'Production Started', timestamp: printroveData.received_date },
    { status: 'Dispatched', timestamp: printroveData.dispatch_date },
    { status: 'Shipped', timestamp: printroveData.shipped_date },
    { status: 'Delivered', timestamp: printroveData.delivered_date }
  ]
  
  // 4. Add delivery estimate
  if (!delivered) {
    estimatedDate = printroveData.estimated_delivery_date || 
                    calculateFromShipping(shippedDate, 4 days)
    timeline.push({ 
      status: 'Estimated Delivery', 
      timestamp: estimatedDate 
    })
  }
  
  return { order, timeline, trackingUrl }
}
```

#### 6. DesignProcessingService
**Purpose:** Process custom t-shirt designs
**Key Methods:**
- `processDesignData(designData)` - Process design from frontend
- `processSideDesign(sideData, side)` - Process front/back
- `validateDesignData(designData)` - Validate design
- `createPrintReadyDesign(designData)` - Create print instructions

**Design Processing:**
```javascript
processDesignData(designData) {
  return {
    front: {
      text: {
        content: designData.front.customText,
        size: designData.front.textSize,
        color: designData.front.textColor,
        position: { x: 50, y: 30 }
      },
      image: {
        data: designData.front.uploadedImage,
        size: designData.front.imageSize,
        position: { x: 50, y: 30 }
      }
    },
    back: { /* same structure */ },
    metadata: {
      hasText: !!designData.front.customText,
      hasImages: !!designData.frontImage,
      textCount: countTextElements(),
      imageCount: countImageElements()
    }
  }
}
```

