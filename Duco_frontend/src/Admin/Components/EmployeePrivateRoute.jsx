// src/components/EmployeePrivateRoute.jsx
import { Navigate, Outlet } from "react-router-dom";

const EmployeePrivateRoute = () => {
  const isAuth = localStorage.getItem("employeeAuth");
  return isAuth ? <Outlet /> : <Navigate to="/employee-login" />;
};

export default EmployeePrivateRoute;
