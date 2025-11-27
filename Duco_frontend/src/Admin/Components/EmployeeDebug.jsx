import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

const EmployeeDebug = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/employeesacc/login`, {
        email: email.trim(),
        password: password.trim(),
      });
      
      setResult({
        success: true,
        data: response.data,
        status: response.status
      });
    } catch (err) {
      setResult({
        success: false,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#E5C870] mb-6">🔍 Employee Login Debug</h1>
        
        <div className="bg-[#111] rounded-lg p-6 border border-[#E5C870] mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Employee Login</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                placeholder="employee@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                placeholder="password"
              />
            </div>
            
            <button
              onClick={testLogin}
              disabled={loading || !email || !password}
              className="px-6 py-2 bg-[#E5C870] text-black rounded-lg hover:bg-[#D4B752] transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Login'}
            </button>
          </div>
        </div>
        
        {result && (
          <div className="bg-[#111] rounded-lg p-6 border border-[#E5C870]">
            <h2 className="text-xl font-semibold mb-4">
              {result.success ? '✅ Login Response' : '❌ Login Error'}
            </h2>
            
            <div className="bg-[#0A0A0A] rounded-lg p-4 overflow-auto">
              <pre className="text-sm text-gray-300">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
            
            {result.success && result.data.ok && (
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-semibold text-[#E5C870]">Employee Details:</h3>
                <div className="bg-[#0A0A0A] rounded-lg p-4">
                  <p><strong>Email:</strong> {result.data.employee?.email}</p>
                  <p><strong>Employee ID:</strong> {result.data.employee?.employeeid}</p>
                  <p><strong>Name:</strong> {result.data.employee?.name}</p>
                  <p><strong>Role:</strong> {result.data.employee?.role}</p>
                  <p><strong>URL:</strong> {result.data.url}</p>
                  
                  <h4 className="text-md font-semibold text-[#E5C870] mt-4 mb-2">Permissions:</h4>
                  {result.data.employee?.permissions ? (
                    <div className="space-y-1">
                      {Object.entries(result.data.employee.permissions).map(([key, value]) => (
                        <p key={key} className={value ? 'text-green-400' : 'text-gray-500'}>
                          {value ? '✅' : '❌'} {key}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-red-400">⚠️ NO PERMISSIONS FOUND!</p>
                  )}
                </div>
              </div>
            )}
            
            {result.success && !result.data.ok && (
              <div className="mt-4 bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400">
                  <strong>Error:</strong> {result.data.error}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDebug;
