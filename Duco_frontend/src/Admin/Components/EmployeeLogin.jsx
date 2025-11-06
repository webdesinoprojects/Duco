import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta?.env?.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api` 
  : (import.meta.env.DEV ? "https://duco-67o5.onrender.com/api" : "https://duco-67o5.onrender.com/api");

const EmployeeLogin = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log("🔐 Employee login attempt:", { email: form.email, apiBase: API_BASE });
    
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
          email: form.email,
          employeeid: data.employee?.employeeid,
          url: data.url,
          employee: data.employee
        }));
        
        // Dynamic URL mapping based on employee's assigned section
        let redirectPath = "/employees/banners"; // default fallback
        
        if (data.url && typeof data.url === 'string') {
          console.log("🎯 Employee URL:", data.url, "-> Mapping to route");
          
          // Extract the section from URL (e.g., "employees/gimme" -> "gimme")
          const urlParts = data.url.split('/');
          const section = urlParts[urlParts.length - 1]; // Get the last part
          
          if (section && section.trim()) {
            // Use the section directly - the :section route will handle it
            redirectPath = `/employees/${section.toLowerCase()}`;
            console.log("✅ Dynamic route created:", redirectPath);
          } else {
            console.log("⚠️ No section found in URL, using default banners");
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
              Email Address
            </label>
            <input
              type="email"
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
              placeholder="Enter your email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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