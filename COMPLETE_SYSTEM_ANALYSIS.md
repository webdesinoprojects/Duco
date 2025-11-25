# 🎯 Complete System Analysis - Duco Art E-Commerce Platform

## 📚 Documentation Structure

This comprehensive study is divided into 7 detailed parts:

1. **SYSTEM_STUDY_PART1_ARCHITECTURE.md** - System overview, tech stack, business logic
2. **SYSTEM_STUDY_PART2_PRINTROVE.md** - Printrove integration (6 services)
3. **SYSTEM_STUDY_PART3_ORDER_PROCESSING.md** - Order flow, payment, tax
4. **SYSTEM_STUDY_PART4_ADMIN_LOGIC.md** - Admin panel features
5. **SYSTEM_STUDY_PART5_DATABASE.md** - MongoDB schemas (10 collections)
6. **SYSTEM_STUDY_PART6_PRINTROVE_API.md** - Printrove API details
7. **SYSTEM_STUDY_PART7_B2B_B2C_MONEY.md** - B2B/B2C logic, money exchange, billing

## 🎯 System Capabilities

### Core Features
✅ Dual order system (B2B/B2C)
✅ Printrove print-on-demand integration
✅ Custom t-shirt designer (Fabric.js)
✅ Multi-payment support (Razorpay)
✅ International order handling
✅ Dynamic tax calculation (GST/TAX)
✅ Bulk discount tiers
✅ Wallet system (50% advance)
✅ Invoice generation
✅ Order tracking
✅ Admin dashboard
✅ Analytics & reporting

### Business Models Supported

**B2C (Retail):**
- Individual customers
- Small quantities
- Standard pricing
- Printrove fulfillment
- 5% GST (India) / 1% TAX (International)

**B2B (Corporate):**
- Bulk orders (min 100 units)
- Tiered discounts (5%-20%)
- Internal fulfillment
- 18% GST
- 50% advance payment option



## 🔄 Complete Order Flow (Detailed)

### B2C Order Flow
```
1. Customer browses products
2. Adds to cart (regular or custom design)
3. Enters shipping address
4. System calculates tax based on location
   - India (Same State): CGST 2.5% + SGST 2.5%
   - India (Different State): IGST 5%
   - International: TAX 1%
5. Customer selects payment method
6. Razorpay payment gateway
7. Payment success → OrderProcessing.jsx
8. Backend creates order (duplicate prevention)
9. Order marked as B2C
10. Sent to Printrove API
11. Printrove creates production order
12. Invoice generated automatically
13. Order success page shown
14. Printrove fulfills order
15. Tracking updates synced
16. Order delivered
```

### B2B Order Flow
```
1. Corporate customer browses products
2. Adds bulk quantity to cart (min 100)
3. System applies bulk discount
   - 100-499: 5% off
   - 500-999: 10% off
   - 1000-9999: 15% off
   - 10000+: 20% off
4. Enters shipping address
5. System calculates 18% GST
6. Selects payment (online/50% advance)
7. Payment processed
8. Backend creates order
9. Order marked as B2B
10. NOT sent to Printrove
11. Invoice generated
12. Admin manages fulfillment
13. Internal production/sourcing
14. Manual shipping
15. Order delivered
```

## 💰 Pricing & Charges System

### Charge Plan Tiers

**Packaging & Forwarding:**
```
1-50 units: ₹12/unit
51-200 units: ₹10/unit
201+ units: ₹8/unit
```

**Printing Cost:**
```
1-50 units: ₹15/unit
51-200 units: ₹12/unit
201+ units: ₹10/unit
```

**GST:**
```
All quantities: 5% (B2C) or 18% (B2B)
```

### Price Calculation Example

**B2C Order (150 units):**
```
Product Price: ₹500/unit × 150 = ₹75,000
P&F: ₹10/unit × 150 = ₹1,500
Printing: ₹12/unit × 150 = ₹1,800
Subtotal: ₹78,300
GST (5%): ₹3,915
Total: ₹82,215
```

**B2B Order (500 units):**
```
Product Price: ₹500/unit × 500 = ₹2,50,000
Bulk Discount (10%): -₹25,000
Discounted Price: ₹2,25,000
P&F: ₹8/unit × 500 = ₹4,000
Printing: ₹10/unit × 500 = ₹5,000
Subtotal: ₹2,34,000
GST (18%): ₹42,120
Total: ₹2,76,120
```

## 🌍 International Order Handling

### Key Differences

| Feature | Domestic (India) | International |
|---------|-----------------|---------------|
| Tax Type | GST (5%) | TAX (1%) |
| Tax Breakdown | CGST+SGST or IGST | Simple TAX |
| Pincode Format | Integer (6 digits) | String (any) |
| State Required | Optional | Mandatory |
| City Required | Optional | Mandatory |
| Currency | INR | USD/GBP/EUR/etc |
| Printrove | Yes (B2C only) | Yes (B2C only) |

### Currency Support

**Supported Currencies:**
- INR (India)
- USD (United States)
- GBP (United Kingdom)
- EUR (Europe)
- AED (UAE)
- AUD (Australia)
- CAD (Canada)
- SGD (Singapore)

**Conversion Logic:**
```javascript
// MoneyModel stores conversion rates
{
  location: "United States",
  price_increase: 50, // Additional ₹50
  currency: {
    country: "United States",
    toconvert: 83.5 // 1 USD = ₹83.5
  }
}
```



## 🏢 Admin Panel Capabilities

