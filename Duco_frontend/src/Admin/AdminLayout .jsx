import React, { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { clearAdmin } from "./auth/adminAuth";
import axios from "axios";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [showPrintroveModal, setShowPrintroveModal] = useState(false);
  const [printroveEmail, setPrintroveEmail] = useState("");
  const [printrovePassword, setPrintrovePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navItems = [
    { label: "Inventory", path: "/admin" },
    { label: "Products", path: "products" },
    { label: "Category", path: "category" },
    { label: "Set Money", path: "moneyset" },
    { label: "B2C Order", path: "order" },
    { label: "Bulk Order", path: "bulkorder" },
    { label: "B2B Logistics", path: "logistic" },
    { label: "Charges Plan", path: "charges" },
    { label: "Bank Details", path: "bankdetails" },
    { label: "Employees Management", path: "employees" },
    { label: "Corporate Settings", path: "corporate-settings" },
    { label: "Invoice", path: "invoice" },
    { label: "Users", path: "users" },
    { label: "Sales Analysis", path: "sales" },
    { label: "Banner", path: "bannersetup" },
    { label: "Landing Page", path: "landing-page" },
    { label: "Blog", path: "blog" },
  ];

  const handleLogout = async () => {
    clearAdmin();
    localStorage.removeItem("user");
    navigate("/admin/login", { replace: true });
  };

  // 🔹 Function to connect Printrove (auth + redirect)
  const handlePrintroveLogin = async () => {
    if (!printroveEmail || !printrovePassword) {
      setMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // ✅ Authenticate via Printrove API
      const res = await axios.post(
        "https://api.printrove.com/api/external/token",
        {
          email: printroveEmail,
          password: printrovePassword,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const token = res.data?.access_token;
      if (token) {
        localStorage.setItem("printroveToken", token);
        setMessage("✅ Connected successfully!");
        setTimeout(() => {
          setShowPrintroveModal(false);
          // ✅ Correct dashboard redirect
          window.open(
            "https://merchants.printrove.com/app/dashboard",
            "_blank"
          );
        }, 1000);
      } else {
        setMessage("⚠️ Invalid credentials, please try again.");
      }
    } catch (err) {
      console.error(
        "Printrove login failed:",
        err.response?.data || err.message
      );
      setMessage("❌ Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Fixed Logout Button - Top Right */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-red-600 font-medium text-white hover:bg-red-700 transition shadow-lg"
      >
        🚪 Logout
      </button>

      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white p-5 flex flex-col shadow-xl">
        <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>

        <nav className="space-y-2 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="block hover:text-blue-300 hover:bg-gray-700 px-2 py-1 rounded transition"
            >
              {item.label}
            </Link>
          ))}

          {/* ✅ Printrove Button - Always visible */}
          
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 p-6 overflow-y-auto pt-16">
        <Outlet />
      </main>

      {/* 🔹 Printrove Modal */}
      {showPrintroveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 relative">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Connect to Printrove
            </h2>

            <label className="block mb-2 text-sm font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              value={printroveEmail}
              onChange={(e) => setPrintroveEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 focus:ring focus:ring-blue-200 focus:outline-none"
              placeholder="you@example.com"
            />

            <label className="block mb-2 text-sm font-medium text-gray-600">
              Password
            </label>
            <input
              type="password"
              value={printrovePassword}
              onChange={(e) => setPrintrovePassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring focus:ring-blue-200 focus:outline-none"
              placeholder="********"
            />

            {message && (
              <p
                className={`text-sm mb-3 ${
                  message.includes("✅")
                    ? "text-green-600"
                    : message.includes("❌")
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {message}
              </p>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setShowPrintroveModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePrintroveLogin}
                disabled={loading}
                className={`px-4 py-2 rounded-md text-white transition ${
                  loading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
