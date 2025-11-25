# Complete System Logic Study - Part 1: Architecture & Overview

## System Overview

**Duco Art** is a full-stack e-commerce platform for custom apparel with Printrove integration for order fulfillment.

### Technology Stack

**Backend:**
- Node.js + Express.js
- MongoDB (Mongoose ODM)
- Razorpay (Payment Gateway)
- Printrove API (Print-on-Demand)
- Cloudinary (Image Storage)
- Nodemailer/Resend (Email)

**Frontend:**
- React 18 + Vite
- Redux Toolkit (State Management)
- React Router v6 (Routing)
- Tailwind CSS (Styling)
- Fabric.js (T-shirt Designer)
- Axios (API Calls)

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Pages   │  │Components│  │  Admin   │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │              │                     │
│       └─────────────┴──────────────┘                     │
│                     │                                    │
│              ┌──────▼──────┐                            │
│              │   Services  │                            │
│              │   (API)     │                            │
│              └──────┬──────┘                            │
└─────────────────────┼────────────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼────────────────────────────────────┐
│                 BACKEND (Express)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Routes   │→ │Controllers│→ │ Services │              │
│  └──────────┘  └──────────┘  └────┬─────┘              │
│                                    │                     │
│              ┌─────────────────────┴─────┐              │
│              │                           │              │
│         ┌────▼────┐              ┌──────▼──────┐       │
│         │Database │              │External APIs│       │
│         │(MongoDB)│              │(Printrove)  │       │
│         └─────────┘              └─────────────┘       │
└──────────────────────────────────────────────────────────┘
```



## Core Business Logic

### 1. Order Types (B2B vs B2C)

The system distinguishes between two order types:

**B2C (Business-to-Consumer) - Retail Orders:**
- Regular customers buying products
- ALL B2C orders go to Printrove for fulfillment
- Includes both catalog products AND custom designer t-shirts
- Tax: 5% GST (India) or 1% TAX (International)

**B2B (Business-to-Business) - Corporate Orders:**
- Corporate/bulk orders
- NEVER sent to Printrove
- Managed internally by Duco
- Marked with `isCorporate: true` flag
- Tax: Same as B2C but marked as corporate

### 2. Product Categories

**Regular Products:**
- Pre-designed catalog items
- Stored in Products collection
- Linked to Printrove via PrintroveMapping
- Multiple variants (size, color)

**Custom T-Shirt Designer:**
- User-created designs using Fabric.js
- Front/back design support
- Text and image uploads
- Sent to Printrove with design files
- Product ID format: `custom-tshirt-{timestamp}`

