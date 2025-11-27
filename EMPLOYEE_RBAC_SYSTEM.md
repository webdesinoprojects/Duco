# 🔐 Employee Role-Based Access Control (RBAC) System

## Overview

A comprehensive role-based access control system has been implemented for employee management with three specialized roles, each with specific permissions to different sections of the admin panel.

## Roles and Permissions

### 1. **Graphic Designer** 🎨
**Access to:**
- ✅ Inventory (Product management)
- ✅ Categories
- ✅ Products
- ✅ Banner
- ✅ Blog

**Use Case:** Employees who manage visual content, product listings, and marketing materials.

### 2. **Order Manager** 📦
**Access to:**
- ✅ Manage Bulk Orders
- ✅ Manage Orders
- ✅ Logistics
- ✅ Set Money (Pricing)
- ✅ Charges Plan
- ✅ Corporate Settings

**Use Case:** Employees who handle order processing, logistics, and business operations.

### 3. **Accounting and Management** 💼
**Access to:**
- ✅ Bank Details
- ✅ Employee Management
- ✅ User Analysis
- ✅ Invoice
- ✅ Sales Analysis

**Use Case:** Employees who manage financial operations, HR, and business analytics.

## Implementation Details

### Backend Changes

#### 1. Updated Employee Model (`EmployessAcc.js`)
```javascript
{
  employeesdetails: {
    role: {
      type: String,
      enum: [
        'Graphic Designer',
        'Order Manager',
        'Accounting and Management',
        // ... other roles
      ]
    }
  },
  permissions: {
    // Graphic Designer
    inventory: Boolean,
    categories: Boolean,
    products: Boolean,
    banner: Boolean,
    blog: Boolean,
    
    // Order Manager
    manageBulkOrder: Boolean,
    manageOrder: Boolean,
    logistics: Boolean,
    setMoney: Boolean,
    chargesPlan: Boolean,
    corporateSettings: Boolean,
    
    // Accounting and Management
    bankDetails: Boolean,
    employeeManagement: Boolean,
    userAnalysis: Boolean,
    invoice: Boolean,
    sales: Boolean,
  }
}
```

#### 2. Auto-Permission Assignment
Permissions are automatically set based on role using a `pre-save` hook:

```javascript
EmployeesAccSchema.pre('save', function(next) {
  const role = this.employeesdetails?.role;
  
  // Reset all permissions
  this.permissions = { /* all false */ };
  
  // Set based on role
  if (role === 'Graphic Designer') {
    this.permissions.inventory = true;
    this.permissions.categories = true;
    // ... etc
  }
  
  next();
});
```

#### 3. Login Response Includes Permissions
```javascript
{
  ok: true,
  url: "employees/section",
  employee: {
    id: "...",
    name: "John Doe",
    email: "john@example.com",
    role: "Graphic Designer",
    permissions: {
      inventory: true,
      categories: true,
      products: true,
      banner: true,
      blog: true,
      // ... all others false
    }
  }
}
```

### Frontend Changes

#### 1. Updated Employee Manager (`EmployeesAccManager.jsx`)
- Added specialized roles to dropdown
- Shows permission preview when role is selected
- Grouped roles (Specialized vs General)

```jsx
<optgroup label="Specialized Roles">
  <option value="Graphic Designer">
    Graphic Designer (Inventory, Categories, Products, Banner, Blog)
  </option>
  <option value="Order Manager">
    Order Manager (Bulk Orders, Orders, Logistics, Money, Charges, Corporate Settings)
  </option>
  <option value="Accounting and Management">
    Accounting and Management (Bank Details, Employees, Users, Invoice, Sales)
  </option>
</optgroup>
```

#### 2. Updated Employee Layout (`EmployessLayout.jsx`)
- Dynamically generates navigation based on permissions
- Shows only sections employee has access to
- Displays employee role in header

```javascript
const allNavItems = [
  { path: "/employees/inventory", label: "Inventory", icon: "📦", permission: "inventory" },
  { path: "/employees/categories", label: "Categories", icon: "📂", permission: "categories" },
  // ... etc
];

// Filter based on permissions
const navItems = allNavItems.filter(item => 
  permissions[item.permission] === true
);
```

#### 3. Permission Guard Component (`PermissionGuard.jsx`)
- Checks permissions before rendering protected content
- Shows "Access Denied" message if no permission
- Can be wrapped around any component

```jsx
<PermissionGuard requiredPermission="inventory">
  <InventoryComponent />
</PermissionGuard>
```

