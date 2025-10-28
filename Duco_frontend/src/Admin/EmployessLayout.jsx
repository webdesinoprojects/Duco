// src/pages/EmployessLayout.jsx
import { Outlet, useNavigate } from "react-router-dom";

const BG = "#0A0A0A";
const ACCENT = "#E5C870";

const EmployessLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("employeeAuth"); // clear session
    navigate("/employee-login"); // redirect to login page
  };

  return (
    <div style={{ minHeight: "100vh" }}>
  {/* Top Bar with only Logout */}
  <header
    className="flex justify-between items-center px-6 py-4 shadow-md"
    style={{ borderBottom: `1px solid ${ACCENT}` }}
  >
    {/* Heading */}
    <h1 className="text-2xl font-bold" 
  
  >
      Employees
    </h1>

    {/* Logout button */}
    <button
      onClick={handleLogout}
      className="px-4 py-2 rounded-lg font-medium"
      
      
    >
      Logout
    </button>
  </header>

  {/* Page Content */}
  <main className="p-6">
    <Outlet />
  </main>
</div>

     );
};

export default EmployessLayout;
