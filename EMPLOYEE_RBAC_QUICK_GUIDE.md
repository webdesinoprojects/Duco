# 🚀 Employee RBAC - Quick Reference Guide

## 3 Specialized Roles

### 1. Graphic Designer 🎨
**Access:** Inventory, Categories, Products, Banner, Blog

### 2. Order Manager 📦
**Access:** Bulk Orders, Orders, Logistics, Set Money, Charges Plan, Corporate Settings

### 3. Accounting and Management 💼
**Access:** Bank Details, Employee Management, User Analysis, Invoice, Sales

## Quick Setup (3 Steps)

### Step 1: Create Employee (Admin)
```
1. Go to /admin/employees
2. Click "Create Employee Access"
3. Select role from dropdown
4. Fill in details
5. Click "Create"
```

### Step 2: Share Access
```
1. Click "Get URL" button
2. Copy the direct access URL
3. Share with employee
```

### Step 3: Employee Login
```
1. Employee goes to /employee-login
2. Enters email and password
3. Sees only their allowed sections
```

## Permission Matrix (Quick View)

| Role | Sections |
|------|----------|
| **Graphic Designer** | Inventory, Categories, Products, Banner, Blog |
| **Order Manager** | Bulk Orders, Orders, Logistics, Money, Charges, Corporate |
| **Accounting** | Bank, Employees, Users, Invoice, Sales |

## How It Works

```
Admin creates employee with role
    ↓
System auto-assigns permissions
    ↓
Employee logs in
    ↓
Sees only allowed sections
    ↓
Access denied for other sections
```

## Key Features

✅ **Auto-Permissions** - Set automatically based on role
✅ **Dynamic Navigation** - Shows only allowed sections
✅ **Access Control** - Blocks unauthorized access
✅ **User-Friendly** - Clear error messages

## Testing Checklist

- [ ] Create Graphic Designer employee
- [ ] Login and verify access to design sections
- [ ] Try accessing order sections (should be denied)
- [ ] Create Order Manager employee
- [ ] Login and verify access to order sections
- [ ] Try accessing accounting sections (should be denied)
- [ ] Create Accounting employee
- [ ] Login and verify access to accounting sections
- [ ] Try accessing design sections (should be denied)

## Common Issues

**Can't see any sections?**
- Check role is set correctly
- Logout and login again
- Clear browser cache

**Access denied for allowed section?**
- Verify role assignment
- Check permissions in database
- Contact admin

## Files Changed

### Backend (2)
- `EmployessAcc.js` - Added permissions
- `employeesAccController.js` - Return permissions on login

### Frontend (4)
- `EmployeesAccManager.jsx` - Role selection UI
- `EmployessLayout.jsx` - Dynamic navigation
- `App.jsx` - Employee routes
- `PermissionGuard.jsx` - Access control (NEW)

## Summary

**3 roles, 15 permissions, automatic assignment, secure access control** 🎉

The system is ready to use! Create employees with specific roles and they'll automatically get the right permissions.
