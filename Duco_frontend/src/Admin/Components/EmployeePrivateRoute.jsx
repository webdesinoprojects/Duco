// src/components/EmployeePrivateRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

const EmployeePrivateRoute = () => {
  const location = useLocation();
  
  // Get employee auth from localStorage
  const employeeAuthStr = localStorage.getItem("employeeAuth");
  
  console.log("🔐 EmployeePrivateRoute - location:", location.pathname);
  console.log("🔐 employeeAuth exists:", !!employeeAuthStr);
  
  // Parse and validate employee auth
  let employeeAuth = null;
  let isValidEmployeeAuth = false;
  
  if (employeeAuthStr) {
    try {
      employeeAuth = JSON.parse(employeeAuthStr);
      console.log("🔐 Parsed employeeAuth:", employeeAuth);
      
      // Validate that this is actually employee auth (not admin auth)
      // Employee auth must have: email, employeeid, and employee object
      isValidEmployeeAuth = !!(
        employeeAuth.email && 
        employeeAuth.employeeid && 
        employeeAuth.employee &&
        (employeeAuth.employee.id || employeeAuth.employee._id || employeeAuth.employee.employeeid)
      );
      
      console.log("🔐 Is valid employee auth:", isValidEmployeeAuth);
      console.log("🔐 Has email:", !!employeeAuth.email);
      console.log("🔐 Has employeeid:", !!employeeAuth.employeeid);
      console.log("🔐 Has employee object:", !!employeeAuth.employee);
      console.log("🔐 Has permissions:", !!employeeAuth.employee?.permissions);
      console.log("🔐 Permissions count:", Object.keys(employeeAuth.employee?.permissions || {}).length);
    } catch (e) {
      console.error("❌ Failed to parse employeeAuth:", e);
      isValidEmployeeAuth = false;
    }
  }
  
  if (!isValidEmployeeAuth) {
    console.log("❌ No valid employee auth found, redirecting to login");
    
    // Clear invalid auth
    if (employeeAuthStr) {
      console.log("🧹 Clearing invalid employeeAuth from localStorage");
      localStorage.removeItem("employeeAuth");
    }
    
    // If accessing a specific section, redirect to employee login
    const pathParts = location.pathname.split('/');
    if (pathParts.length >= 3 && (pathParts[1] === 'employees' || pathParts[1] === 'auth')) {
      console.log("🎯 Redirecting to employee login");
      return <Navigate to="/employee-login" replace />;
    }
    
    console.log("🎯 Redirecting to employee login");
    return <Navigate to="/employee-login" replace />;
  }
  
  console.log("✅ Employee authenticated, rendering Outlet");
  return <Outlet />;
};

export default EmployeePrivateRoute;
