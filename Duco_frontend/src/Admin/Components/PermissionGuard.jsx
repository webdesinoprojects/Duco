import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Permission Guard Component
 * Checks if employee has required permission before rendering children
 */
const PermissionGuard = ({ children, requiredPermission }) => {
  // Get employee auth from localStorage
  const employeeAuth = JSON.parse(localStorage.getItem("employeeAuth") || "{}");
  const permissions = employeeAuth.employee?.permissions || {};
  const employeeName = employeeAuth.employee?.name || "Employee";

  // If no permission required, allow access
  if (!requiredPermission) {
    return children;
  }

  // Check if employee has the required permission
  const hasPermission = permissions[requiredPermission] === true;

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111] rounded-lg p-8 text-center border border-red-500/30">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-4 text-red-400">Access Denied</h2>
          <p className="text-gray-300 mb-6">
            Sorry {employeeName}, you don't have permission to access this section.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Required permission: <span className="text-[#E5C870]">{requiredPermission}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-[#E5C870] text-black rounded-lg hover:bg-[#D4B752] transition font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default PermissionGuard;
