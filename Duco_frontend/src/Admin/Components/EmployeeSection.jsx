// Generic component for employee sections - redirects to first available section
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

const API_BASE = import.meta?.env?.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : (import.meta.env.DEV ? "https://duco-67o5.onrender.com/api" : "https://duco-67o5.onrender.com/api");

const EmployeeSection = () => {
  const { username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  console.log("🎯 EmployeeSection - username:", username, "location:", location.pathname);
  
  const [employeeAuth, setEmployeeAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("employeeAuth") || "{}");
    } catch {
      return {};
    }
  });
  const [refreshing, setRefreshing] = useState(true);

  const employeeName = employeeAuth.employee?.name || employeeAuth.employee?.employeeid || "Employee";
  const rawPermissions = useMemo(() => employeeAuth.employee?.permissions || {}, [employeeAuth]);
  const roleName = employeeAuth.employee?.role || "";

  useEffect(() => {
    if (username && location.pathname === `/employees/${username}`) {
      navigate("/employee-login", { replace: true });
    }
  }, [username, location.pathname, navigate]);

  const roleFallbackPermissions = useMemo(() => {
    const map = {
      "Graphic Designer": {
        inventory: true,
        categories: true,
        products: true,
        banner: true,
        blog: true,
      },
      "Order Manager": {
        manageBulkOrder: true,
        manageOrder: true,
        logistics: true,
        setMoney: true,
        chargesPlan: true,
        corporateSettings: true,
      },
      "Accounting and Management": {
        bankDetails: true,
        employeeManagement: true,
        userAnalysis: true,
        invoice: true,
        sales: true,
      },
    };

    return map[roleName] || {};
  }, [roleName]);

  const permissions = useMemo(() => {
    const values = Object.values(rawPermissions);
    const hasAnyTrue = values.some(Boolean);
    return hasAnyTrue ? rawPermissions : roleFallbackPermissions;
  }, [rawPermissions, roleFallbackPermissions]);

  useEffect(() => {
    const values = Object.values(rawPermissions);
    const hasAnyTrue = values.some(Boolean);
    const fallbackHasAny = Object.keys(roleFallbackPermissions).length > 0;

    if (!hasAnyTrue && fallbackHasAny) {
      const merged = {
        ...(employeeAuth || {}),
        employee: {
          ...(employeeAuth?.employee || {}),
          permissions: roleFallbackPermissions,
        },
      };

      localStorage.setItem("employeeAuth", JSON.stringify(merged));
      setEmployeeAuth(merged);
    }
  }, [rawPermissions, roleFallbackPermissions, employeeAuth]);
  
  console.log("🎯 Employee auth data:", employeeAuth);
  console.log("🎯 Employee object:", employeeAuth.employee);
  console.log("🎯 Employee permissions:", permissions);
  console.log("🎯 Permissions keys:", Object.keys(permissions));
  console.log("🎯 Has permissions?", Object.keys(permissions).length > 0);

  // Refresh employee profile/permissions on access URL load
  useEffect(() => {
    const refreshEmployee = async () => {
      try {
        setRefreshing(true);

        const stored = JSON.parse(localStorage.getItem("employeeAuth") || "{}");
        setEmployeeAuth(stored);

        const normalize = (value = "") => value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
        const normalizedUsername = normalize(username || "");
        const urlParam = normalizedUsername ? `employees/${normalizedUsername}` : "";
        const employeeid = stored.employeeid || stored.employee?.employeeid;

        const query = employeeid
          ? `employeeid=${encodeURIComponent(employeeid)}`
          : urlParam
          ? `url=${encodeURIComponent(urlParam)}`
          : "";

        if (!query) {
          setRefreshing(false);
          return;
        }

        const res = await fetch(`${API_BASE}/employeesacc?${query}`);
        if (!res.ok) {
          setRefreshing(false);
          return;
        }

        const data = await res.json();
        const updated = Array.isArray(data) ? data[0] : (data?.data?.[0] || data);
        if (updated && typeof updated === 'object') {
          if (!employeeid && normalizedUsername) {
            const updatedSlugFromUrl = typeof updated.url === "string" ? normalize(updated.url.split('/').pop()) : "";
            const updatedName = normalize(updated.employeesdetails?.name || updated.employee?.name || "");
            const updatedEmployeeId = normalize(updated.employeeid || updated.employee?.employeeid || "");
            const updatedSlug = updatedSlugFromUrl || updatedName || updatedEmployeeId;

            if (updatedSlug && updatedSlug !== normalizedUsername) {
              localStorage.removeItem("employeeAuth");
              setEmployeeAuth({});
              navigate("/employee-login", { replace: true });
              return;
            }
          }

          const mergedEmployee = {
            ...(stored.employee || {}),
            ...(updated.employee || {}),
            ...(updated.employeesdetails || {}),
            permissions:
              updated.permissions ||
              updated.employee?.permissions ||
              (stored.employee?.permissions || {}),
          };

          const mergedAuth = {
            ...stored,
            employee: mergedEmployee,
            employeeid: updated.employeeid || stored.employeeid,
          };

          localStorage.setItem("employeeAuth", JSON.stringify(mergedAuth));
          setEmployeeAuth(mergedAuth);
        } else {
          // keep existing auth if refresh returns empty
          setEmployeeAuth(stored);
        }
      } catch (err) {
        console.error("❌ Failed to refresh employee auth:", err);
      } finally {
        setRefreshing(false);
      }
    };

    refreshEmployee();
  }, [username, navigate]);

  // Redirect to first available section based on permissions
  useEffect(() => {
    if (location.pathname !== `/employees/${username}/dashboard`) {
      console.log("🔍 Redirecting to first available section based on permissions...");
    }
    
    // Define section mapping based on permissions
    const sectionMap = [
      { permission: 'inventory', path: 'inventory' },
      { permission: 'categories', path: 'categories' },
      { permission: 'products', path: 'products' },
      { permission: 'banner', path: 'banner' },
      { permission: 'blog', path: 'blog' },
      { permission: 'manageBulkOrder', path: 'bulkorder' },
      { permission: 'manageOrder', path: 'order' },
      { permission: 'logistics', path: 'logistics' },
      { permission: 'setMoney', path: 'moneyset' },
      { permission: 'chargesPlan', path: 'charges' },
      { permission: 'corporateSettings', path: 'corporate-settings' },
      { permission: 'bankDetails', path: 'bankdetails' },
      { permission: 'employeeManagement', path: 'employees' },
      { permission: 'userAnalysis', path: 'users' },
      { permission: 'invoice', path: 'invoice' },
      { permission: 'sales', path: 'sales' },
    ];
    
    // Find first section employee has access to
    if (refreshing) return;
    const isDashboard = location.pathname === `/employees/${username}/dashboard`;

    const firstAllowedSection = sectionMap.find(s => Boolean(permissions[s.permission]));
    
    if (firstAllowedSection) {
      console.log("✅ Redirecting to first allowed section:", firstAllowedSection.path);
      navigate(`/employees/${firstAllowedSection.path}`, { replace: true });
    } else {
      console.log("❌ No permissions found, showing error");
    }
  }, [username, permissions, navigate, refreshing]);

  if (!refreshing && location.pathname === `/employees/${username}/dashboard`) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-[#111] rounded-lg p-8 border border-[#E5C870]">
          <div className="text-center">
            {!(Object.keys(permissions).length === 0 && !refreshing) && (
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#E5C870] mx-auto mb-6"></div>
            )}
            
            <h1 className="text-2xl font-bold text-[#E5C870] mb-4">
              {Object.keys(permissions).length === 0 && !refreshing
                ? "No Permissions Assigned"
                : "Redirecting to Your Dashboard..."}
            </h1>
            <p className="text-gray-300 mb-6">
              {Object.keys(permissions).length === 0 && !refreshing
                ? "Your role currently has no permissions. Please contact your administrator."
                : `Welcome, ${employeeName}! We're setting up your workspace.`}
            </p>
            
            <div className="bg-[#0A0A0A] rounded-lg p-4 mb-6 text-left">
              <h2 className="text-lg font-semibold mb-3 text-[#E5C870]">Your Information</h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-400">Employee ID:</span> <span className="font-medium">{employeeAuth.employee?.employeeid || 'N/A'}</span></p>
                <p><span className="text-gray-400">Email:</span> <span className="font-medium">{employeeAuth.email || employeeAuth.employee?.email || 'N/A'}</span></p>
                <p><span className="text-gray-400">Name:</span> <span className="font-medium">{employeeAuth.employee?.name || 'N/A'}</span></p>
                <p><span className="text-gray-400">Role:</span> <span className="font-medium">{employeeAuth.employee?.role || 'N/A'}</span></p>
              </div>
            </div>
            
            {Object.keys(permissions).length === 0 && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 text-red-400">⚠️ No Permissions Assigned</h3>
                <p className="text-sm text-gray-300">
                  You don't have any permissions assigned yet. Please contact your administrator 
                  to assign you a role with appropriate permissions.
                </p>
                <button
                  onClick={() => {
                    localStorage.removeItem("employeeAuth");
                    navigate("/employee-login");
                  }}
                  className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSection;