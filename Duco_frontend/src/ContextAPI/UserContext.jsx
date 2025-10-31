// src/Context/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create Context
export const UserContext = createContext();

// Provider Component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Initial load: check localStorage
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData)); // store to localStorage
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user'); // clear from localStorage
  };

  // Optional: Sync user if localStorage changes from another tab
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('user');
      setUser(stored ? JSON.parse(stored) : null);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for using user context
export const useUser = () => useContext(UserContext);
