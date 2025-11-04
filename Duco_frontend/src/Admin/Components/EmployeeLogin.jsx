import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta?.env?.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api` 
  : (import.meta.env.DEV ? "http://localhost:3000/api" : "https://duco-67o5.onrender.com/api");

const EmployeeLogin = () => {
  const [form, setForm] = useState({ employeeid: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log("🔐 Employee login attempt:", { employeeid: form.employeeid, apiBase: API_BASE });
    
    try {
      const loginUrl = `${API_BASE}/employeesacc/login`;
      console.log("📡 Making request to:", loginUrl);
      
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      console.log("📡 Response status:", res.status);
      const data = await res.json();
      console.log("📡 Response data:", data);

      if (data.ok) {
        // save session with employee data
        localStorage.setItem("employeeAuth", JSON.stringify({
          employeeid: form.employeeid,
          url: data.url,
          employee: data.employee
        }));
        
        // Map URL to proper route based on employee's assigned section
        let redirectPath = "/employees/banners"; // default
        
        if (data.url && typeof data.url === 'string') {
          const urlLower = data.url.toLowerCase();
          console.log("🎯 Employee URL:", data.url, "-> Mapping to route");
          
          // Extract the section from URL (e.g., "employees/gimme" -> "gimme")
          const urlParts = data.url.split('/');
          const section = urlParts[urlParts.length - 1]; // Get the last part
          
          // Map to available routes
          if (urlLower.includes('product') || urlLower.includes('inventory')) {
            redirectPath = "/employees/products";
          } else if (urlLower.includes('category') || urlLower.includes('categories')) {
            redirectPath = "/employees/category";
          } else if (urlLower.includes('banner') || urlLower.includes('marketing')) {
            redirectPath = "/employees/banners";
          } else if (urlLower.includes('gimme')) {
            redirectPath = "/employees/gimme";
          } else {
            // Try to use the section directly if it exists as a route
            const availableRoutes = ['banners', 'products', 'category', 'gimme'];
            if (availableRoutes.includes(section.toLowerCase())) {
              redirectPath = `/employees/${section.toLowerCase()}`;
            } else {
              console.log("⚠️ URL pattern not recognized, using default banners");
              redirectPath = "/employees/banners";
            }
          }
        }
        
        console.log("🚀 Redirecting to:", redirectPath);
        
        navigate(redirectPath);
      } else {
        console.log("❌ Login failed:", data);
        alert("Invalid credentials: " + (data.error || "Please check your Employee ID and password"));
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      alert("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded-xl w-full max-w-md space-y-6 shadow-2xl border border-gray-700"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">Employee Portal</h1>
          <p className="text-gray-400 text-sm">Enter your credentials to access your dashboard</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Employee ID or Email
            </label>
            <input
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
              placeholder="Enter your Employee ID or Email"
              value={form.employeeid}
              onChange={(e) => setForm({ ...form, employeeid: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Contact your administrator if you need help accessing your account
          </p>
        </div>
      </form>
    </div>
  );
};

export default EmployeeLogin;