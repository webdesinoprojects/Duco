# Complete System Logic Study - Part 6: Printrove API Details

## Printrove API Integration

### Base URL
```
https://api.printrove.com/api/external
```

### Authentication

**Token Generation:**
```javascript
POST /api/external/token
Content-Type: application/json

{
  "email": "merchant@email.com",
  "password": "password"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "expires_at": "2025-01-01T00:00:00.000Z"
}
```

**Token Usage:**
```javascript
Authorization: Bearer {access_token}
```

### API Endpoints Used

#### 1. Get Products
```javascript
GET /api/external/products
Authorization: Bearer {token}

Response:
{
  "products": [
    {
      "id": 462,
      "name": "Men's T-Shirt",
      "category": "Apparel",
      "is_available": true
    }
  ]
}
```

#### 2. Get Product Details with Variants
```javascript
GET /api/external/products/{productId}
Authorization: Bearer {token}

Response:
{
  "product": {
    "id": 462,
    "name": "Men's T-Shirt",
    "variants": [
      {
        "id": 22094474,
        "name": "White S",
        "sku": "TSHIRT-WHITE-S",
        "size": "S",
        "color": "White",
        "price": 299,
        "is_available": true,
        "mockup": {
          "front_mockup": "https://...",
          "back_mockup": "https://..."
        }
      }
    ]
  }
}
```



#### 3. Upload Design (Base64)
```javascript
POST /api/external/designs
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData:
- file: Buffer (image data)
- name: "Design Name"

Response:
{
  "design": {
    "id": 12345,
    "name": "Design Name",
    "url": "https://...",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

#### 4. Upload Design (URL)
```javascript
POST /api/external/designs/url
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://example.com/design.png",
  "name": "Design Name"
}

Response:
{
  "design": {
    "id": 12345,
    "name": "Design Name",
    "url": "https://...",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

#### 5. Create Order (Domestic - India)
```javascript
POST /api/external/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "reference_number": "pay_abc123xyz",
  "retail_price": 1575,
  "customer": {
    "name": "Raj Kumar",
    "email": "raj@example.com",
    "number": 9876543210,
    "address1": "123 MG Road",
    "address2": "Near City Mall",
    "address3": "",
    "pincode": 492001, // INTEGER for India
    "state": "Chhattisgarh",
    "city": "Raipur",
    "country": "India"
  },
  "cod": false,
  "order_products": [
    {
      "variant_id": 22094474,
      "quantity": 2,
      "is_plain": true
    }
  ]
}

Response:
{
  "order": {
    "id": "PR123456",
    "status": "pending",
    "reference_number": "pay_abc123xyz",
    "retail_price": 1575,
    "tracking_url": null,
    "estimated_delivery_date": "2025-01-15",
    "order_products": [...]
  }
}
```

#### 6. Create Order (International)
```javascript
POST /api/external/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "reference_number": "pay_xyz789abc",
  "retail_price": 1575,
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "number": 1234567890,
    "address1": "123 Main Street",
    "address2": "Apt 4B",
    "address3": "",
    "pincode": "10001", // STRING for international
    "state": "New York", // REQUIRED for international
    "city": "New York", // REQUIRED for international
    "country": "United States"
  },
  "cod": false,
  "order_products": [
    {
      "variant_id": 22094474,
      "quantity": 2,
      "is_plain": true
    }
  ]
}

Response: Same as domestic
```

