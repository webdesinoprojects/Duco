import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminLoggedIn } from "./adminAuth";

export default function AdminGuard() {
  const [ok, setOk] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // check on mount (and every time this component renders on navigation)
    setOk(isAdminLoggedIn());
  }, [location.pathname]);

  if (ok === null) return <div style={{ padding: 24 }}>Checking admin…</div>;
  if (!ok) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  return <Outlet />;
}
