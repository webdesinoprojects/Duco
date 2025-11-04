// Component that handles direct section access with authentication
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta?.env?.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api` 
  : (import.meta.env.DEV ? "https://duco-67o5.onrender.com/api" : "https://duco-67o5.onrender.com/api");

const SectionAuthGuard = ({ children }) => {
  const { section } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, [section]);

  const checkAuthentication = () => {
    const employeeAuth = localStorage.getItem("employeeAuth");
    
    if (!employeeAuth) {
      // No authentication, show login form
      setShowLoginForm(true);
      setLoading(false);
      return;
    }

    try {
      const authData = JSON.parse(employeeAuth);
      
      // Check if the employee is authorized for this section
      if (authData.url) {
        const urlParts = authData.url.split('/');
        const assignedSection = urlParts[urlParts.length - 1];
        
        if (assignedSection.toLowerCase() === section.toLowerCase()) {
          setIsAuthorized(true);
          setLoading(false);
        } else {
          setError(`Access denied. You are assigned to section: ${assignedSection}`);
          setLoading(false);
        }
      } else {
        setError('Invalid employee session. Please login again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error parsing employee auth:', err);
      setError('Invalid session data. Please login again.');
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setError('');
    
    try {
      const loginUrl = `${API_BASE}/employeesacc/login`;
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();
      console.log('📡 Section login response:', data);

      if (data.ok) {
        // Save session
        localStorage.setItem("employeeAuth", JSON.stringify({
          email: loginForm.email,
          employeeid: data.employee?.employeeid,
          url: data.url,
          employee: data.employee
        }));

        // Verify the section matches the employee's assigned section
        const urlParts = data.url.split('/');
        const assignedSection = urlParts[urlParts.length - 1];
        
        if (assignedSection.toLowerCase() === section.toLowerCase()) {
          console.log('✅ Section verified, access granted');
          setIsAuthorized(true);
          setShowLoginForm(false);
        } else {
          setError(`Access denied. You are assigned to section: ${assignedSection}, not ${section}`);
        }
      } else {
        setError('Invalid credentials or access denied');
      }
    } catch (err) {
      console.error('❌ Section login error:', err);
      setError('Login failed: ' + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("employeeAuth");
    setIsAuthorized(false);
    setShowLoginForm(true);
    setLoginForm({ email: '', password: '' });
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Checking Access...</h2>
          <p className="text-gray-400">Verifying your section permissions</p>
        </div>
      </div>
    );
  }

  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md shadow-2xl border border-gray-700">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-yellow-400 mb-2">
              Access {section ? section.charAt(0).toUpperCase() + section.slice(1) : 'Employee'} Section
            </h1>
            <p className="text-gray-400 text-sm">
              Please authenticate to access this section
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
                placeholder="Enter your email address"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
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
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loginLoading}
            >
              {loginLoading ? "Authenticating..." : "Access Section"}
            </button>
          </form>
          
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500">
              Contact your administrator if you need help accessing your section
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !showLoginForm) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => {
                setError('');
                setShowLoginForm(true);
              }}
              className="block w-full px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors"
            >
              Login with Different Account
            </button>
            <button
              onClick={() => navigate('/employee-login')}
              className="block w-full px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Main Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If authorized, render the children (the actual section content)
  if (isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Add logout button in top right */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
        {children}
      </div>
    );
  }

  return null;
};

export default SectionAuthGuard;