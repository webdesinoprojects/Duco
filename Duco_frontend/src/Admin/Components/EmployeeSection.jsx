// Generic component for employee sections
import React from 'react';
import { useParams, useLocation } from 'react-router-dom';

const EmployeeSection = () => {
  const { section } = useParams();
  const location = useLocation();
  
  // Get employee info from localStorage
  const employeeAuth = JSON.parse(localStorage.getItem("employeeAuth") || "{}");
  const employeeName = employeeAuth.employee?.name || employeeAuth.employeeid || "Employee";
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-yellow-400 mb-4">
              {section ? section.charAt(0).toUpperCase() + section.slice(1) : 'Employee'} Section
            </h1>
            <p className="text-gray-300 mb-6">
              Welcome, {employeeName}! This is your assigned section.
            </p>
            
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold mb-2">Section Information</h2>
              <div className="text-left space-y-2">
                <p><strong>Section:</strong> {section || 'Default'}</p>
                <p><strong>Employee ID:</strong> {employeeAuth.employeeid}</p>
                <p><strong>Name:</strong> {employeeAuth.employee?.name || 'N/A'}</p>
                <p><strong>Role:</strong> {employeeAuth.employee?.role || 'N/A'}</p>
                <p><strong>Assigned URL:</strong> {employeeAuth.url || 'N/A'}</p>
              </div>
            </div>
            
            <div className="bg-blue-900 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">🚧 Section Under Development</h3>
              <p className="text-sm text-gray-300">
                This section is currently being developed. Please contact your administrator 
                for more information about the features that will be available here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSection;