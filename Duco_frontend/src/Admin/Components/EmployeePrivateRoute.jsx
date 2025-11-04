// src/components/EmployeePrivateRoute.jsx
import { Navigate, Outlet } from "react-router-dom";

const EmployeePrivateRoute = () => {
  const isAuth = localStorage.getItem("employeeAuth");
  console.log("🔐 EmployeePrivateRoute - isAuth:", !!isAuth, isAuth);
  
  if (!isAuth) {
    console.log("❌ No employee auth found, redirecting to login");
    return <Navigate to="/employee-login" />;
  }
  
  console.log("✅ Employee authenticated, rendering Outlet");
  return <Outlet />;
};

export default EmployeePrivateRoute;
