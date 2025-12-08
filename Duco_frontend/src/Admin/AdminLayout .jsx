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
          <Link to="/admin" className="block hover:text-blue-300">
            Inventory
          </Link>
          <Link to="products" className="block hover:text-blue-300">
            Products
          </Link>
          <Link to="category" className="block hover:text-blue-300">
            Category
          </Link>
          <Link to="moneyset" className="block hover:text-blue-300">
            Set Money
          </Link>
          <Link to="order" className="block hover:text-blue-300">
            B2C Order
          </Link>
          <Link to="bulkorder" className="block hover:text-blue-300">
            Bulk Order
          </Link>
          <Link to="logistic" className="block hover:text-blue-300">
            B2B Logistics
          </Link>
          <Link to="charges" className="block hover:text-blue-300">
            Charges Plan
          </Link>
          <Link to="bankdetails" className="block hover:text-blue-300">
            Bank Details
          </Link>
          <Link to="employees" className="block hover:text-blue-300">
            Employees Management
          </Link>
          <Link to="corporate-settings" className="block hover:text-blue-300">
            Corporate Settings
          </Link>
          <Link to="invoice" className="block hover:text-blue-300">
            Invoice
          </Link>
          <Link to="users" className="block hover:text-blue-300">
            Users
          </Link>
          <Link to="sales" className="block hover:text-blue-300">
            Analysis
          </Link>
          <Link to="bannersetup" className="block hover:text-blue-300">
            Banner
          </Link>
          <Link to="landing-page" className="block hover:text-blue-300">
            Landing Page
          </Link>
          <Link to="blog" className="block hover:text-blue-300">
            Blog
          </Link>

          {/* 🌟 NEW: Printrove Integration */}
          <button
            onClick={() => setShowPrintroveModal(true)}
            className="block w-full text-left bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 transition mt-3"
          >
            🖨️ Printrove Dashboard
          </button>
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
