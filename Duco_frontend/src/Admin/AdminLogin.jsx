import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { adminLogin } from "../Service/APIservice";                          // axios instance
import { setAdminLoggedIn, isAdminLoggedIn } from "./auth/adminAuth"; // TTL helpers

export default function AdminLogin() {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const navigate = useNavigate();
  const { state } = useLocation();
  const from = state?.from?.pathname || "/admin";

  // If already cached as admin, skip the form
  useEffect(() => {
    if (isAdminLoggedIn()) navigate(from, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!userid || !password) {
      setErr("Enter user ID and password");
      return;
    }
    setLoading(true);
    try {
      const ok = await adminLogin(userid, password);   // <-- boolean
      if (ok) {
        setAdminLoggedIn();                            // 2h TTL
        navigate(from, { replace: true });
      } else {
        setErr("Invalid credentials");
      }
    } catch (error) {
      setErr(error?.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the admin user ID and password.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">User ID</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              value={userid}
              onChange={(e) => setUserid(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <div className="relative mt-1">
              <input
                type={show ? "text" : "password"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-12 outline-none focus:ring-2 focus:ring-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Forgot Password Link */}
        <div className="mt-4 text-center">
          <a 
            href="/admin/forgot-password" 
            className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            Forgot Password?
          </a>
        </div>
      </div>
    </div>
  );
}
