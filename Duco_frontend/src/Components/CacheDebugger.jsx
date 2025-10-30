import React, { useState, useEffect } from 'react';
import { clearOrderCache } from '../utils/clearOrderCache';

const CacheDebugger = ({ show = false }) => {
  const [cacheData, setCacheData] = useState({});
  const [isVisible, setIsVisible] = useState(show);

  const updateCacheData = () => {
    const orderKeys = ['cart', 'lastOrderId', 'lastOrderMeta', 'lastCartCharges', 'user'];
    const sessionKeys = ['currentDesignSession'];
    
    const data = {
      localStorage: {},
      sessionStorage: {}
    };
    
    orderKeys.forEach(key => {
      const value = localStorage.getItem(key);
      data.localStorage[key] = value ? JSON.parse(value) : null;
    });
    
    sessionKeys.forEach(key => {
      data.sessionStorage[key] = sessionStorage.getItem(key);
    });
    
    setCacheData(data);
  };

  useEffect(() => {
    updateCacheData();
    const interval = setInterval(updateCacheData, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Debug Cache
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '500px',
      backgroundColor: 'white',
      border: '2px solid #ccc',
      borderRadius: '10px',
      padding: '15px',
      zIndex: 9999,
      fontSize: '12px',
      overflow: 'auto',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Cache Debugger</h3>
        <button onClick={() => setIsVisible(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <button onClick={clearOrderCache} style={{ marginRight: '10px', padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
          Clear Cache
        </button>
        <button onClick={updateCacheData} style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      <div>
        <h4>localStorage:</h4>
        {Object.entries(cacheData.localStorage || {}).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '5px', padding: '5px', backgroundColor: '#f8f9fa', borderRadius: '3px' }}>
            <strong>{key}:</strong> {value ? (typeof value === 'object' ? JSON.stringify(value).substring(0, 100) + '...' : String(value)) : 'null'}
          </div>
        ))}
        
        <h4>sessionStorage:</h4>
        {Object.entries(cacheData.sessionStorage || {}).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '5px', padding: '5px', backgroundColor: '#f8f9fa', borderRadius: '3px' }}>
            <strong>{key}:</strong> {value || 'null'}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CacheDebugger;