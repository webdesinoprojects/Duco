# Order Processing Flow Diagram

## Normal Order Flow (No Duplicates)

```
┌─────────────┐
│   User      │
│ Clicks Pay  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  PaymentButton.jsx  │
│  - Detect country   │
│  - Create Razorpay  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Razorpay Payment   │
│  - User pays        │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────┐
│ OrderProcessing.jsx  │
│ - Send to backend    │
└──────┬───────────────┘
       │
       ▼
┌────────────────────────────┐
│ completeOrderController.js │
│ - Check duplicate cache    │
│ - Check existing order     │
│ - Create new order         │
│ - Send to Printrove        │
└──────┬─────────────────────┘
       │
       ▼
┌─────────────────┐
│ Return Order    │
│ status: 200     │
│ success: true   │
│ order: {...}    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ OrderSuccess    │
│ Show details    │
└─────────────────┘
```

---

## Duplicate Request Flow (Order Already Exists)

```
┌─────────────┐
│   User      │
│ Clicks Pay  │
│ (2nd time)  │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ OrderProcessing.jsx  │
│ - Send to backend    │
└──────┬───────────────┘
       │
       ▼
┌────────────────────────────┐
│ completeOrderController.js │
│ - Check duplicate cache    │
│   ✓ Found in cache!        │
│ - Find existing order      │
│   ✓ Order exists!          │
└──────┬─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Return Existing     │
│ status: 200         │
│ success: true       │
│ order: {...}        │
│ duplicate: true     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ OrderProcessing.jsx │
│ - Detect duplicate  │
│ - Show "already     │
│   processed"        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────┐
│ OrderSuccess    │
│ Show details    │
└─────────────────┘
```

---

## Duplicate Request Flow (Order Still Processing)

```
┌─────────────┐
│   User      │
│ Clicks Pay  │
│ (2nd time)  │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ OrderProcessing.jsx  │
│ - Send to backend    │
└──────┬───────────────┘
       │
       ▼
┌────────────────────────────┐
│ completeOrderController.js │
│ - Check duplicate cache    │
│   ✓ Found in cache!        │
│ - Find existing order      │
│   ✗ Not found yet          │
└──────┬─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Return Processing   │
│ status: 202         │
│ success: false      │
│ processing: true    │
│ duplicate: true     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ OrderProcessing.jsx │
│ - Detect 202        │
│ - Wait 2 seconds    │
│ - Retry (1/10)      │
└──────┬──────────────┘
       │
       ▼ (retry)
┌────────────────────────────┐
│ completeOrderController.js │
│ - Check duplicate cache    │
│ - Find existing order      │
│   ✓ Order exists now!      │
└──────┬─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Return Existing     │
│ status: 200         │
│ success: true       │
│ order: {...}        │
│ duplicate: true     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────┐
│ OrderSuccess    │
│ Show details    │
└─────────────────┘
```

---

## International Order Flow

```
┌─────────────────┐
│   User          │
│ Enters Address  │
│ Country: USA    │
└──────┬──────────┘
       │
       ▼
┌─────────────────────┐
│  Cart.jsx           │
│  - Detect country   │
│  - Calculate TAX 1% │
│  - Show total       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  PaymentButton.jsx  │
│  - Detect intl      │
│  - Pass country     │
└──────┬──────────────┘
       │
       ▼
┌────────────────────────────┐
│ completeOrderController.js │
│ - Create order             │
│ - Calculate TAX 1%         │
└──────┬─────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ PrintroveIntegrationService  │
│ - Detect international       │
│ - Pincode as string          │
│ - Validate state & city      │
│ - Send to Printrove          │
└──────┬───────────────────────┘
       │
       ▼
┌─────────────────┐
│ Printrove API   │
│ - Create order  │
│ - Ship to USA   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ OrderSuccess    │
│ TAX: 1%         │
│ Country: USA    │
└─────────────────┘
```

---

## Domestic Order Flow (India)

