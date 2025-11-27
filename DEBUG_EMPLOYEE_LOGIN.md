# 🔍 Debug Employee Login - Step by Step

## The Issue

You're entering the employee email and password but it's not authorizing. Let's debug this!

## Step 1: Use the Debug Page

I've created a special debug page for you. Visit:

```
http://localhost:5173/employee-debug
```

This page will:
1. Let you test the login
2. Show you the exact response from the server
3. Display the employee's permissions
4. Help identify what's wrong

## Step 2: Test the Login

1. Go to `/employee-debug`
2. Enter the employee email (e.g., `jatin@example.com`)
3. Enter the password you set
4. Click "Test Login"
5. Look at the response

### What to Look For:

#### ✅ **If Login is Successful:**
```json
{
  "ok": true,
  "employee": {
    "email": "jatin@example.com",
    "employeeid": "EMP001",
    "name": "Jatin",
    "role": "Graphic Designer",
    "permissions": {
      "inventory": true,
      "categories": true,
      "products": true,
      "banner": true,
      "blog": true,
      ...
    }
  }
}
```

**Check:**
- Does `permissions` exist?
- Are there any `true` values in permissions?
- If NO permissions or all `false` → **Run the fix script!**

#### ❌ **If Login Fails:**

**Error: "Employee not found"**
- The email doesn't exist in the database
- Double-check the email you used when creating the employee

**Error: "Invalid password"**
- The password is wrong
- Try resetting the password in `/admin/employees`

**Error: "Missing credentials"**
- Email or password is empty

## Step 3: Fix Missing Permissions

If the employee has NO permissions (all false or empty object):

### Option A: Run the Fix Script

```bash
cd Duco_Backend
node scripts/fix-employee-permissions.js
```

This will automatically set permissions based on the employee's role.

### Option B: Recreate the Employee

1. Go to `/admin/employees`
2. Delete the employee
3. Create them again with:
   - Same email
   - Same password
   - **Make sure to select a ROLE** (Graphic Designer, Order Manager, etc.)
4. The new employee will have permissions automatically

## Step 4: Clear Old Auth and Try Again

After fixing permissions:

1. **Clear localStorage:**
   - Press F12
   - Go to Application tab
   - Click Local Storage
   - Delete `employeeAuth` key

2. **Visit the employee URL:**
   - Go to `/employees/jatin` (or whatever URL you set)

3. **Login with credentials:**
   - Enter the employee email
   - Enter the password
   - Click "Login as Employee"

4. **Should work now!** ✅

## Common Issues and Solutions

### Issue 1: "No permissions found"
**Solution:** Run the fix script or recreate the employee with a role selected

### Issue 2: "Employee not found"
**Solution:** Check the email - it must match exactly what's in the database

### Issue 3: "Invalid password"
**Solution:** Reset the password in `/admin/employees` → Edit employee → Enter new password

### Issue 4: Login works but shows "No Permissions Assigned" page
**Solution:** The employee exists but has no permissions. Run the fix script!

### Issue 5: Backend not running
**Solution:** Make sure your backend is running:
```bash
cd Duco_Backend
npm start
```

## Quick Checklist

- [ ] Backend is running
- [ ] Employee exists in database (check `/admin/employees`)
- [ ] Employee has a ROLE assigned (Graphic Designer, Order Manager, etc.)
- [ ] Employee has permissions (check with debug page)
- [ ] Using correct email (the one in employeesdetails.email)
- [ ] Using correct password
- [ ] Cleared old employeeAuth from localStorage

## Still Not Working?

If you've tried everything above and it's still not working:

1. **Check the browser console** (F12 → Console tab)
   - Look for error messages
   - Look for the login response

2. **Check the backend logs**
   - Look at your terminal where backend is running
   - Should see login attempt logs

3. **Share the error** with me:
   - Screenshot of the debug page response
   - Console errors
   - Backend logs

**Let's get this working!** 🚀