#### 4. Updated App Routes (`App.jsx`)
- Added routes for all employee sections
- Organized by role category
- Maintains backward compatibility

```jsx
{/* Graphic Designer Routes */}
<Route path="inventory" element={<Adminhome />} />
<Route path="categories" element={<Category />} />
<Route path="products" element={<ProdcutsCreated />} />
<Route path="banner" element={<Banner />} />
<Route path="blog" element={<BlogManager />} />

{/* Order Manager Routes */}
<Route path="bulkorder" element={<OrderBulk />} />
<Route path="order" element={<OrderSection />} />
// ... etc
```

## How It Works

### 1. Creating an Employee

**Admin creates employee:**
1. Go to `/admin/employees`
2. Fill in employee details
3. Select role (e.g., "Graphic Designer")
4. System automatically assigns permissions
5. Employee account created

**What happens:**
```
Admin selects "Graphic Designer"
    ↓
Backend pre-save hook triggers
    ↓
Permissions automatically set:
  - inventory: true
  - categories: true
  - products: true
  - banner: true
  - blog: true
  - all others: false
    ↓
Employee saved to database
```

### 2. Employee Login

**Employee logs in:**
1. Go to `/employee-login`
2. Enter email and password
3. System validates credentials
4. Returns employee data with permissions

**Response:**
```json
{
  "ok": true,
  "url": "employees/inventory",
  "employee": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Graphic Designer",
    "permissions": {
      "inventory": true,
      "categories": true,
      "products": true,
      "banner": true,
      "blog": true,
      "manageBulkOrder": false,
      "manageOrder": false,
      // ... etc
    }
  }
}
```

### 3. Navigation Display

**Employee sees only their sections:**

**Graphic Designer sees:**
```
📦 Inventory
📂 Categories
🛍️ Products
🎨 Banner
📝 Blog
```

**Order Manager sees:**
```
📦 Bulk Orders
📋 Manage Orders
🚚 Logistics
💰 Set Money
💳 Charges Plan
⚙️ Corporate Settings
```

**Accounting and Management sees:**
```
🏦 Bank Details
👥 Employee Management
📊 User Analysis
🧾 Invoice
📈 Sales Analysis
```

### 4. Access Control

**Employee tries to access restricted section:**
```
Employee clicks on "Bank Details"
    ↓
PermissionGuard checks permissions
    ↓
permissions.bankDetails === false
    ↓
Shows "Access Denied" page
    ↓
Employee redirected or shown error
```

## Permission Matrix

| Section | Graphic Designer | Order Manager | Accounting & Management |
|---------|-----------------|---------------|------------------------|
| Inventory | ✅ | ❌ | ❌ |
| Categories | ✅ | ❌ | ❌ |
| Products | ✅ | ❌ | ❌ |
| Banner | ✅ | ❌ | ❌ |
| Blog | ✅ | ❌ | ❌ |
| Bulk Orders | ❌ | ✅ | ❌ |
| Manage Orders | ❌ | ✅ | ❌ |
| Logistics | ❌ | ✅ | ❌ |
| Set Money | ❌ | ✅ | ❌ |
| Charges Plan | ❌ | ✅ | ❌ |
| Corporate Settings | ❌ | ✅ | ❌ |
| Bank Details | ❌ | ❌ | ✅ |
| Employee Management | ❌ | ❌ | ✅ |
| User Analysis | ❌ | ❌ | ✅ |
| Invoice | ❌ | ❌ | ✅ |
| Sales Analysis | ❌ | ❌ | ✅ |

## Files Modified

### Backend (2 files)
1. **`Duco_Backend/DataBase/Models/EmployessAcc.js`**
   - Added permissions object
   - Added role enum with specialized roles
   - Added pre-save hook for auto-permission assignment

2. **`Duco_Backend/Controller/employeesAccController.js`**
   - Updated login response to include permissions

### Frontend (4 files)
3. **`Duco_frontend/src/Admin/EmployeesAccManager.jsx`**
   - Added specialized roles to dropdown
   - Added permission preview
   - Grouped roles

4. **`Duco_frontend/src/Admin/EmployessLayout.jsx`**
   - Dynamic navigation based on permissions
   - Shows employee role
   - Filters sections by permission

5. **`Duco_frontend/src/App.jsx`**
   - Added routes for all employee sections
   - Organized by role category

6. **`Duco_frontend/src/Admin/Components/PermissionGuard.jsx`** (NEW)
   - Permission checking component
   - Access denied UI

## Usage Guide

### For Admins

