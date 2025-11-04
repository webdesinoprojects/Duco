# Employee URL-Based Authentication System

## Overview
This system allows employees to access their assigned sections directly through URLs with automatic authentication prompts.

## How It Works

### 1. Admin Creates Employee Account
- Admin goes to `/admin/employees`
- Creates employee with:
  - Section URL (e.g., `employees/gimme`)
  - Employee ID
  - Password
  - Employee details (name, email, role)

### 2. Employee Access Methods

#### Method 1: Direct Section Access (Recommended)
- Employee visits: `https://ducoart.com/employees/gimme`
- If not authenticated, shows login form for that specific section
- If authenticated but wrong section, shows access denied
- If authenticated and correct section, shows section content

#### Method 2: Pre-authenticated URL
- Admin generates: `https://ducoart.com/auth/gimme?email=employee@email.com&password=PASSWORD`
- Automatically logs in employee and redirects to section
- Useful for one-time access links

#### Method 3: Section-Specific Login
- Employee visits: `https://ducoart.com/auth/gimme`
- Shows login form specifically for the "gimme" section
- After login, redirects to section if authorized

### 3. Security Features
- Section-based access control
- Password hashing with bcrypt
- Session management with localStorage
- Automatic logout functionality
- Access denied for wrong sections

## URL Structure

### Employee Sections
- `/employees/gimme` - Direct access to "gimme" section
- `/employees/marketing` - Direct access to "marketing" section  
- `/employees/sales` - Direct access to "sales" section
- `/employees/[any-section]` - Dynamic section access

### Authentication URLs
- `/auth/gimme` - Login page for "gimme" section
- `/auth/gimme?email=...&password=...` - Auto-login for "gimme" section

### Admin URLs
- `/admin/employees` - Employee management
- `/employee-login` - General employee login

## Implementation Details

### Frontend Components
1. **SectionAuthGuard** - Handles authentication for direct section access
2. **EmployeeUrlAuth** - Handles URL-based authentication with credentials
3. **EmployeeSection** - Generic section content with auth guard
4. **EmployeePrivateRoute** - Route protection for employee dashboard

### Backend Endpoints
- `POST /api/employeesacc/login` - Employee authentication
- `GET /api/employeesacc` - List employees (admin)
- `POST /api/employeesacc` - Create employee (admin)
- `PATCH /api/employeesacc/:id` - Update employee (admin)

### Database Schema
```javascript
{
  url: "employees/gimme",           // Section URL
  employeeid: "EMP001",            // Unique employee ID
  password: "hashed_password",      // Bcrypt hashed password
  employeesdetails: {
    name: "John Doe",
    email: "john@company.com",
    role: "Manager"
  },
  employeesNote: "Internal notes"
}
```

## Usage Examples

### For Employees
1. **Bookmark Access**: Save `https://ducoart.com/employees/gimme` as bookmark
2. **Quick Login**: Use provided login form when accessing section
3. **Stay Logged In**: Session persists across browser sessions

### For Admins
1. **Create Employee**: Use admin panel to set up new employee accounts
2. **Generate URLs**: Click "Get URL" to generate access links for employees
3. **Manage Access**: Update employee sections and permissions

## Benefits
- **Simple Access**: Employees just need one URL to bookmark
- **Secure**: Section-based access control with password protection
- **Flexible**: Easy to add new sections and employees
- **User-Friendly**: Clean URLs that are easy to remember and share
- **Admin-Friendly**: Easy employee management through admin panel