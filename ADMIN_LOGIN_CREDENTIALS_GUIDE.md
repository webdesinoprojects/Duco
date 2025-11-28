# 🔐 Admin Login - Credentials Guide

## Understanding the System

Your system uses **Employee-based authentication** for admin access. This means:
- Admin accounts are stored in the `EmployeesAcc` collection
- Login uses `employeeid` (not username) and `password`
- Passwords are hashed with bcrypt

## Default Admin Accounts

The system has a script that creates two default admin accounts:

### 1. Super Admin
```
Employee ID: superadmin
Password: SuperAdmin@2024
Email: superadmin@duco.com
Role: superadmin
```

### 2. Regular Admin
```
Employee ID: admin
Password: admin123
Email: admin@duco.com
Role: admin
```

## How to Check Current Admin Accounts

Run this command in the backend folder:

```bash
cd Duco_Backend
node scripts/check-admins.js
```

This will show you:
- All admin accounts in the database
- Their Employee IDs
- Their emails and roles
- Login instructions

## How to Create Admin Accounts

If no admin accounts exist, run:

```bash
cd Duco_Backend
node scripts/create-admin.js
```

This will:
- Create the two default admin accounts
- Hash their passwords
- Display the credentials
- Warn you to change passwords after first login

## How to Login

### Step 1: Go to Admin Login
Navigate to: `http://localhost:5173/admin/login`

### Step 2: Enter Credentials
- **User ID**: Enter the `employeeid` (e.g., `superadmin` or `admin`)
- **Password**: Enter the password

### Step 3: Access Admin Panel
After successful login, you'll be redirected to `/admin`

## Login Flow Diagram

```
User enters credentials
    ↓
Frontend: AdminLogin.jsx
    ↓
API Call: POST /api/admin/check
    ↓
Backend: index.js
    ↓
Database: Find employee by employeeid
    ↓
Compare password with bcrypt
    ↓
If valid:
├─ Return { ok: true }
├─ Frontend stores admin session (2h TTL)
└─ Redirect to /admin
    ↓
If invalid:
└─ Return { ok: false, message: 'Invalid credentials' }
```

## Authentication Details

### Backend Endpoint
**File**: `Duco_Backend/index.js`

```javascript
POST /api/admin/check
Body: {
  userid: "superadmin",
  password: "SuperAdmin@2024"
}

Response (Success):
{
  ok: true,
  message: "Admin authenticated"
}

Response (Failure):
{
  ok: false,
  message: "Invalid credentials"
}
```

### Frontend Login
**File**: `Duco_frontend/src/Admin/AdminLogin.jsx`

- Uses `adminLogin(userid, password)` from APIservice
- Stores session with 2-hour TTL
- Redirects to admin panel on success

### Session Storage
**File**: `Duco_frontend/src/Admin/auth/adminAuth.js`

- Stores admin session in localStorage
- 2-hour expiration (TTL)
- Checked by AdminGuard on protected routes

## Troubleshooting

### Issue 1: "Invalid credentials"

**Possible Causes:**
1. Wrong Employee ID
2. Wrong password
3. Admin account doesn't exist in database

**Solutions:**
1. Check admin accounts: `node scripts/check-admins.js`
2. Create admin if missing: `node scripts/create-admin.js`
3. Use correct Employee ID (not email!)
4. Use correct password

### Issue 2: "No admin accounts found"

**Solution:**
```bash
cd Duco_Backend
node scripts/create-admin.js
```

### Issue 3: "Forgot password"

**Option 1 - Use Forgot Password Feature:**
1. Go to `/admin/forgot-password`
2. Enter admin email
3. Follow reset instructions

**Option 2 - Recreate Admin:**
1. Delete existing admin from database
2. Run: `node scripts/create-admin.js`
3. Use new credentials

**Option 3 - Manual Password Reset:**
```bash
cd Duco_Backend
node scripts/reset-admin-password.js
```
(You may need to create this script)

### Issue 4: "Backend not running"

**Solution:**
```bash
cd Duco_Backend
npm start
```

Make sure backend is running on port 3000 (or your configured port)

## Security Best Practices

### ⚠️ IMPORTANT:

1. **Change default passwords immediately after first login!**
2. **Never commit passwords to git**
3. **Use strong passwords in production**
4. **Enable 2FA if available**
5. **Regularly rotate passwords**

### Recommended Password Format:
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Example: `MyStr0ng!P@ssw0rd2024`

## Creating Custom Admin Accounts

### Via Admin Panel:
1. Login as super admin
2. Go to `/admin/employees`
3. Create new employee
4. Set role to "Accounting and Management" (has admin permissions)
5. Set email and password
6. Employee can now login at `/admin/login`

### Via Script:
Edit `scripts/create-admin.js` and add:
```javascript
{
  url: 'myadmin',
  employeeid: 'myadmin',
  password: 'MyPassword123!',
  employeesdetails: {
    name: 'My Admin',
    email: 'myadmin@duco.com',
    role: 'admin'
  },
  employeesNote: 'Custom admin account'
}
```

Then run: `node scripts/create-admin.js`

## Quick Reference

### Check Admins:
```bash
node scripts/check-admins.js
```

### Create Admins:
```bash
node scripts/create-admin.js
```

### Login URL:
```
http://localhost:5173/admin/login
```

### Default Credentials:
```
User ID: superadmin
Password: SuperAdmin@2024
```

OR

```
User ID: admin
Password: admin123
```

## Summary

✅ **Admin accounts** are stored in EmployeesAcc collection
✅ **Login uses** Employee ID + Password
✅ **Default accounts** can be created with script
✅ **Check accounts** with check-admins.js script
✅ **Forgot password** feature available at /admin/forgot-password
✅ **Session expires** after 2 hours

**Run `node scripts/check-admins.js` to see your current admin accounts!** 🔐
