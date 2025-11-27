// Generic component for employee sections - redirects to first available section
import React, { useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

const EmployeeSection = () => {
  const { section } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  console.log("🎯 EmployeeSection - section:", section, "location:", location.pathname);
  
  // Get employee info from localStorage
  const employeeAuth = JSON.parse(localStorage.getItem("employeeAuth") || "{}");
  const employeeName = employeeAuth.employee?.name || employeeAuth.employee?.employeeid || "Employee";
  const permissions = employeeAuth.employee?.permissions || {};
  
  console.log("🎯 Employee auth data:", employeeAuth);
  console.log("🎯 Employee object:", employeeAuth.employee);
  console.log("🎯 Employee permissions:", permissions);
  console.log("🎯 Permissions keys:", Object.keys(permissions));
  console.log("🎯 Has permissions?", Object.keys(permissions).length > 0);

  // Redirect to first available section based on permissions
  useEffect(() => {
    console.log("🔍 Redirecting to first available section based on permissions...");
    
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
    const firstAllowedSection = sectionMap.find(s => permissions[s.permission] === true);
    
    if (firstAllowedSection) {
      console.log("✅ Redirecting to first allowed section:", firstAllowedSection.path);
      navigate(`/employees/${firstAllowedSection.path}`, { replace: true });
    } else {
      console.log("❌ No permissions found, showing error");
    }
  }, [section, permissions, navigate]);
  
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-[#111] rounded-lg p-8 border border-[#E5C870]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#E5C870] mx-auto mb-6"></div>
            
            <h1 className="text-2xl font-bold text-[#E5C870] mb-4">
              Redirecting to Your Dashboard...
            </h1>
            <p className="text-gray-300 mb-6">
              Welcome, {employeeName}! We're setting up your workspace.
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