// src/pages/EmployessLayout.jsx
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";

const BG = "#0A0A0A";
const ACCENT = "#E5C870";

const EmployessLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  console.log("🏢 EmployessLayout rendering, location:", location.pathname);

  const handleLogout = () => {
    localStorage.removeItem("employeeAuth"); // clear session
    navigate("/employee-login"); // redirect to login page
  };

  // Get employee info from localStorage
  const employeeAuth = JSON.parse(localStorage.getItem("employeeAuth") || "{}");
  const employeeName = employeeAuth.employee?.name || employeeAuth.employeeid || "Employee";
  
  console.log("👤 Employee auth data:", employeeAuth);

  const navItems = [
    { path: "/admin/employees/banners", label: "Banners", icon: "🎨" },
    { path: "/admin/employees/products", label: "Products", icon: "📦" },
    { path: "/admin/employees/category", label: "Categories", icon: "📂" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BG, color: "white" }}>
      {/* Top Bar */}
      <header
        className="flex justify-between items-center px-6 py-4 shadow-md"
        style={{ borderBottom: `1px solid ${ACCENT}` }}
      >
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: ACCENT }}>
            Employee Dashboard
          </h1>
          <p className="text-sm text-gray-400">Welcome, {employeeName}</p>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg font-medium hover:opacity-80 transition-opacity"
          style={{ backgroundColor: ACCENT, color: BG }}
        >
          Logout
        </button>
      </header>

      {/* Navigation */}
      <nav className="px-6 py-4 border-b border-gray-700">
        <div className="flex gap-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? "text-black font-medium"
                  : "text-gray-300 hover:text-white"
              }`}
              style={{
                backgroundColor: location.pathname === item.path ? ACCENT : "transparent",
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Page Content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default EmployessLayout;
