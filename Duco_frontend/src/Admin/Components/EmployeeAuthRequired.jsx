import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

const EmployeeAuthRequired = () => {
  const { section } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login with:', { email: email.trim(), API_BASE_URL });
      
      const response = await axios.post(`${API_BASE_URL}/api/employeesacc/login`, {
        email: email.trim(),
        password: password.trim(),
      });

      console.log('🔐 Employee login response:', response.data);
      console.log('🔐 Response status:', response.status);
      console.log('🔐 Response ok?', response.data.ok);

      if (response.data.ok) {
        console.log('✅ Login successful! Employee data:', response.data.employee);
        console.log('✅ Employee permissions:', response.data.employee?.permissions);
        
        // Store employee auth
        const employeeAuthData = {
          email: email,
          employeeid: response.data.employee.employeeid,
          employee: response.data.employee,
          authType: 'EMPLOYEE',
          loginTime: new Date().toISOString()
        };
        
        localStorage.setItem("employeeAuth", JSON.stringify(employeeAuthData));
        console.log('✅ Stored employeeAuth:', employeeAuthData);
        
        console.log('✅ Employee authenticated, redirecting to section:', section);
        
        // Redirect to the section they were trying to access
        navigate(`/employees/${section}`, { replace: true });
      } else {
        console.log('❌ Login failed:', response.data.error);
        setError(response.data.error || 'Login failed');
      }
    } catch (err) {
      console.error('❌ Employee login error:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-[#111] rounded-lg p-8 border border-[#E5C870]">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-[#E5C870] mb-2">
              Employee Access Required
            </h1>
            <p className="text-gray-300 text-sm">
              Please login with your employee credentials to access this section.
            </p>
            {section && (
              <p className="text-xs text-gray-400 mt-2">
                Accessing: <span className="text-[#E5C870]">{section}</span>
              </p>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5C870] text-white"
                placeholder="Enter your employee email"
                autoComplete="email"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Use the email you set when creating this employee</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5C870] text-white"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Use the password you set when creating this employee</p>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#E5C870] text-black rounded-lg hover:bg-[#D4B752] transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login as Employee'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs text-gray-400 text-center">
              Don't have employee credentials? Contact your administrator.
            </p>
            <button
              onClick={() => navigate('/admin/login')}
              className="w-full mt-2 py-2 text-sm text-[#E5C870] hover:text-white transition"
            >
              Admin Login Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAuthRequired;
