import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:3002/api/";

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
        // save session
        localStorage.setItem("employeeAuth", JSON.stringify(form));
        navigate(data.url); // go to main dashboard
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