```
┌─────────────────┐
│   User          │
│ Enters Address  │
│ Country: India  │
└──────┬──────────┘
       │
       ▼
┌─────────────────────┐
│  Cart.jsx           │
│  - Detect India     │
│  - Calculate GST 5% │
│  - Show total       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  PaymentButton.jsx  │
│  - Pass country     │
└──────┬──────────────┘
       │
       ▼
┌────────────────────────────┐
│ completeOrderController.js │
│ - Create order             │
│ - Calculate GST 5%         │
└──────┬─────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ PrintroveIntegrationService  │
│ - Detect domestic            │
│ - Pincode as integer         │
│ - Send to Printrove          │
└──────┬───────────────────────┘
       │
       ▼
┌─────────────────┐
│ Printrove API   │
│ - Create order  │
│ - Ship in India │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ OrderSuccess    │
│ GST: 5%         │
│ Country: India  │
└─────────────────┘
```

---

## Error Handling Flow

```
┌──────────────────────┐
│ OrderProcessing.jsx  │
│ - Send to backend    │
└──────┬───────────────┘
       │
       ▼
┌────────────────────────────┐
│ Backend Error              │
│ - Network error            │
│ - Validation error         │
│ - Server error             │
└──────┬─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Check Error Type    │
└──────┬──────────────┘
       │
       ├─── 202 Processing ───┐
       │                       ▼
       │              ┌─────────────────┐
       │              │ Retry (max 10)  │
       │              │ Wait 2 seconds  │
       │              └────────┬────────┘
       │                       │
       │                       ▼
       │              ┌─────────────────┐
       │              │ Success or      │
       │              │ Timeout         │
       │              └─────────────────┘
       │
       ├─── Duplicate ────────┐
       │                       ▼
       │              ┌─────────────────┐
       │              │ Show "already   │
       │              │ processed"      │
       │              │ Redirect        │
       │              └─────────────────┘
       │
       └─── Other Error ──────┐
                               ▼
                      ┌─────────────────┐
                      │ Show error      │
                      │ "Return to Cart"│
                      └─────────────────┘
```

---

## Status Code Decision Tree

```
Response Status Code
        │
        ├─── 200 ───┐
        │           ▼
        │    ┌──────────────┐
        │    │ success: true│
        │    │ order exists │
        │    └──────┬───────┘
        │           ▼
        │    ┌──────────────┐
        │    │ Show Success │
        │    └──────────────┘
        │
        ├─── 202 ───┐
        │           ▼
        │    ┌──────────────┐
        │    │ processing   │
        │    └──────┬───────┘
        │           ▼
        │    ┌──────────────┐
        │    │ Retry (2s)   │
        │    └──────────────┘
        │
        ├─── 400 ───┐
        │           ▼
        │    ┌──────────────┐
        │    │ Bad Request  │
        │    └──────┬───────┘
        │           ▼
        │    ┌──────────────┐
        │    │ Show Error   │
        │    └──────────────┘
        │
        └─── 500 ───┐
                    ▼
             ┌──────────────┐
             │ Server Error │
             └──────┬───────┘
                    ▼
             ┌──────────────┐
             │ Show Error   │
             └──────────────┘
```

---

## Tax Calculation Decision Tree

```
Customer Address
        │
        ├─── Country = India ───┐
        │                       ▼
        │              ┌─────────────────┐
        │              │ Check State     │
        │              └────────┬────────┘
        │                       │
        │              ├─── Same State (CG) ───┐
        │              │                        ▼
        │              │               ┌─────────────┐
        │              │               │ CGST 2.5%   │
        │              │               │ SGST 2.5%   │
        │              │               │ Total: 5%   │
        │              │               └─────────────┘
        │              │
        │              └─── Different State ───┐
        │                                       ▼
        │                              ┌─────────────┐
        │                              │ IGST 5%     │
        │                              │ Total: 5%   │
        │                              └─────────────┘
        │
        └─── Country ≠ India ───┐
                                ▼
                       ┌─────────────┐
                       │ TAX 1%      │
                       │ No GST      │
                       └─────────────┘
```

---

## Legend

```
┌─────────┐
│ Process │  = Action or Component
└─────────┘

    │
    ▼        = Flow direction

    ├───     = Decision branch

✓ / ✗        = Success / Failure
```
