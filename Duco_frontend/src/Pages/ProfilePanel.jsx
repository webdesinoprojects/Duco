import React, { useEffect, useState } from 'react';
import AddressManager from '../Components/AddressManager.jsx';
import { useNavigate } from 'react-router-dom';

const ProfilePanel = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.reload(); // or use navigate('/login')
  };

  if (!user) {
    return (
      <div className="text-center text-white mt-10">
        No User Found. Please{' '}
      </div>
    );
  }

  return (
    <div className="relative max-w-md mx-auto mt-10 p-6 rounded-2xl shadow-lg border border-[#E5C870] bg-black text-white font-sans">

      {/* 🔓 Logout Button — Top Right */}
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 text-lg  font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md transition-all z-10"
      >
        Logout
      </button>

      <div className="flex flex-col items-center gap-4">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-[#E5C870] flex items-center justify-center text-black text-3xl font-bold shadow-lg">
          {user.name?.charAt(0) || 'U'}
        </div>

        {/* Name & Phone */}
        <h2 className="text-2xl font-semibold">{user.name}</h2>
        <p className="text-md text-[#E5C870]">📞 {user.number}</p>

        {/* Info */}
        <div className="w-full mt-6 text-sm border-t border-gray-700 pt-4">
          <div className="flex justify-between py-1">
            <span className="text-gray-400">User ID</span>
            <span className="text-white truncate">{user._id}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-400">Joined</span>
            <span className="text-white">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Address Manager */}
      <AddressManager user={user} setUser={setUser} />
    </div>
  );
};

export default ProfilePanel;

