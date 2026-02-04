// src/pages/EmployessLayout.jsx
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";

const BG = "#0A0A0A";
const ACCENT = "#E5C870";

const EmployessLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("employeeAuth"); // clear session
    navigate("/employee-login"); // redirect to login page
  };

  // Get employee info from localStorage
  const employeeAuth = JSON.parse(localStorage.getItem("employeeAuth") || "{}");
  const employeeName = employeeAuth.employee?.name || employeeAuth.email || "Employee";
  const employeeRole = employeeAuth.employee?.role || "Employee";
  const permissions = employeeAuth.employee?.permissions || {};

  // Define all possible navigation items with their permission keys
  const allNavItems = [
    // Graphic Designer sections
    { path: "/employees/inventory", label: "Inventory", icon: "📦", permission: "inventory" },
    { path: "/employees/categories", label: "Categories", icon: "📂", permission: "categories" },
    { path: "/employees/products", label: "Products", icon: "🛍️", permission: "products" },
    { path: "/employees/banner", label: "Banner", icon: "🎨", permission: "banner" },
    { path: "/employees/blog", label: "Blog", icon: "📝", permission: "blog" },
    
    // Order Manager sections
    { path: "/employees/bulkorder", label: "Bulk Orders", icon: "📦", permission: "manageBulkOrder" },
    { path: "/employees/order", label: "B2C Orders", icon: "📋", permission: "manageOrder" },
    { path: "/employees/logistics", label: "B2B Logistics", icon: "🚚", permission: "logistics" },
    { path: "/employees/moneyset", label: "Set Money", icon: "💰", permission: "setMoney" },
    { path: "/employees/charges", label: "Charges Plan", icon: "💳", permission: "chargesPlan" },
    { path: "/employees/corporate-settings", label: "Corporate Settings", icon: "⚙️", permission: "corporateSettings" },
    
    // Accounting and Management sections
    { path: "/employees/bankdetails", label: "Bank Details", icon: "🏦", permission: "bankDetails" },
    { path: "/employees/employees", label: "Employee Management", icon: "👥", permission: "employeeManagement" },
    { path: "/employees/users", label: "User Analysis", icon: "📊", permission: "userAnalysis" },
    { path: "/employees/invoice", label: "Invoice", icon: "🧾", permission: "invoice" },
    { path: "/employees/sales", label: "Sales Analysis", icon: "📈", permission: "sales" },
  ];

  // Filter navigation items based on permissions
  const navItems = allNavItems.filter(item => {
    // If no permission key specified, show to everyone
    if (!item.permission) return true;
    // Check if employee has this permission
    return permissions[item.permission] === true;
  });

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
          <p className="text-xs" style={{ color: ACCENT }}>Role: {employeeRole}</p>
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
      <main className="p-6 employee-dashboard-text">
        <style>{`
          .employee-dashboard-text,
          .employee-dashboard-text * {
            color: #f3f4f6;
          }
          .employee-dashboard-text .bg-white,
          .employee-dashboard-text .bg-white * {
            color: #111827;
          }
          .employee-dashboard-text .bg-gray-50,
          .employee-dashboard-text .bg-gray-50 *,
          .employee-dashboard-text .bg-gray-100,
          .employee-dashboard-text .bg-gray-100 *,
          .employee-dashboard-text .bg-slate-50,
          .employee-dashboard-text .bg-slate-50 *,
          .employee-dashboard-text .bg-slate-100,
          .employee-dashboard-text .bg-slate-100 *,
          .employee-dashboard-text .bg-blue-50,
          .employee-dashboard-text .bg-blue-50 *,
          .employee-dashboard-text .bg-blue-100,
          .employee-dashboard-text .bg-blue-100 *,
          .employee-dashboard-text .bg-gradient-to-br,
          .employee-dashboard-text .bg-gradient-to-br *,
          .employee-dashboard-text .from-white,
          .employee-dashboard-text .from-white *,
          .employee-dashboard-text .via-slate-50,
          .employee-dashboard-text .via-slate-50 *,
          .employee-dashboard-text .to-white,
          .employee-dashboard-text .to-white * {
            color: #111827;
          }
          .employee-dashboard-text input::placeholder,
          .employee-dashboard-text textarea::placeholder {
            color: #cbd5f5;
            opacity: 1;
          }
          .employee-dashboard-text .bg-white input::placeholder,
          .employee-dashboard-text .bg-white textarea::placeholder {
            color: #6b7280;
            opacity: 1;
          }
          .employee-dashboard-text .bg-gray-50 input::placeholder,
          .employee-dashboard-text .bg-gray-50 textarea::placeholder,
          .employee-dashboard-text .bg-gray-100 input::placeholder,
          .employee-dashboard-text .bg-gray-100 textarea::placeholder,
          .employee-dashboard-text .bg-slate-50 input::placeholder,
          .employee-dashboard-text .bg-slate-50 textarea::placeholder,
          .employee-dashboard-text .bg-slate-100 input::placeholder,
          .employee-dashboard-text .bg-slate-100 textarea::placeholder,
          .employee-dashboard-text .bg-gradient-to-br input::placeholder,
          .employee-dashboard-text .bg-gradient-to-br textarea::placeholder,
          .employee-dashboard-text .from-white input::placeholder,
          .employee-dashboard-text .from-white textarea::placeholder,
          .employee-dashboard-text .via-slate-50 input::placeholder,
          .employee-dashboard-text .via-slate-50 textarea::placeholder,
          .employee-dashboard-text .to-white input::placeholder,
          .employee-dashboard-text .to-white textarea::placeholder {
            color: #6b7280;
            opacity: 1;
          }
          .employee-dashboard-text ::selection {
            background: #facc15 !important;
            color: #111827 !important;
          }
          .employee-dashboard-text ::-moz-selection {
            background: #facc15 !important;
            color: #111827 !important;
          }
        `}</style>
        <Outlet />
      </main>
    </div>
  );
};

export default EmployessLayout;