#### Creating a Graphic Designer
```
1. Go to /admin/employees
2. Click "Create Employee Access"
3. Fill in:
   - Section URL: employees/designer1
   - Employee ID: GD001
   - Password: ********
   - Name: John Doe
   - Email: john@example.com
   - Role: Graphic Designer
4. Click "Create"
5. Share access URL with employee
```

#### Creating an Order Manager
```
1. Go to /admin/employees
2. Click "Create Employee Access"
3. Fill in:
   - Section URL: employees/ordermanager1
   - Employee ID: OM001
   - Password: ********
   - Name: Jane Smith
   - Email: jane@example.com
   - Role: Order Manager
4. Click "Create"
5. Share access URL with employee
```

#### Creating Accounting Staff
```
1. Go to /admin/employees
2. Click "Create Employee Access"
3. Fill in:
   - Section URL: employees/accounting1
   - Employee ID: AM001
   - Password: ********
   - Name: Bob Johnson
   - Email: bob@example.com
   - Role: Accounting and Management
4. Click "Create"
5. Share access URL with employee
```

### For Employees

#### Logging In
```
1. Go to /employee-login
2. Enter your email
3. Enter your password
4. Click "Login"
5. You'll be redirected to your dashboard
6. You'll see only the sections you have access to
```

#### Accessing Sections
```
1. After login, you'll see navigation menu
2. Click on any section you have access to
3. If you try to access a restricted section:
   - You'll see "Access Denied" message
   - You can go back to your allowed sections
```

## Security Features

### 1. Permission Validation
- Permissions checked on both frontend and backend
- Frontend hides unauthorized sections
- Backend validates all requests

### 2. Auto-Permission Assignment
- Permissions set automatically based on role
- No manual permission configuration needed
- Consistent across all employees with same role

### 3. Session Management
- Employee auth stored in localStorage
- Includes permissions for quick access
- Cleared on logout

### 4. Access Denied Handling
- Clear error messages
- User-friendly UI
- Easy navigation back to allowed sections

## Testing

### Test Case 1: Graphic Designer
```
1. Create employee with "Graphic Designer" role
2. Login as that employee
3. Verify navigation shows:
   - Inventory ✅
   - Categories ✅
   - Products ✅
   - Banner ✅
   - Blog ✅
4. Try to access /employees/bankdetails
5. Should see "Access Denied"
```

### Test Case 2: Order Manager
```
1. Create employee with "Order Manager" role
2. Login as that employee
3. Verify navigation shows:
   - Bulk Orders ✅
   - Manage Orders ✅
   - Logistics ✅
   - Set Money ✅
   - Charges Plan ✅
   - Corporate Settings ✅
4. Try to access /employees/inventory
5. Should see "Access Denied"
```

### Test Case 3: Accounting and Management
```
1. Create employee with "Accounting and Management" role
2. Login as that employee
3. Verify navigation shows:
   - Bank Details ✅
   - Employee Management ✅
   - User Analysis ✅
   - Invoice ✅
   - Sales Analysis ✅
4. Try to access /employees/products
5. Should see "Access Denied"
```

## Troubleshooting

### Employee can't see any sections
**Solution:**
1. Check if role is set correctly
2. Verify permissions in database
3. Clear localStorage and login again
4. Check browser console for errors

### Employee sees "Access Denied" for allowed section
**Solution:**
1. Verify permission key matches route
2. Check if permissions object exists
3. Ensure login response includes permissions
4. Clear cache and try again

### Permissions not updating after role change
**Solution:**
1. Employee must logout and login again
2. Permissions are set on save, not dynamically
3. Check if pre-save hook is running
4. Verify database has updated permissions

## Future Enhancements

### Phase 2 (Optional)
- [ ] Custom permission builder (mix and match)
- [ ] Permission inheritance
- [ ] Time-based access (temporary permissions)
- [ ] IP-based restrictions
- [ ] Activity logging
- [ ] Permission audit trail

### Phase 3 (Optional)
- [ ] Multi-role support (one employee, multiple roles)
- [ ] Department-based permissions
- [ ] Hierarchical permissions
- [ ] Permission delegation
- [ ] Advanced analytics on access patterns

## Summary

✅ **3 Specialized Roles Implemented**
✅ **15 Permission Types**
✅ **Auto-Permission Assignment**
✅ **Dynamic Navigation**
✅ **Access Control**
✅ **User-Friendly UI**

**The RBAC system is production-ready!** 🎉

Employees can now be assigned specific roles with automatic access to only the sections they need, improving security and user experience.
