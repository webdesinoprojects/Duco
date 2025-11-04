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
    try {
      const res = await fetch(`${API_BASE}employeesacc/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.ok) {
        // save session with employee data
        localStorage.setItem("employeeAuth", JSON.stringify({
          employeeid: form.employeeid,
          url: data.url,
          employee: data.employee
        }));
        
        // Map URL to proper route based on employee's assigned section
        let redirectPath = "/admin/employees/banners"; // default
        
        if (data.url && typeof data.url === 'string') {
          const urlLower = data.url.toLowerCase();
          if (urlLower.includes('product')) {
            redirectPath = "/admin/employees/products";
          } else if (urlLower.includes('category')) {
            redirectPath = "/admin/employees/category";
          } else if (urlLower.includes('banner')) {
            redirectPath = "/admin/employees/banners";
          }
        }
        
        navigate(redirectPath);
      } else {
        alert("Invalid credentials");
      }
    } catch (err) {
      alert("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-6 rounded-xl w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold">Employee Login</h1>

     
        <input
          className="w-full p-2 rounded bg-gray-700 outline-none"
          placeholder="Employee ID"
          value={form.employeeid}
          onChange={(e) => setForm({ ...form, employeeid: e.target.value })}
        />
        <input
          type="password"
          className="w-full p-2 rounded bg-gray-700 outline-none"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          type="submit"
          className="w-full bg-yellow-400 text-black py-2 rounded font-medium"
          disabled={loading}
        >
          {loading ? "Checking…" : "Login"}
        </button>
      </form>
    </div>
  );
};

export default EmployeeLogin;