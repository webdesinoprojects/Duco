# Admin Forgot Password - Setup Complete ✅

## Summary
Successfully configured the admin forgot password functionality with OTP verification via email.

## Changes Made

### Frontend Changes

#### 1. Added Route in `Duco_frontend/src/App.jsx`
```javascript
import ForgotPassword from "./Admin/ForgotPassword.jsx";

// Added route
<Route path="/admin/forgot-password" element={<ForgotPassword />} />
```

### Backend Changes

#### 2. Registered Route in `Duco_Backend/index.js`
```javascript
const adminForgotPasswordRoutes = require('./Router/adminForgotPasswordRoutes.js');

// Route already registered
app.use('/api', require('./Router/adminForgotPasswordRoutes'));
```

## How It Works

### Step 1: Request OTP
- Admin visits: `http://localhost:5173/admin/forgot-password`
- Enters their email address
- Backend checks if admin exists with that email
- Generates 6-digit OTP
- Sends OTP via Resend email service
- OTP expires in 10 minutes

### Step 2: Verify OTP
- Admin enters the 6-digit OTP received via email
- Backend verifies OTP is valid and not expired
- Marks OTP as verified

### Step 3: Reset Password
- Admin enters new password and confirms it
- Frontend validates:
  - Passwords match
  - Password is at least 6 characters
- Backend:
  - Verifies OTP was verified in step 2
  - Hashes new password with bcrypt
  - Updates admin password
  - Deletes used OTP
  - Redirects to login page

## API Endpoints

### POST `/api/admin/forgot-password/send-otp`
**Request:**
```json
{
  "email": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your email"
}
```

### POST `/api/admin/forgot-password/verify-otp`
**Request:**
```json
{
  "email": "admin@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

### POST `/api/admin/forgot-password/reset`
**Request:**
```json
{
  "email": "admin@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## Features

✅ **3-Step Process**: Email → OTP → New Password
✅ **Email Verification**: OTP sent via Resend email service
✅ **Security**: 
  - OTP expires in 10 minutes
  - Password hashed with bcrypt
  - OTP deleted after use
✅ **User-Friendly UI**: 
  - Step indicator
  - Clear error messages
  - Success notifications
  - Auto-redirect to login after reset
✅ **Validation**:
  - Email format validation
  - 6-digit OTP validation
  - Password strength check
  - Password match confirmation

## Email Configuration

The system uses Resend for sending emails. Configuration in `.env`:
```env
RESEND_API_KEY=re_GNTJDyUU_AHDnsshGnYNN9SjLeUGqN3Zw
RESEND_FROM="Duco <no-reply@ducoart.com>"
```

## Testing

1. Navigate to: `http://localhost:5173/admin/forgot-password`
2. Enter admin email (must exist in EmployeesAcc collection)
3. Check email for OTP
4. Enter OTP
5. Set new password
6. Login with new password at `/admin/login`

## Database Models Used

- **EmployeesAcc**: Admin accounts with email and password
- **AdminOtp**: Temporary OTP storage with expiration

## Security Notes

- OTPs expire after 10 minutes (TTL index in AdminOtpModel)
- Passwords are hashed with bcrypt (10 rounds)
- Used OTPs are deleted after password reset
- Email must match existing admin account
- OTP must be verified before password reset

---

**Status**: ✅ Fully Functional
**Access URL**: http://localhost:5173/admin/forgot-password
