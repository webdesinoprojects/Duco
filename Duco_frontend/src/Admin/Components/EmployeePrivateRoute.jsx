// src/components/EmployeePrivateRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

const EmployeePrivateRoute = () => {
  const isAuth = localStorage.getItem("employeeAuth");
  const location = useLocation();
  
  console.log("🔐 EmployeePrivateRoute - isAuth:", !!isAuth, "location:", location.pathname);
  console.log("🔐 Route parts:", location.pathname.split('/'));
  
  if (!isAuth) {
    console.log("❌ No employee auth found, redirecting to login");
    // If accessing a specific section, redirect to that section's auth page
    const pathParts = location.pathname.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'employees') {
      const section = pathParts[2];
      console.log("🎯 Redirecting to section auth:", section);
      return <Navigate to={`/auth/${section}`} />;
    }
    return <Navigate to="/employee-login" />;
  }
  
  console.log("✅ Employee authenticated, rendering Outlet");
  return <Outlet />;
};

export default EmployeePrivateRoute;