### Order Management
- View all orders (paginated)
- Filter by status/date/customer
- Update order status
- View order details with designs
- Track Printrove orders
- Generate shipping labels
- Manage logistics
- Upload delivery slips

### Product Management
- Create products (B2C/B2B)
- Update product details
- Set pricing tiers
- Manage variants (size/color)
- Link to Printrove products
- Set stock levels
- Delete products

### Corporate Settings
- Set minimum order quantity
- Configure bulk discount tiers
- Set corporate GST rate
- Enable/disable Printrove for B2B
- Configure payment methods

### Charge Plan Management
- Edit P&F tiers
- Edit printing cost tiers
- Edit GST rates
- Preview calculations
- Save/reset changes

### User Management
- View all users
- View user orders
- View user addresses
- Manage user accounts

### Analytics Dashboard
- Sales by date range
- Revenue tracking
- Order count
- Average order value
- Status breakdown
- Daily/monthly reports

### Invoice Management
- Auto-generate invoices
- View invoice history
- Filter by date/customer
- Download invoices
- Customize invoice template

### Bank Details
- Add bank accounts
- Set active account
- UPI details
- Display on invoices

### Logistics Management
- Create logistics entries
- Track shipments
- Generate labels
- Speed logistics toggle
- Delivery slip upload

## 🔐 Security Features

### Authentication
- Admin login with bcrypt
- Employee accounts
- Session management
- Password reset flow
- OTP verification (email)

### Payment Security
- Razorpay integration
- Payment verification
- Duplicate prevention
- Transaction logging
- Wallet balance tracking

### Data Protection
- Environment variables
- CORS configuration
- Input validation
- SQL injection prevention
- XSS protection

## 📊 Database Collections (10)

1. **Orders** - Order records with Printrove data
2. **Products** - Product catalog with variants
3. **PrintroveMapping** - Duco-Printrove mappings
4. **Users** - Customer accounts
5. **Design** - Custom design data
6. **Invoice** - Invoice records
7. **Category/Subcategory** - Product organization
8. **EmployeesAcc** - Admin accounts
9. **Wallet** - Payment transactions
10. **OTP** - Email verification

## 🔧 Configuration Files

### Backend (.env)
```
MONGODB_URI=mongodb://...
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
PRINTROVE_EMAIL=...
PRINTROVE_PASSWORD=...
RESEND_API_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Frontend (.env)
```
VITE_API_BASE_URL=https://duco-67o5.onrender.com
VITE_RAZORPAY_KEY_ID=rzp_...
```

## 🚀 Deployment

**Backend:** Render.com
**Frontend:** Vercel
**Database:** MongoDB Atlas
**Images:** Cloudinary
**Payments:** Razorpay
**Fulfillment:** Printrove

## 📈 Key Metrics Tracked

- Total orders (B2B + B2C)
- Revenue by order type
- Average order value
- Conversion rate
- Cart abandonment
- Product popularity
- Customer lifetime value
- Printrove sync status
- Payment success rate
- Delivery time

## 🎨 Custom T-Shirt Designer

### Features
- Front/back design
- Text customization
- Image upload
- Font selection
- Color picker
- Size adjustment
- Position control
- Preview generation
- Export to Printrove

### Design Processing
1. User creates design in Fabric.js
2. Design saved as JSON + base64 images
3. Stored in Design collection
4. Linked to order
5. Uploaded to Printrove Design Library
6. Applied to product variants
7. Sent for production

## 📝 Important Business Rules

1. **ALL B2C orders go to Printrove** (including custom designs)
2. **B2B orders NEVER go to Printrove** (internal fulfillment)
3. **Minimum B2B order: 100 units**
4. **Tax calculated automatically** based on location
5. **Order IDs auto-generated** (ducoart{year}/{yy}/{seq})
6. **Duplicate prevention active** (30-second cache)
7. **Invoices auto-generated** with correct tax
8. **Printrove sync automatic** for B2C orders
9. **Wallet tracks 50% payments**
10. **Round-off always positive** (round up)

## 🔄 Integration Points

### Printrove API
- Authentication (token-based)
- Product catalog sync
- Variant mapping
- Design upload
- Order creation
- Status tracking
- Delivery updates

### Razorpay API
- Order creation
- Payment processing
- Webhook handling
- Refund processing
- Transaction history

### Cloudinary API
- Image upload
- Image transformation
- CDN delivery
- Storage management

### Email Service (Resend)
- OTP emails
- Order confirmations
- Invoice delivery
- Password reset

## 📞 Support & Maintenance

### Monitoring
- Server health checks
- Database connection status
- Printrove API status
- Payment gateway status
- Error logging

### Backup Strategy
- Daily database backups
- Image backups (Cloudinary)
- Configuration backups
- Code version control (Git)

### Update Process
1. Test in development
2. Run test scripts
3. Deploy to staging
4. Verify functionality
5. Deploy to production
6. Monitor for issues

---

## 📖 Quick Reference

**Start Backend:** `npm run dev` (in Duco_Backend)
**Start Frontend:** `npm run dev` (in Duco_frontend)
**Test International Orders:** `node test_international_order.js`
**Test Order Processing:** `node test_order_processing_fix.js`

**Admin Login:** `/admin/login`
**Admin Dashboard:** `/admin/home`
**Corporate Settings:** `/admin/corporate-settings`
**Charge Plan:** `/admin/charge-plan`

---

**Last Updated:** January 2025
**System Version:** 1.0.0
**Documentation Status:** Complete ✅

